BEGIN;

-- Payment configuration, proof review, coupons, loyalty, returns and notification delivery queue.
CREATE TABLE IF NOT EXISTS public.payment_methods (
  code text PRIMARY KEY,
  name_ar text NOT NULL,
  description_ar text,
  requires_proof boolean NOT NULL DEFAULT false,
  account_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CHECK (code IN ('COD', 'BANK_TRANSFER', 'Fawry', 'Mychashi'))
);

INSERT INTO public.payment_methods (code, name_ar, description_ar, requires_proof, account_details, is_active, display_order)
VALUES
  ('COD', 'الدفع عند الاستلام', 'ادفع نقداً للمندوب عند استلام الطلب.', false, '{}'::jsonb, true, 10),
  ('BANK_TRANSFER', 'تحويل بنكي', 'أرسل رقم التحويل وارفع صورة إثبات الدفع بعد تأكيد الطلب.', true, jsonb_build_object('account_name', 'يُحدد من الإدارة', 'account_number', 'يُحدد من الإدارة'), true, 20),
  ('Fawry', 'فوري', 'أدخل مرجع الدفع أو ارفع الإثبات بعد التحويل.', true, '{}'::jsonb, true, 30),
  ('Mychashi', 'ماي كاشي', 'أدخل مرجع الدفع أو ارفع الإثبات بعد التحويل.', true, '{}'::jsonb, true, 40)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coupon_code text,
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  ADD COLUMN IF NOT EXISTS points_redeemed integer NOT NULL DEFAULT 0 CHECK (points_redeemed >= 0),
  ADD COLUMN IF NOT EXISTS points_discount numeric NOT NULL DEFAULT 0 CHECK (points_discount >= 0),
  ADD COLUMN IF NOT EXISTS points_earned integer NOT NULL DEFAULT 0 CHECK (points_earned >= 0),
  ADD COLUMN IF NOT EXISTS payment_reference text;

CREATE TABLE IF NOT EXISTS public.payment_proofs (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_method text NOT NULL REFERENCES public.payment_methods(code),
  amount numeric NOT NULL CHECK (amount >= 0),
  transaction_reference text,
  proof_path text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  review_note text,
  submitted_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  reviewed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  min_order_amount numeric NOT NULL DEFAULT 0 CHECK (min_order_amount >= 0),
  max_discount_amount numeric CHECK (max_discount_amount IS NULL OR max_discount_amount > 0),
  usage_limit integer CHECK (usage_limit IS NULL OR usage_limit > 0),
  per_user_limit integer NOT NULL DEFAULT 1 CHECK (per_user_limit > 0),
  usage_count integer NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE RESTRICT,
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discount_amount numeric NOT NULL CHECK (discount_amount > 0),
  redeemed_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.loyalty_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  points_per_1000 numeric NOT NULL DEFAULT 10 CHECK (points_per_1000 >= 0),
  currency_per_point numeric NOT NULL DEFAULT 10 CHECK (currency_per_point > 0),
  minimum_redemption_points integer NOT NULL DEFAULT 50 CHECK (minimum_redemption_points >= 0),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);
INSERT INTO public.loyalty_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.loyalty_ledger (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  points_delta integer NOT NULL CHECK (points_delta <> 0),
  event_type text NOT NULL CHECK (event_type IN ('earn', 'redeem', 'adjustment', 'refund_reversal')),
  note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);
CREATE UNIQUE INDEX IF NOT EXISTS loyalty_order_event_once_idx
  ON public.loyalty_ledger(order_id, event_type)
  WHERE order_id IS NOT NULL AND event_type IN ('earn', 'redeem');

CREATE TABLE IF NOT EXISTS public.order_returns (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  reason text NOT NULL,
  requested_resolution text NOT NULL CHECK (requested_resolution IN ('refund', 'exchange', 'store_credit')),
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'rejected', 'received', 'refunded', 'closed')),
  customer_note text,
  admin_note text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  restocked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);
CREATE INDEX IF NOT EXISTS order_returns_customer_idx ON public.order_returns(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS order_returns_status_idx ON public.order_returns(status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.notification_queue (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_phone text,
  channel text NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'sms')),
  event_type text NOT NULL,
  message text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  provider_reference text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);
CREATE INDEX IF NOT EXISTS notification_queue_status_idx ON public.notification_queue(status, created_at DESC);

