BEGIN;

-- Add a distinct delivery event for the review invitation while retaining idempotency
-- per order, event and customer device.
ALTER TABLE public.push_notification_deliveries
  DROP CONSTRAINT IF EXISTS push_notification_deliveries_event_type_check;
ALTER TABLE public.push_notification_deliveries
  ADD CONSTRAINT push_notification_deliveries_event_type_check
  CHECK (event_type IN ('shipped', 'delivered', 'review_request'));

-- The notification center already stores the delivery event. This separate type is
-- deliberately idempotent so a later status correction cannot spam the customer.
CREATE OR REPLACE FUNCTION public.order_create_review_request_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status OR NEW.status <> 'delivered' THEN
    RETURN NEW;
  END IF;

  IF jsonb_array_length(COALESCE(NEW.items, '[]'::jsonb)) = 0 THEN
    RETURN NEW;
  END IF;

  PERFORM public.create_customer_notification(
    NEW.customer_id,
    'review_request',
    'كيف كانت تجربتك؟',
    'تم توصيل طلبك رقم ' || COALESCE(NEW.order_number, '') || '. شاركينا رأيك في المنتجات التي استلمتها.',
    NEW.id,
    NULL,
    jsonb_build_object('order_number', NEW.order_number, 'status', NEW.status, 'url', '/orders')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_create_review_request_notification ON public.orders;
CREATE TRIGGER orders_create_review_request_notification
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.order_create_review_request_notification();

-- One secure action supports both moderation choices: hide the full review (and
-- remove photos permanently) or remove photos while retaining the review text.
CREATE OR REPLACE FUNCTION public.moderate_product_review(
  p_review_id uuid,
  p_status text,
  p_remove_images boolean DEFAULT false
)
RETURNS TABLE (
  review_id uuid,
  status text,
  images_removed integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_paths text[];
  v_removed integer := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Administrator access required.';
  END IF;
  IF p_status NOT IN ('published', 'hidden') THEN
    RAISE EXCEPTION 'Unsupported review status.';
  END IF;

  SELECT r.image_paths INTO v_paths
  FROM public.reviews r
  WHERE r.id = p_review_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Review not found.';
  END IF;

  -- A hidden review can never leave customer imagery publicly accessible.
  IF p_remove_images OR p_status = 'hidden' THEN
    DELETE FROM storage.objects
    WHERE bucket_id = 'review-images'
      AND name = ANY(COALESCE(v_paths, '{}'::text[]));
    GET DIAGNOSTICS v_removed = ROW_COUNT;
  END IF;

  UPDATE public.reviews
  SET status = p_status,
      image_paths = CASE WHEN p_remove_images OR p_status = 'hidden' THEN '{}'::text[] ELSE image_paths END
  WHERE id = p_review_id;

  RETURN QUERY SELECT p_review_id, p_status, v_removed;
END;
$$;

-- Review analytics only returns product-level aggregates to an authenticated admin.
CREATE OR REPLACE FUNCTION public.get_admin_product_review_stats()
RETURNS TABLE (
  product_id uuid,
  product_name_ar text,
  brand text,
  product_image text,
  published_count integer,
  hidden_count integer,
  average_published_rating numeric,
  photo_count integer,
  sales_count integer,
  latest_review_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Administrator access required.';
  END IF;

  RETURN QUERY
  SELECT p.id,
         p.name_ar,
         p.brand,
         p.image,
         COUNT(r.id) FILTER (WHERE r.status = 'published')::integer,
         COUNT(r.id) FILTER (WHERE r.status = 'hidden')::integer,
         COALESCE(ROUND(AVG(r.rating) FILTER (WHERE r.status = 'published' AND r.is_verified_purchase), 2), 0),
         COALESCE(SUM(cardinality(COALESCE(r.image_paths, '{}'::text[]))), 0)::integer,
         COALESCE(sm.sales_count, 0)::integer,
         MAX(r.created_at)
  FROM public.products p
  LEFT JOIN public.reviews r ON r.product_id = p.id
  LEFT JOIN public.get_public_product_sales_metrics() sm ON sm.product_id = p.id
  GROUP BY p.id, p.name_ar, p.brand, p.image, sm.sales_count
  ORDER BY MAX(r.created_at) DESC NULLS LAST, p.name_ar ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.order_create_review_request_notification() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.moderate_product_review(uuid, text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_admin_product_review_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate_product_review(uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_product_review_stats() TO authenticated;

COMMIT;
