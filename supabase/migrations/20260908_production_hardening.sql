BEGIN;

-- This migration removes direct exposure of sensitive operations and moves
-- customer checkout, payment review inputs, delivery assignment, and location
-- capture behind audited server-side functions.

CREATE TABLE IF NOT EXISTS public.checkout_idempotency (
  customer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL CHECK (char_length(idempotency_key) BETWEEN 16 AND 128),
  order_id uuid NULL REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (customer_id, idempotency_key)
);
ALTER TABLE public.checkout_idempotency ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.checkout_idempotency FROM PUBLIC, anon, authenticated;

-- The public storefront receives only the attributes that are safe to disclose.
CREATE OR REPLACE FUNCTION public.get_public_products()
RETURNS TABLE(
  id uuid, name_ar text, name_en text, price numeric, discount_percentage numeric,
  category text, brand text, image text, images text[], description text,
  benefits text[], ingredients text[], usage text, origin text, expiry text,
  stock integer, is_imported boolean, skin_type text[], reviews_count integer,
  average_rating numeric, created_at timestamptz, variants jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name_ar, p.name_en, p.price, p.discount_percentage,
         p.category, p.brand, p.image, p.images, p.description,
         p.benefits, p.ingredients, p.usage, p.origin, p.expiry,
         GREATEST(COALESCE(p.stock, 0), 0), p.is_imported, p.skin_type,
         p.reviews_count, p.average_rating, p.created_at, p.variants
  FROM public.products p
  ORDER BY p.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_public_product(p_product_id uuid)
RETURNS TABLE(
  id uuid, name_ar text, name_en text, price numeric, discount_percentage numeric,
  category text, brand text, image text, images text[], description text,
  benefits text[], ingredients text[], usage text, origin text, expiry text,
  stock integer, is_imported boolean, skin_type text[], reviews_count integer,
  average_rating numeric, created_at timestamptz, variants jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name_ar, p.name_en, p.price, p.discount_percentage,
         p.category, p.brand, p.image, p.images, p.description,
         p.benefits, p.ingredients, p.usage, p.origin, p.expiry,
         GREATEST(COALESCE(p.stock, 0), 0), p.is_imported, p.skin_type,
         p.reviews_count, p.average_rating, p.created_at, p.variants
  FROM public.products p
  WHERE p.id = p_product_id;
$$;

-- Reserve an idempotency key before delegating to the price-and-stock checkout
-- function. Duplicate product lines are combined before inventory is checked.
CREATE OR REPLACE FUNCTION public.checkout_order_safe(
  p_customer_name text,
  p_phone text,
  p_shipping_address text,
  p_city text,
  p_state text,
  p_payment_method text,
  p_items jsonb,
  p_coupon_code text DEFAULT NULL,
  p_points_to_redeem integer DEFAULT 0,
  p_idempotency_key text DEFAULT NULL
)
RETURNS TABLE(order_id uuid, order_number text, total numeric, shipping_fee numeric, discount_amount numeric, points_discount numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_items jsonb;
  v_reservation public.checkout_idempotency%ROWTYPE;
  v_result record;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NULLIF(trim(COALESCE(p_idempotency_key, '')), '') IS NULL THEN RAISE EXCEPTION 'An idempotency key is required'; END IF;

  SELECT COALESCE(
    jsonb_agg(jsonb_build_object('id', item.product_id, 'quantity', item.total_quantity) ORDER BY item.product_id),
    '[]'::jsonb
  ) INTO v_items
  FROM (
    SELECT (entry.value->>'id')::uuid AS product_id,
           SUM((entry.value->>'quantity')::integer)::integer AS total_quantity
    FROM jsonb_array_elements(p_items) AS entry(value)
    GROUP BY (entry.value->>'id')::uuid
  ) item;

  IF jsonb_array_length(v_items) = 0 THEN RAISE EXCEPTION 'Cart is empty'; END IF;

  INSERT INTO public.checkout_idempotency(customer_id, idempotency_key)
  VALUES (v_user_id, trim(p_idempotency_key))
  ON CONFLICT DO NOTHING
  RETURNING * INTO v_reservation;

  IF NOT FOUND THEN
    SELECT * INTO v_reservation
    FROM public.checkout_idempotency
    WHERE customer_id = v_user_id AND idempotency_key = trim(p_idempotency_key);

    IF v_reservation.order_id IS NULL THEN
      RAISE EXCEPTION 'Checkout is already being processed';
    END IF;

    SELECT o.id AS order_id, o.order_number, o.total, o.shipping_fee,
           o.discount_amount, o.points_discount
    INTO v_result
    FROM public.orders o
    WHERE o.id = v_reservation.order_id;

    RETURN QUERY SELECT v_result.order_id, v_result.order_number, v_result.total,
                        v_result.shipping_fee, v_result.discount_amount, v_result.points_discount;
    RETURN;
  END IF;

  SELECT * INTO v_result
  FROM public.checkout_order(
    p_customer_name, p_phone, p_shipping_address, p_city, p_state,
    p_payment_method, v_items, p_coupon_code, p_points_to_redeem
  );

  UPDATE public.checkout_idempotency
  SET order_id = v_result.order_id
  WHERE customer_id = v_user_id AND idempotency_key = trim(p_idempotency_key);

  RETURN QUERY SELECT v_result.order_id, v_result.order_number, v_result.total,
                      v_result.shipping_fee, v_result.discount_amount, v_result.points_discount;
END;
$$;

CREATE OR REPLACE FUNCTION public.checkout_order_with_growth(
  p_customer_name text, p_phone text, p_shipping_address text, p_city text, p_state text,
  p_payment_method text, p_items jsonb, p_coupon_code text DEFAULT NULL, p_points_to_redeem integer DEFAULT 0,
  p_referral_code text DEFAULT NULL, p_affiliate_code text DEFAULT NULL, p_idempotency_key text DEFAULT NULL
)
RETURNS TABLE(order_id uuid, order_number text, total numeric, shipping_fee numeric, discount_amount numeric, points_discount numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE v_order record; v_user uuid := auth.uid(); v_referrer uuid; v_affiliate uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NULLIF(trim(COALESCE(p_referral_code, '')), '') IS NOT NULL THEN
    SELECT id INTO v_referrer FROM public.profiles WHERE referral_code = upper(trim(p_referral_code)) AND id <> v_user;
    IF v_referrer IS NULL THEN RAISE EXCEPTION 'Invalid referral code'; END IF;
  END IF;
  IF NULLIF(trim(COALESCE(p_affiliate_code, '')), '') IS NOT NULL THEN
    SELECT id INTO v_affiliate FROM public.affiliate_profiles WHERE code = upper(trim(p_affiliate_code)) AND status = 'active' AND customer_id <> v_user;
    IF v_affiliate IS NULL THEN RAISE EXCEPTION 'Invalid affiliate code'; END IF;
  END IF;

  SELECT * INTO v_order FROM public.checkout_order_safe(
    p_customer_name, p_phone, p_shipping_address, p_city, p_state, p_payment_method,
    p_items, p_coupon_code, p_points_to_redeem, p_idempotency_key
  );

  -- Referral metadata must not be changed on a retry with the same key.
  UPDATE public.orders
  SET referral_code = COALESCE(referral_code, NULLIF(upper(trim(COALESCE(p_referral_code, ''))), '')),
      referral_referrer_id = COALESCE(referral_referrer_id, v_referrer),
      affiliate_code = COALESCE(affiliate_code, NULLIF(upper(trim(COALESCE(p_affiliate_code, ''))), '')),
      affiliate_id = COALESCE(affiliate_id, v_affiliate)
  WHERE id = v_order.order_id;

  IF v_referrer IS NOT NULL THEN
    UPDATE public.profiles SET referred_by = v_referrer WHERE id = v_user AND referred_by IS NULL;
  END IF;

  RETURN QUERY SELECT v_order.order_id, v_order.order_number, v_order.total,
                      v_order.shipping_fee, v_order.discount_amount, v_order.points_discount;
END;
$$;

-- Payment amount and method are derived from the customer's own order. The client
-- only provides the proof file path and optional transfer reference.
CREATE OR REPLACE FUNCTION public.submit_payment_proof(
  p_order_id uuid,
  p_payment_method text,
  p_amount numeric,
  p_transaction_reference text,
  p_proof_path text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_proof_id uuid;
  v_method text;
  v_total numeric;
  v_payment_status text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NULLIF(trim(COALESCE(p_proof_path, '')), '') IS NULL THEN RAISE EXCEPTION 'A proof file is required'; END IF;
  IF split_part(p_proof_path, '/', 1) <> v_user_id::text THEN RAISE EXCEPTION 'Invalid proof storage path'; END IF;

  SELECT payment_method, total, payment_status INTO v_method, v_total, v_payment_status
  FROM public.orders
  WHERE id = p_order_id AND customer_id = v_user_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_payment_status = 'paid' THEN RAISE EXCEPTION 'Payment is already confirmed'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.payment_methods WHERE code = v_method AND is_active AND requires_proof) THEN
    RAISE EXCEPTION 'This order does not require a payment proof';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'payment-proofs' AND name = p_proof_path) THEN
    RAISE EXCEPTION 'Proof file was not found';
  END IF;

  INSERT INTO public.payment_proofs (order_id, customer_id, payment_method, amount, transaction_reference, proof_path, status, reviewer_id, review_note, reviewed_at, submitted_at)
  VALUES (p_order_id, v_user_id, v_method, v_total, NULLIF(trim(p_transaction_reference), ''), p_proof_path, 'pending', NULL, NULL, NULL, timezone('utc', now()))
  ON CONFLICT (order_id) DO UPDATE SET
    payment_method = EXCLUDED.payment_method,
    amount = EXCLUDED.amount,
    transaction_reference = EXCLUDED.transaction_reference,
    proof_path = EXCLUDED.proof_path,
    status = 'pending', reviewer_id = NULL, review_note = NULL, reviewed_at = NULL, submitted_at = timezone('utc', now())
  WHERE public.payment_proofs.status IN ('pending', 'rejected')
  RETURNING id INTO v_proof_id;

  IF v_proof_id IS NULL THEN RAISE EXCEPTION 'A verified proof cannot be replaced'; END IF;
  UPDATE public.orders SET payment_status = 'proof_submitted', payment_reference = NULLIF(trim(p_transaction_reference), '') WHERE id = p_order_id;
  RETURN v_proof_id;
END;
$$;

-- Prevent the same product quantities from being returned more than once while a
-- return case is active. A rejected or closed case may be submitted again.
CREATE OR REPLACE FUNCTION public.request_order_return(
  p_order_id uuid, p_items jsonb, p_reason text, p_requested_resolution text, p_customer_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid(); v_return_id uuid; v_order_items jsonb; v_item jsonb; v_allowed_quantity integer;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_requested_resolution NOT IN ('refund', 'exchange', 'store_credit') THEN RAISE EXCEPTION 'Unsupported return resolution'; END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) < 5 THEN RAISE EXCEPTION 'Return reason is required'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'At least one item is required'; END IF;

  SELECT items INTO v_order_items FROM public.orders
  WHERE id = p_order_id AND customer_id = v_user_id AND status = 'delivered'
  FOR UPDATE;
  IF v_order_items IS NULL THEN RAISE EXCEPTION 'Only delivered orders can be returned'; END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    IF NULLIF(v_item->>'id', '') IS NULL OR COALESCE((v_item->>'quantity')::integer, 0) < 1 THEN RAISE EXCEPTION 'Invalid return item'; END IF;
    SELECT (purchased_item->>'quantity')::integer INTO v_allowed_quantity
    FROM jsonb_array_elements(v_order_items) purchased_item
    WHERE purchased_item->>'id' = v_item->>'id'
    LIMIT 1;
    IF v_allowed_quantity IS NULL OR (v_item->>'quantity')::integer > v_allowed_quantity THEN RAISE EXCEPTION 'Return items must match the delivered order'; END IF;
    IF EXISTS (
      SELECT 1 FROM public.order_returns r, jsonb_array_elements(r.items) returned_item
      WHERE r.order_id = p_order_id
        AND r.status NOT IN ('rejected', 'closed')
        AND returned_item->>'id' = v_item->>'id'
    ) THEN RAISE EXCEPTION 'An active return already exists for one of these items'; END IF;
  END LOOP;

  INSERT INTO public.order_returns (order_id, customer_id, items, reason, requested_resolution, customer_note)
  VALUES (p_order_id, v_user_id, p_items, trim(p_reason), p_requested_resolution, NULLIF(trim(p_customer_note), ''))
  RETURNING id INTO v_return_id;
  RETURN v_return_id;
END;
$$;

-- Administrators update a status and its audit history atomically. Assignment is
-- blocked once delivery starts, and drivers must be active and warehouse-compatible.
CREATE OR REPLACE FUNCTION public.admin_update_order_operation(
  p_order_id uuid,
  p_expected_status text,
  p_status text DEFAULT NULL,
  p_driver_id uuid DEFAULT NULL,
  p_warehouse_id uuid DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS TABLE(id uuid, status text, driver_id uuid, fulfillment_warehouse_id uuid, updated_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_next_status text;
  v_next_driver uuid;
  v_next_warehouse uuid;
  v_driver_warehouse uuid;
  v_driver_status text;
  v_changed boolean := false;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF p_expected_status IS NOT NULL AND p_expected_status <> v_order.status THEN RAISE EXCEPTION 'This order was updated by another user; reload and try again'; END IF;

  v_next_status := COALESCE(NULLIF(trim(p_status), ''), v_order.status);
  v_next_driver := COALESCE(p_driver_id, v_order.driver_id);
  v_next_warehouse := COALESCE(p_warehouse_id, v_order.fulfillment_warehouse_id);

  IF p_status IS NOT NULL AND p_status <> v_order.status THEN
    IF NOT (
      (v_order.status = 'new' AND v_next_status IN ('confirmed', 'cancelled')) OR
      (v_order.status = 'confirmed' AND v_next_status IN ('preparing', 'cancelled', 'shipped')) OR
      (v_order.status = 'preparing' AND v_next_status IN ('shipped', 'cancelled')) OR
      (v_order.status = 'shipped' AND v_next_status IN ('delivered', 'delivery_failed')) OR
      (v_order.status = 'delivery_failed' AND v_next_status IN ('confirmed', 'cancelled'))
    ) THEN RAISE EXCEPTION 'This status transition is not allowed'; END IF;
  END IF;

  IF (p_driver_id IS NOT NULL AND p_driver_id IS DISTINCT FROM v_order.driver_id)
     OR (p_warehouse_id IS NOT NULL AND p_warehouse_id IS DISTINCT FROM v_order.fulfillment_warehouse_id) THEN
    IF v_order.status NOT IN ('new', 'confirmed', 'preparing', 'delivery_failed') THEN
      RAISE EXCEPTION 'Assignments cannot change after delivery has started';
    END IF;
  END IF;

  IF p_warehouse_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.warehouses WHERE id = p_warehouse_id AND is_active) THEN RAISE EXCEPTION 'Selected warehouse is not active'; END IF;
  END IF;
  IF p_driver_id IS NOT NULL THEN
    SELECT warehouse_id, status INTO v_driver_warehouse, v_driver_status FROM public.drivers WHERE id = p_driver_id FOR UPDATE;
    IF NOT FOUND OR v_driver_status NOT IN ('active', 'busy') THEN RAISE EXCEPTION 'Selected driver is not available'; END IF;
    IF v_driver_warehouse IS NOT NULL AND v_next_warehouse IS NOT NULL AND v_driver_warehouse <> v_next_warehouse THEN RAISE EXCEPTION 'Selected driver is assigned to another warehouse'; END IF;
  END IF;
  IF v_next_status = 'shipped' AND v_next_driver IS NULL THEN RAISE EXCEPTION 'Assign a driver before starting delivery'; END IF;

  UPDATE public.orders
  SET status = v_next_status,
      driver_id = v_next_driver,
      fulfillment_warehouse_id = v_next_warehouse
  WHERE id = v_order.id
  RETURNING status <> v_order.status OR driver_id IS DISTINCT FROM v_order.driver_id OR fulfillment_warehouse_id IS DISTINCT FROM v_order.fulfillment_warehouse_id,
            id, status, driver_id, fulfillment_warehouse_id, timezone('utc', now())
  INTO v_changed, id, status, driver_id, fulfillment_warehouse_id, updated_at;

  IF v_changed THEN
    INSERT INTO public.order_status_history(order_id, status, note, changed_by)
    VALUES (v_order.id, v_next_status, COALESCE(NULLIF(trim(p_note), ''), CASE WHEN v_next_status <> v_order.status THEN 'تم التحديث من لوحة الإدارة' ELSE 'تم تحديث تعيين التجهيز أو المندوب من لوحة الإدارة' END), auth.uid());
  END IF;
  RETURN NEXT;
END;
$$;

-- GPS is accepted only when the authenticated driver has an active delivery. The
-- last location is erased when the driver ends their shift or completes all trips.
CREATE OR REPLACE FUNCTION public.share_driver_location(
  p_latitude numeric, p_longitude numeric, p_accuracy_meters numeric DEFAULT NULL
)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_driver_id uuid; v_updated_at timestamptz;
BEGIN
  IF NOT public.is_driver() THEN RAISE EXCEPTION 'Driver access required'; END IF;
  IF p_latitude NOT BETWEEN -90 AND 90 OR p_longitude NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'Invalid GPS coordinates'; END IF;
  IF p_accuracy_meters IS NOT NULL AND p_accuracy_meters < 0 THEN RAISE EXCEPTION 'Invalid GPS accuracy'; END IF;
  SELECT id INTO v_driver_id FROM public.drivers WHERE user_id = auth.uid();
  IF v_driver_id IS NULL THEN RAISE EXCEPTION 'Driver profile is not linked to this account'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.orders WHERE driver_id = v_driver_id AND status = 'shipped') THEN RAISE EXCEPTION 'Location sharing is allowed only during an active delivery'; END IF;
  INSERT INTO public.driver_last_locations(driver_id, latitude, longitude, accuracy_meters, updated_at)
  VALUES (v_driver_id, p_latitude, p_longitude, p_accuracy_meters, timezone('utc', now()))
  ON CONFLICT (driver_id) DO UPDATE SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, accuracy_meters = EXCLUDED.accuracy_meters, updated_at = EXCLUDED.updated_at
  RETURNING updated_at INTO v_updated_at;
  RETURN v_updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_driver_availability(p_status text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_driver_id uuid;
BEGIN
  IF NOT public.is_driver() THEN RAISE EXCEPTION 'Driver access required'; END IF;
  IF p_status NOT IN ('active', 'offline') THEN RAISE EXCEPTION 'Unsupported availability status'; END IF;
  UPDATE public.drivers SET status = p_status, updated_at = timezone('utc', now()) WHERE user_id = auth.uid() RETURNING id INTO v_driver_id;
  IF v_driver_id IS NULL THEN RAISE EXCEPTION 'Driver profile is not linked to this account'; END IF;
  IF p_status = 'offline' THEN DELETE FROM public.driver_last_locations WHERE driver_id = v_driver_id; END IF;
  RETURN p_status;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_driver_order_status(
  p_order_id uuid, p_status text, p_note text DEFAULT NULL, p_failure_reason text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_driver_id uuid; v_note text;
BEGIN
  IF NOT public.is_driver() THEN RAISE EXCEPTION 'Driver access required'; END IF;
  IF p_status NOT IN ('shipped', 'delivered', 'delivery_failed') THEN RAISE EXCEPTION 'Drivers may only update active delivery states'; END IF;
  IF p_status = 'delivery_failed' AND NULLIF(trim(COALESCE(p_failure_reason, '')), '') IS NULL THEN RAISE EXCEPTION 'A delivery failure reason is required'; END IF;
  SELECT id INTO v_driver_id FROM public.drivers WHERE user_id = auth.uid();
  IF v_driver_id IS NULL THEN RAISE EXCEPTION 'Driver profile is not linked to this account'; END IF;
  UPDATE public.orders SET status = p_status
  WHERE id = p_order_id AND driver_id = v_driver_id
    AND ((p_status = 'shipped' AND status IN ('confirmed', 'preparing')) OR (p_status IN ('delivered', 'delivery_failed') AND status = 'shipped'))
  RETURNING status INTO p_status;
  IF NOT FOUND THEN RAISE EXCEPTION 'This status transition is not available for the assigned order'; END IF;
  v_note := CASE WHEN p_status = 'delivery_failed' THEN concat('تعذر التسليم: ', trim(p_failure_reason), CASE WHEN NULLIF(trim(COALESCE(p_note, '')), '') IS NULL THEN '' ELSE concat(' — ', trim(p_note)) END) ELSE COALESCE(NULLIF(trim(p_note), ''), 'تم التحديث من بوابة المندوب') END;
  INSERT INTO public.order_status_history(order_id, status, note, changed_by) VALUES (p_order_id, p_status, v_note, auth.uid());
  UPDATE public.drivers SET status = CASE WHEN p_status = 'shipped' THEN 'busy' ELSE 'active' END, updated_at = timezone('utc', now()) WHERE id = v_driver_id;
  IF p_status IN ('delivered', 'delivery_failed') AND NOT EXISTS (SELECT 1 FROM public.orders WHERE driver_id = v_driver_id AND status = 'shipped') THEN
    DELETE FROM public.driver_last_locations WHERE driver_id = v_driver_id;
  END IF;
  RETURN p_status;
END;
$$;

-- A customer must not be able to elevate their own role through the general
-- profile update policy.
CREATE OR REPLACE FUNCTION public.prevent_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only an administrator can change a user role';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS profiles_prevent_role_change ON public.profiles;
CREATE TRIGGER profiles_prevent_role_change BEFORE UPDATE OF role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_change();

-- Storefront updates and new customer notifications are visible without exposing
-- private row contents. The publication checks are safe when migrations re-run.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'customer_notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_notifications;
  END IF;
END;
$$;

-- Product images are public delivery assets, but creation, replacement, and
-- removal are limited to authenticated administrators and constrained in Storage.
INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES ('products', 'products', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;
DROP POLICY IF EXISTS "Admin Manage Products" ON storage.objects;
DROP POLICY IF EXISTS "Public Access Products" ON storage.objects;
CREATE POLICY "Public read product images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'products');
CREATE POLICY "Administrators manage product images" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'products' AND public.is_admin()) WITH CHECK (bucket_id = 'products' AND public.is_admin());

-- Narrow PostgREST grants. Row policies remain the final authorization layer.
REVOKE ALL ON TABLE public.affiliate_commissions, public.affiliate_profiles, public.coupon_redemptions,
  public.coupons, public.customer_notifications, public.customer_push_tokens, public.driver_last_locations,
  public.drivers, public.inventory_movements, public.loyalty_ledger, public.loyalty_settings,
  public.loyalty_tiers, public.notification_queue, public.order_returns, public.order_status_history,
  public.orders, public.payment_methods, public.payment_proofs, public.products, public.profiles,
  public.promotions, public.push_notification_deliveries, public.referral_rewards, public.restock_subscriptions,
  public.reviews, public.stock_transfers, public.storefront_banners, public.storefront_collection_products,
  public.storefront_collections, public.warehouse_inventory, public.warehouses, public.delivery_zones
  FROM anon, authenticated;

GRANT SELECT ON TABLE public.payment_methods, public.promotions, public.reviews,
  public.storefront_banners, public.delivery_zones TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_products(), public.get_public_product(uuid) TO anon, authenticated;

GRANT SELECT ON TABLE public.affiliate_commissions, public.affiliate_profiles, public.coupon_redemptions,
  public.coupons, public.customer_notifications, public.driver_last_locations, public.drivers,
  public.inventory_movements, public.loyalty_ledger, public.loyalty_settings, public.loyalty_tiers,
  public.notification_queue, public.order_returns, public.order_status_history, public.orders,
  public.payment_methods, public.payment_proofs, public.products, public.profiles, public.promotions,
  public.push_notification_deliveries, public.referral_rewards, public.restock_subscriptions, public.reviews,
  public.stock_transfers, public.storefront_banners, public.storefront_collection_products,
  public.storefront_collections, public.warehouse_inventory, public.warehouses, public.delivery_zones
  TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.products, public.promotions, public.reviews,
  public.drivers, public.warehouses, public.warehouse_inventory, public.stock_transfers, public.delivery_zones,
  public.coupons, public.loyalty_settings, public.loyalty_tiers, public.affiliate_profiles,
  public.affiliate_commissions TO authenticated;
GRANT UPDATE ON TABLE public.profiles, public.customer_notifications, public.restock_subscriptions TO authenticated;

DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins insert order history" ON public.order_status_history;

REVOKE ALL ON FUNCTION public.checkout_order(text,text,text,text,text,text,jsonb,text,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.checkout_order_with_growth(text,text,text,text,text,text,jsonb,text,integer,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.checkout_order_safe(text,text,text,text,text,text,jsonb,text,integer,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.checkout_order_safe(text,text,text,text,text,text,jsonb,text,integer,text) TO authenticated;
REVOKE ALL ON FUNCTION public.checkout_order_with_growth(text,text,text,text,text,text,jsonb,text,integer,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.checkout_order_with_growth(text,text,text,text,text,text,jsonb,text,integer,text,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_update_order_operation(uuid,text,text,uuid,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_order_operation(uuid,text,text,uuid,uuid,text) TO authenticated;
REVOKE ALL ON FUNCTION public.share_driver_location(numeric,numeric,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.share_driver_location(numeric,numeric,numeric) TO authenticated;
REVOKE ALL ON FUNCTION public.set_driver_availability(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_driver_availability(text) TO authenticated;
REVOKE ALL ON FUNCTION public.update_driver_order_status(uuid,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_driver_order_status(uuid,text,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.submit_payment_proof(uuid,text,numeric,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_payment_proof(uuid,text,numeric,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.request_order_return(uuid,jsonb,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_order_return(uuid,jsonb,text,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.prevent_profile_role_change() FROM PUBLIC, anon, authenticated;

COMMIT;