-- Bucket stays private. Customers can upload and read only their own proof; admins can review all proof files.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('payment-proofs', 'payment-proofs', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view active payment methods" ON public.payment_methods;
CREATE POLICY "Public view active payment methods" ON public.payment_methods FOR SELECT TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS "Admins manage payment methods" ON public.payment_methods;
CREATE POLICY "Admins manage payment methods" ON public.payment_methods FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Customers view own payment proofs" ON public.payment_proofs;
CREATE POLICY "Customers view own payment proofs" ON public.payment_proofs FOR SELECT TO authenticated USING (customer_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "Admins manage payment proofs" ON public.payment_proofs;
CREATE POLICY "Admins manage payment proofs" ON public.payment_proofs FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins manage coupons" ON public.coupons;
CREATE POLICY "Admins manage coupons" ON public.coupons FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admins view coupon redemptions" ON public.coupon_redemptions;
CREATE POLICY "Admins view coupon redemptions" ON public.coupon_redemptions FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Customers view loyalty ledger" ON public.loyalty_ledger;
CREATE POLICY "Customers view loyalty ledger" ON public.loyalty_ledger FOR SELECT TO authenticated USING (customer_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "Admins manage loyalty ledger" ON public.loyalty_ledger;
CREATE POLICY "Admins manage loyalty ledger" ON public.loyalty_ledger FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admins manage loyalty settings" ON public.loyalty_settings;
CREATE POLICY "Admins manage loyalty settings" ON public.loyalty_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Customers view own returns" ON public.order_returns;
CREATE POLICY "Customers view own returns" ON public.order_returns FOR SELECT TO authenticated USING (customer_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "Admins manage returns" ON public.order_returns;
CREATE POLICY "Admins manage returns" ON public.order_returns FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins manage notification queue" ON public.notification_queue;
CREATE POLICY "Admins manage notification queue" ON public.notification_queue FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Customers upload own payment proofs" ON storage.objects;
CREATE POLICY "Customers upload own payment proofs" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));
DROP POLICY IF EXISTS "Customers view own payment proofs files" ON storage.objects;
CREATE POLICY "Customers view own payment proofs files" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));
DROP POLICY IF EXISTS "Admins manage payment proof files" ON storage.objects;
CREATE POLICY "Admins manage payment proof files" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'payment-proofs' AND public.is_admin())
WITH CHECK (bucket_id = 'payment-proofs' AND public.is_admin());

