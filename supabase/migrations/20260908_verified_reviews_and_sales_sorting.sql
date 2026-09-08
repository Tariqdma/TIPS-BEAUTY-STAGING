BEGIN;

-- Verified-purchase reviews. A review can only be written through the RPC below
-- after the caller has a delivered order containing the product.
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS image_paths text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS is_verified_purchase boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published'
    CHECK (status IN ('published', 'hidden'));

CREATE UNIQUE INDEX IF NOT EXISTS reviews_one_per_customer_order_product_idx
  ON public.reviews(order_id, user_id, product_id)
  WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS reviews_public_product_created_idx
  ON public.reviews(product_id, created_at DESC)
  WHERE status = 'published' AND is_verified_purchase;

-- Review photos are public only after a verified review is submitted. The random,
-- owner-scoped paths are not discoverable through any listing endpoint.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('review-images', 'review-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Customers upload own review photos" ON storage.objects;
DROP POLICY IF EXISTS "Customers delete own review photos" ON storage.objects;
CREATE POLICY "Customers upload own review photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'review-images'
    AND owner_id = (SELECT auth.uid()::text)
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );
CREATE POLICY "Customers delete own review photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'review-images'
    AND owner_id = (SELECT auth.uid()::text)
  );

-- Direct client writes to reviews would bypass purchase validation, so all writes
-- are restricted to the secure RPC. Public reading is exposed through a limited RPC.
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can insert own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins can delete reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins manage reviews" ON public.reviews;
CREATE POLICY "Admins manage reviews"
  ON public.reviews FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
REVOKE ALL ON TABLE public.reviews FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.refresh_product_review_summary(p_product_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.products p
  SET reviews_count = COALESCE(s.review_count, 0),
      average_rating = COALESCE(s.average_rating, 0)
  FROM (
    SELECT product_id, COUNT(*)::integer AS review_count, ROUND(AVG(rating)::numeric, 2) AS average_rating
    FROM public.reviews
    WHERE product_id = p_product_id
      AND is_verified_purchase
      AND status = 'published'
    GROUP BY product_id
  ) s
  WHERE p.id = p_product_id;
$$;

CREATE OR REPLACE FUNCTION public.update_product_review_summary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_id uuid := COALESCE(NEW.product_id, OLD.product_id);
BEGIN
  PERFORM public.refresh_product_review_summary(v_product_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS reviews_refresh_product_summary ON public.reviews;
CREATE TRIGGER reviews_refresh_product_summary
AFTER INSERT OR UPDATE OF rating, status, is_verified_purchase OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.update_product_review_summary();

CREATE OR REPLACE FUNCTION public.get_public_product_reviews(p_product_id uuid)
RETURNS TABLE (
  id uuid,
  rating integer,
  comment text,
  image_paths text[],
  reviewer_label text,
  created_at timestamptz,
  verified_purchase boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id,
         r.rating,
         COALESCE(r.comment, ''),
         COALESCE(r.image_paths, '{}'::text[]),
         COALESCE(NULLIF(r.user_name, ''), 'عميلة تيبس'),
         r.created_at,
         r.is_verified_purchase
  FROM public.reviews r
  WHERE r.product_id = p_product_id
    AND r.status = 'published'
    AND r.is_verified_purchase
  ORDER BY r.created_at DESC
  LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION public.get_reviewable_order_items()
RETURNS TABLE (
  order_id uuid,
  order_number text,
  product_id uuid,
  product_name_ar text,
  product_image text,
  has_review boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id,
         COALESCE(o.order_number, 'طلب تيبس'),
         p.id,
         p.name_ar,
         p.image,
         EXISTS (
           SELECT 1
           FROM public.reviews r
           WHERE r.order_id = o.id
             AND r.product_id = p.id
             AND r.user_id = auth.uid()
         ) AS has_review
  FROM public.orders o
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(o.items, '[]'::jsonb)) item
  JOIN public.products p ON p.id = (item->>'id')::uuid
  WHERE o.customer_id = auth.uid()
    AND o.status = 'delivered'
  ORDER BY o.created_at DESC, p.name_ar ASC;
$$;

CREATE OR REPLACE FUNCTION public.submit_purchased_product_review(
  p_order_id uuid,
  p_product_id uuid,
  p_rating integer,
  p_comment text DEFAULT NULL,
  p_image_paths text[] DEFAULT '{}'::text[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_customer_id uuid := auth.uid();
  v_review_id uuid;
  v_path text;
BEGIN
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.';
  END IF;
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5.';
  END IF;
  IF COALESCE(length(trim(p_comment)), 0) > 1000 THEN
    RAISE EXCEPTION 'Review text is too long.';
  END IF;
  IF COALESCE(cardinality(p_image_paths), 0) > 3 THEN
    RAISE EXCEPTION 'A maximum of three review photos is allowed.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.orders o
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(o.items, '[]'::jsonb)) item
    WHERE o.id = p_order_id
      AND o.customer_id = v_customer_id
      AND o.status = 'delivered'
      AND (item->>'id')::uuid = p_product_id
  ) THEN
    RAISE EXCEPTION 'Only a delivered purchase of this product can be reviewed.';
  END IF;

  FOREACH v_path IN ARRAY COALESCE(p_image_paths, '{}'::text[])
  LOOP
    IF v_path !~ ('^' || v_customer_id::text || '/' || p_product_id::text || '/[^/]+$')
       OR NOT EXISTS (
         SELECT 1 FROM storage.objects so
         WHERE so.bucket_id = 'review-images'
           AND so.name = v_path
           AND so.owner_id = v_customer_id::text
       ) THEN
      RAISE EXCEPTION 'Invalid review image.';
    END IF;
  END LOOP;

  INSERT INTO public.reviews (
    order_id, product_id, user_id, user_name, rating, comment, image_paths, is_verified_purchase, status
  ) VALUES (
    p_order_id, p_product_id, v_customer_id, 'عميلة موثقة', p_rating, NULLIF(trim(p_comment), ''),
    COALESCE(p_image_paths, '{}'::text[]), true, 'published'
  )
  RETURNING id INTO v_review_id;

  RETURN v_review_id;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'This product has already been reviewed for this order.';
END;
$$;

-- Aggregated sales figures are intentionally product-level only; no customer,
-- order, or revenue data is returned to shoppers.
CREATE OR REPLACE FUNCTION public.get_public_product_sales_metrics()
RETURNS TABLE (product_id uuid, sales_count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id,
         COALESCE(SUM(
           CASE
             WHEN COALESCE(item->>'quantity', '') ~ '^[0-9]+$' THEN (item->>'quantity')::integer
             ELSE 0
           END
         ) FILTER (WHERE o.status IN ('confirmed', 'preparing', 'shipped', 'delivered')), 0)::integer
  FROM public.products p
  LEFT JOIN public.orders o ON o.status IN ('confirmed', 'preparing', 'shipped', 'delivered')
  LEFT JOIN LATERAL jsonb_array_elements(COALESCE(o.items, '[]'::jsonb)) item ON (item->>'id')::uuid = p.id
  GROUP BY p.id;
$$;

REVOKE ALL ON FUNCTION public.refresh_product_review_summary(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_product_review_summary() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_product_reviews(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_reviewable_order_items() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_purchased_product_review(uuid, uuid, integer, text, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_product_sales_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_product_reviews(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_reviewable_order_items() TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_purchased_product_review(uuid, uuid, integer, text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_product_sales_metrics() TO anon, authenticated;

COMMIT;