CREATE OR REPLACE FUNCTION public.checkout_order(
  p_customer_name text,
  p_phone text,
  p_shipping_address text,
  p_city text,
  p_state text,
  p_payment_method text,
  p_items jsonb,
  p_coupon_code text DEFAULT NULL,
  p_points_to_redeem integer DEFAULT 0
)
RETURNS TABLE(order_id uuid, order_number text, total numeric, shipping_fee numeric, discount_amount numeric, points_discount numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_item jsonb;
  v_product_id uuid;
  v_quantity integer;
  v_unit_price numeric;
  v_discount numeric;
  v_stock integer;
  v_subtotal numeric := 0;
  v_shipping numeric := 1500;
  v_order_id uuid;
  v_order_number text;
  v_warehouse_id uuid;
  v_has_warehouse_inventory boolean;
  v_coupon public.coupons%ROWTYPE;
  v_coupon_discount numeric := 0;
  v_points integer := 0;
  v_points_discount numeric := 0;
  v_point_value numeric;
  v_minimum_points integer;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_customer_name IS NULL OR length(trim(p_customer_name)) < 2 THEN RAISE EXCEPTION 'Customer name is required'; END IF;
  IF p_phone IS NULL OR length(trim(p_phone)) < 5 THEN RAISE EXCEPTION 'Phone is required'; END IF;
  IF p_shipping_address IS NULL OR length(trim(p_shipping_address)) < 5 THEN RAISE EXCEPTION 'Shipping address is required'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Cart is empty'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.payment_methods WHERE code = p_payment_method AND is_active) THEN RAISE EXCEPTION 'Unsupported payment method'; END IF;
  IF p_points_to_redeem < 0 THEN RAISE EXCEPTION 'Points cannot be negative'; END IF;

  SELECT dz.fee INTO v_shipping FROM public.delivery_zones dz WHERE dz.name = p_city AND dz.is_active = true LIMIT 1;
  v_shipping := COALESCE(v_shipping, 1500);
  SELECT EXISTS (SELECT 1 FROM public.warehouse_inventory) INTO v_has_warehouse_inventory;

  IF v_has_warehouse_inventory THEN
    SELECT w.id INTO v_warehouse_id
    FROM public.warehouses w
    WHERE w.is_active
      AND NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_items) ci
        WHERE NOT EXISTS (
          SELECT 1 FROM public.warehouse_inventory wi
          WHERE wi.warehouse_id = w.id
            AND wi.product_id = (ci->>'id')::uuid
            AND wi.quantity >= (ci->>'quantity')::integer
        )
      )
    ORDER BY CASE WHEN lower(w.city) = lower(coalesce(p_city, '')) THEN 0 ELSE 1 END,
             CASE WHEN lower(w.state) = lower(coalesce(p_state, '')) THEN 0 ELSE 1 END,
             w.created_at
    LIMIT 1;
    IF v_warehouse_id IS NULL THEN RAISE EXCEPTION 'No active warehouse can fulfill this order'; END IF;
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_product_id := (v_item->>'id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;
    IF v_quantity IS NULL OR v_quantity < 1 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
    SELECT p.price, COALESCE(p.discount_percentage, 0), p.stock INTO v_unit_price, v_discount, v_stock
    FROM public.products p WHERE p.id = v_product_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
    IF NOT v_has_warehouse_inventory AND v_stock < v_quantity THEN RAISE EXCEPTION 'Insufficient stock for product %', v_product_id; END IF;
    v_subtotal := v_subtotal + (v_unit_price * (1 - v_discount / 100)) * v_quantity;
  END LOOP;

  IF NULLIF(trim(coalesce(p_coupon_code, '')), '') IS NOT NULL THEN
    SELECT * INTO v_coupon FROM public.coupons
    WHERE code = upper(trim(p_coupon_code))
      AND is_active
      AND starts_at <= timezone('utc', now())
      AND (ends_at IS NULL OR ends_at >= timezone('utc', now()))
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Coupon is invalid or expired'; END IF;
    IF v_subtotal < v_coupon.min_order_amount THEN RAISE EXCEPTION 'Coupon minimum order amount was not reached'; END IF;
    IF v_coupon.usage_limit IS NOT NULL AND v_coupon.usage_count >= v_coupon.usage_limit THEN RAISE EXCEPTION 'Coupon usage limit has been reached'; END IF;
    IF (SELECT count(*) FROM public.coupon_redemptions WHERE coupon_id = v_coupon.id AND customer_id = v_user_id) >= v_coupon.per_user_limit THEN RAISE EXCEPTION 'Coupon usage limit for this account has been reached'; END IF;
    v_coupon_discount := CASE WHEN v_coupon.discount_type = 'percentage' THEN v_subtotal * v_coupon.discount_value / 100 ELSE v_coupon.discount_value END;
    IF v_coupon.max_discount_amount IS NOT NULL THEN v_coupon_discount := LEAST(v_coupon_discount, v_coupon.max_discount_amount); END IF;
    v_coupon_discount := LEAST(v_coupon_discount, v_subtotal);
  END IF;

  SELECT beauty_points INTO v_points FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  SELECT currency_per_point, minimum_redemption_points INTO v_point_value, v_minimum_points FROM public.loyalty_settings WHERE id = true;
  IF p_points_to_redeem > 0 THEN
    IF p_points_to_redeem < v_minimum_points THEN RAISE EXCEPTION 'Minimum points for redemption was not reached'; END IF;
    IF p_points_to_redeem > COALESCE(v_points, 0) THEN RAISE EXCEPTION 'Insufficient loyalty points'; END IF;
    v_points_discount := LEAST(p_points_to_redeem * v_point_value, GREATEST(v_subtotal - v_coupon_discount, 0));
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_product_id := (v_item->>'id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;
    IF v_has_warehouse_inventory THEN
      UPDATE public.warehouse_inventory SET quantity = quantity - v_quantity, updated_at = timezone('utc', now())
      WHERE warehouse_id = v_warehouse_id AND product_id = v_product_id AND quantity >= v_quantity;
      IF NOT FOUND THEN RAISE EXCEPTION 'Inventory changed before order confirmation'; END IF;
    ELSE
      UPDATE public.products SET stock = stock - v_quantity WHERE id = v_product_id;
    END IF;
  END LOOP;

  v_order_number := 'TB-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  INSERT INTO public.orders (customer_id, customer_name, phone, items, total, shipping_fee, status, payment_method, payment_status, shipping_address, city, state, order_number, fulfillment_warehouse_id, coupon_code, discount_amount, points_redeemed, points_discount)
  VALUES (v_user_id, trim(p_customer_name), trim(p_phone), p_items, round(GREATEST(v_subtotal + v_shipping - v_coupon_discount - v_points_discount, 0), 2), v_shipping, 'new', p_payment_method, 'pending', trim(p_shipping_address), p_city, p_state, v_order_number, v_warehouse_id, NULLIF(upper(trim(coalesce(p_coupon_code, ''))), ''), round(v_coupon_discount, 2), p_points_to_redeem, round(v_points_discount, 2))
  RETURNING id INTO v_order_id;

  IF v_coupon.id IS NOT NULL THEN
    UPDATE public.coupons SET usage_count = usage_count + 1 WHERE id = v_coupon.id;
    INSERT INTO public.coupon_redemptions (coupon_id, order_id, customer_id, discount_amount) VALUES (v_coupon.id, v_order_id, v_user_id, v_coupon_discount);
  END IF;
  IF p_points_to_redeem > 0 THEN
    UPDATE public.profiles SET beauty_points = beauty_points - p_points_to_redeem WHERE id = v_user_id;
    INSERT INTO public.loyalty_ledger (customer_id, order_id, points_delta, event_type, note, created_by) VALUES (v_user_id, v_order_id, -p_points_to_redeem, 'redeem', 'استبدال نقاط عند إنشاء الطلب', v_user_id);
  END IF;
  IF v_has_warehouse_inventory THEN
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
      INSERT INTO public.inventory_movements (warehouse_id, product_id, quantity_delta, movement_type, note, reference_id, created_by)
      VALUES (v_warehouse_id, (v_item->>'id')::uuid, -((v_item->>'quantity')::integer), 'order_reservation', 'حجز لطلب ' || v_order_number, v_order_id, v_user_id);
    END LOOP;
  END IF;
  INSERT INTO public.order_status_history (order_id, status, changed_by) VALUES (v_order_id, 'new', v_user_id);
  RETURN QUERY SELECT v_order_id, v_order_number, round(GREATEST(v_subtotal + v_shipping - v_coupon_discount - v_points_discount, 0), 2), v_shipping, round(v_coupon_discount, 2), round(v_points_discount, 2);
END;
$$;

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
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_proof_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.orders WHERE id = p_order_id AND customer_id = v_user_id) THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.payment_methods WHERE code = p_payment_method AND is_active AND requires_proof) THEN RAISE EXCEPTION 'Selected method does not accept proof'; END IF;
  IF p_amount < 0 OR NULLIF(trim(p_proof_path), '') IS NULL THEN RAISE EXCEPTION 'Payment amount and proof are required'; END IF;
  IF split_part(p_proof_path, '/', 1) <> v_user_id::text THEN RAISE EXCEPTION 'Invalid proof storage path'; END IF;

  INSERT INTO public.payment_proofs (order_id, customer_id, payment_method, amount, transaction_reference, proof_path, status, reviewer_id, review_note, reviewed_at, submitted_at)
  VALUES (p_order_id, v_user_id, p_payment_method, p_amount, NULLIF(trim(p_transaction_reference), ''), p_proof_path, 'pending', NULL, NULL, NULL, timezone('utc', now()))
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

CREATE OR REPLACE FUNCTION public.review_payment_proof(p_proof_id uuid, p_status text, p_review_note text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order_id uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  IF p_status NOT IN ('verified', 'rejected') THEN RAISE EXCEPTION 'Unsupported review status'; END IF;
  UPDATE public.payment_proofs
  SET status = p_status, reviewer_id = (SELECT auth.uid()), review_note = NULLIF(trim(p_review_note), ''), reviewed_at = timezone('utc', now())
  WHERE id = p_proof_id AND status = 'pending'
  RETURNING order_id INTO v_order_id;
  IF v_order_id IS NULL THEN RAISE EXCEPTION 'Payment proof is not pending'; END IF;
  UPDATE public.orders
  SET payment_status = CASE WHEN p_status = 'verified' THEN 'paid' ELSE 'pending' END,
      financial_status = CASE WHEN p_status = 'verified' THEN 'paid' ELSE financial_status END
  WHERE id = v_order_id;
  RETURN p_status;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_order_return(
  p_order_id uuid,
  p_items jsonb,
  p_reason text,
  p_requested_resolution text,
  p_customer_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_return_id uuid;
  v_order_items jsonb;
  v_item jsonb;
  v_allowed_quantity integer;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_requested_resolution NOT IN ('refund', 'exchange', 'store_credit') THEN RAISE EXCEPTION 'Unsupported return resolution'; END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) < 5 THEN RAISE EXCEPTION 'Return reason is required'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'At least one item is required'; END IF;
  SELECT items INTO v_order_items FROM public.orders WHERE id = p_order_id AND customer_id = v_user_id AND status = 'delivered';
  IF v_order_items IS NULL THEN RAISE EXCEPTION 'Only delivered orders can be returned'; END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    IF NULLIF(v_item->>'id', '') IS NULL OR COALESCE((v_item->>'quantity')::integer, 0) < 1 THEN RAISE EXCEPTION 'Invalid return item'; END IF;
    SELECT (purchased_item->>'quantity')::integer INTO v_allowed_quantity
    FROM jsonb_array_elements(v_order_items) purchased_item
    WHERE purchased_item->>'id' = v_item->>'id'
    LIMIT 1;
    IF v_allowed_quantity IS NULL OR (v_item->>'quantity')::integer > v_allowed_quantity THEN RAISE EXCEPTION 'Return items must match the delivered order'; END IF;
  END LOOP;
  INSERT INTO public.order_returns (order_id, customer_id, items, reason, requested_resolution, customer_note)
  VALUES (p_order_id, v_user_id, p_items, trim(p_reason), p_requested_resolution, NULLIF(trim(p_customer_note), ''))
  RETURNING id INTO v_return_id;
  RETURN v_return_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_order_return(
  p_return_id uuid,
  p_status text,
  p_admin_note text DEFAULT NULL,
  p_restock boolean DEFAULT false
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_return public.order_returns%ROWTYPE;
  v_warehouse_id uuid;
  v_item jsonb;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  IF p_status NOT IN ('approved', 'rejected', 'received', 'refunded', 'closed') THEN RAISE EXCEPTION 'Unsupported return status'; END IF;
  SELECT * INTO v_return FROM public.order_returns WHERE id = p_return_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Return request not found'; END IF;

  UPDATE public.order_returns SET status = p_status, admin_note = NULLIF(trim(p_admin_note), ''), reviewed_by = (SELECT auth.uid()), reviewed_at = timezone('utc', now()), updated_at = timezone('utc', now()) WHERE id = p_return_id;

  IF p_restock AND v_return.restocked_at IS NULL THEN
    SELECT fulfillment_warehouse_id INTO v_warehouse_id FROM public.orders WHERE id = v_return.order_id;
    FOR v_item IN SELECT value FROM jsonb_array_elements(v_return.items) LOOP
      IF v_warehouse_id IS NOT NULL THEN
        INSERT INTO public.warehouse_inventory (warehouse_id, product_id, quantity)
        VALUES (v_warehouse_id, (v_item->>'id')::uuid, (v_item->>'quantity')::integer)
        ON CONFLICT (warehouse_id, product_id) DO UPDATE SET quantity = public.warehouse_inventory.quantity + EXCLUDED.quantity, updated_at = timezone('utc', now());
        INSERT INTO public.inventory_movements (warehouse_id, product_id, quantity_delta, movement_type, note, reference_id, created_by)
        VALUES (v_warehouse_id, (v_item->>'id')::uuid, (v_item->>'quantity')::integer, 'adjustment', 'إعادة مخزون من مرتجع', v_return.order_id, (SELECT auth.uid()));
      ELSE
        UPDATE public.products SET stock = stock + (v_item->>'quantity')::integer WHERE id = (v_item->>'id')::uuid;
      END IF;
    END LOOP;
    UPDATE public.order_returns SET restocked_at = timezone('utc', now()) WHERE id = p_return_id;
  END IF;

  IF p_status = 'refunded' THEN
    UPDATE public.orders SET payment_status = 'refunded', financial_status = 'refunded' WHERE id = v_return.order_id;
  END IF;
  RETURN p_status;
END;
$$;

CREATE OR REPLACE FUNCTION public.adjust_loyalty_points(p_customer_id uuid, p_points_delta integer, p_note text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_balance integer;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  IF p_points_delta = 0 THEN RAISE EXCEPTION 'Points change cannot be zero'; END IF;
  UPDATE public.profiles SET beauty_points = COALESCE(beauty_points, 0) + p_points_delta
  WHERE id = p_customer_id AND COALESCE(beauty_points, 0) + p_points_delta >= 0
  RETURNING beauty_points INTO v_balance;
  IF v_balance IS NULL THEN RAISE EXCEPTION 'Customer not found'; END IF;
  INSERT INTO public.loyalty_ledger (customer_id, points_delta, event_type, note, created_by) VALUES (p_customer_id, p_points_delta, 'adjustment', NULLIF(trim(p_note), ''), (SELECT auth.uid()));
  RETURN v_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.award_order_loyalty_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_points integer;
  v_rate numeric;
BEGIN
  IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered' THEN
    SELECT points_per_1000 INTO v_rate FROM public.loyalty_settings WHERE id = true;
    v_points := floor(GREATEST(NEW.total - NEW.shipping_fee, 0) / 1000 * COALESCE(v_rate, 0));
    IF v_points > 0 THEN
      INSERT INTO public.loyalty_ledger (customer_id, order_id, points_delta, event_type, note)
      VALUES (NEW.customer_id, NEW.id, v_points, 'earn', 'نقاط مكتسبة من طلب مكتمل')
      ON CONFLICT DO NOTHING;
      IF FOUND THEN
        UPDATE public.profiles SET beauty_points = COALESCE(beauty_points, 0) + v_points WHERE id = NEW.customer_id;
        NEW.points_earned := v_points;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_award_loyalty_points ON public.orders;
CREATE TRIGGER orders_award_loyalty_points
BEFORE UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.award_order_loyalty_points();

CREATE OR REPLACE FUNCTION public.queue_order_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_event text;
  v_message text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event := 'order_created';
    v_message := 'تم استلام طلبك رقم ' || COALESCE(NEW.order_number, '') || ' بنجاح. سنقوم بتأكيده قريباً.';
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    v_event := 'order_status_' || NEW.status;
    v_message := CASE NEW.status
      WHEN 'confirmed' THEN 'تم تأكيد طلبك رقم ' || NEW.order_number || '.'
      WHEN 'preparing' THEN 'يجري تجهيز طلبك رقم ' || NEW.order_number || '.'
      WHEN 'shipped' THEN 'طلبك رقم ' || NEW.order_number || ' خرج للتوصيل.'
      WHEN 'delivered' THEN 'تم توصيل طلبك رقم ' || NEW.order_number || '. شكراً لاختيارك تيبس بيوتي.'
      WHEN 'cancelled' THEN 'تم إلغاء طلبك رقم ' || NEW.order_number || '. تواصلي معنا للمساعدة.'
      ELSE 'تم تحديث حالة طلبك رقم ' || NEW.order_number || '.' END;
  ELSIF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    v_event := 'payment_' || NEW.payment_status;
    v_message := CASE NEW.payment_status
      WHEN 'proof_submitted' THEN 'تم استلام إثبات دفع طلبك رقم ' || NEW.order_number || ' وجارٍ مراجعته.'
      WHEN 'paid' THEN 'تم تأكيد دفع طلبك رقم ' || NEW.order_number || '.'
      WHEN 'refunded' THEN 'تم تسجيل استرداد طلبك رقم ' || NEW.order_number || '.'
      ELSE 'تم تحديث حالة دفع طلبك رقم ' || NEW.order_number || '.' END;
  ELSE
    RETURN NEW;
  END IF;
  INSERT INTO public.notification_queue (order_id, customer_id, recipient_phone, channel, event_type, message, payload)
  VALUES (NEW.id, NEW.customer_id, NEW.phone, 'whatsapp', v_event, v_message, jsonb_build_object('order_number', NEW.order_number, 'status', NEW.status, 'payment_status', NEW.payment_status));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_queue_notifications ON public.orders;
CREATE TRIGGER orders_queue_notifications
AFTER INSERT OR UPDATE OF status, payment_status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.queue_order_notification();

CREATE OR REPLACE FUNCTION public.queue_return_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_phone text; v_number text;
BEGIN
  SELECT phone, order_number INTO v_phone, v_number FROM public.orders WHERE id = NEW.order_id;
  INSERT INTO public.notification_queue (order_id, customer_id, recipient_phone, channel, event_type, message, payload)
  VALUES (NEW.order_id, NEW.customer_id, v_phone, 'whatsapp', 'return_' || NEW.status,
    CASE WHEN TG_OP = 'INSERT' THEN 'تم استلام طلب الإرجاع الخاص بالطلب ' || COALESCE(v_number, '') || '.' ELSE 'تم تحديث حالة طلب الإرجاع للطلب ' || COALESCE(v_number, '') || ' إلى: ' || NEW.status END,
    jsonb_build_object('return_id', NEW.id, 'status', NEW.status));
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS returns_queue_notifications ON public.order_returns;
CREATE TRIGGER returns_queue_notifications
AFTER INSERT OR UPDATE OF status ON public.order_returns
FOR EACH ROW EXECUTE FUNCTION public.queue_return_notification();

CREATE OR REPLACE FUNCTION public.admin_business_report(p_start date DEFAULT (CURRENT_DATE - 30), p_end date DEFAULT CURRENT_DATE)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_report jsonb;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  SELECT jsonb_build_object(
    'revenue', COALESCE(SUM(o.total) FILTER (WHERE o.status <> 'cancelled'), 0),
    'paid_revenue', COALESCE(SUM(o.total) FILTER (WHERE o.payment_status = 'paid'), 0),
    'orders', COUNT(*),
    'delivered_orders', COUNT(*) FILTER (WHERE o.status = 'delivered'),
    'pending_payments', COUNT(*) FILTER (WHERE o.payment_status IN ('pending', 'proof_submitted')),
    'returns', (SELECT COUNT(*) FROM public.order_returns r WHERE r.created_at::date BETWEEN p_start AND p_end),
    'by_city', COALESCE((SELECT jsonb_agg(city_row ORDER BY (city_row->>'revenue')::numeric DESC) FROM (
      SELECT jsonb_build_object('city', COALESCE(city, 'غير محدد'), 'orders', COUNT(*), 'revenue', COALESCE(SUM(total), 0)) AS city_row
      FROM public.orders WHERE created_at::date BETWEEN p_start AND p_end AND status <> 'cancelled' GROUP BY city
    ) s), '[]'::jsonb),
    'low_stock', COALESCE((SELECT jsonb_agg(stock_row) FROM (
      SELECT jsonb_build_object('product_id', wi.product_id, 'product_name', p.name_ar, 'warehouse', w.name, 'quantity', wi.quantity, 'reorder_level', wi.reorder_level) AS stock_row
      FROM public.warehouse_inventory wi JOIN public.products p ON p.id = wi.product_id JOIN public.warehouses w ON w.id = wi.warehouse_id
      WHERE wi.quantity <= wi.reorder_level ORDER BY wi.quantity ASC LIMIT 10
    ) l), '[]'::jsonb)
  ) INTO v_report
  FROM public.orders o WHERE o.created_at::date BETWEEN p_start AND p_end;
  RETURN COALESCE(v_report, '{}'::jsonb);
END;
$$;

-- Grant only authenticated users access to action functions. Administrative checks are enforced inside each function.
REVOKE ALL ON FUNCTION public.checkout_order(text, text, text, text, text, text, jsonb, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.checkout_order(text, text, text, text, text, text, jsonb, text, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.submit_payment_proof(uuid, text, numeric, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_payment_proof(uuid, text, numeric, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.review_payment_proof(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_payment_proof(uuid, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.request_order_return(uuid, jsonb, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_order_return(uuid, jsonb, text, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.review_order_return(uuid, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_order_return(uuid, text, text, boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.adjust_loyalty_points(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_loyalty_points(uuid, integer, text) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_business_report(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_business_report(date, date) TO authenticated;

REVOKE ALL ON FUNCTION public.adjust_warehouse_inventory(uuid, uuid, integer, text, integer) FROM anon;
REVOKE ALL ON FUNCTION public.transfer_warehouse_stock(uuid, uuid, uuid, integer, text) FROM anon;
REVOKE ALL ON FUNCTION public.set_driver_availability(text) FROM anon;
REVOKE ALL ON FUNCTION public.update_driver_order_status(uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.sync_product_stock_from_warehouses() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM anon;
REVOKE ALL ON FUNCTION public.is_driver() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_driver() TO authenticated;

REVOKE ALL ON TABLE public.inventory_movements, public.stock_transfers, public.warehouse_inventory, public.warehouses, public.drivers, public.orders, public.order_status_history, public.profiles FROM anon;
GRANT SELECT ON TABLE public.products, public.promotions, public.reviews, public.delivery_zones TO anon;
GRANT SELECT ON TABLE public.payment_methods TO anon, authenticated;

COMMIT;
