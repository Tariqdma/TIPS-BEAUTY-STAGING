BEGIN;

-- Operational roles and multi-warehouse data model
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('customer', 'admin', 'driver'));

CREATE TABLE IF NOT EXISTS public.warehouses (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  state text NOT NULL,
  city text NOT NULL,
  address text,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (name, state, city)
);

CREATE TABLE IF NOT EXISTS public.warehouse_inventory (
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reorder_level integer NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (warehouse_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity_delta integer NOT NULL CHECK (quantity_delta <> 0),
  movement_type text NOT NULL CHECK (movement_type IN ('adjustment', 'transfer_in', 'transfer_out', 'order_reservation')),
  note text,
  reference_id uuid,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.stock_transfers (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  from_warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  to_warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  note text,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CHECK (from_warehouse_id <> to_warehouse_id)
);

ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vehicle text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT timezone('utc', now());

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fulfillment_warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL;

ALTER TABLE public.delivery_zones
  ADD COLUMN IF NOT EXISTS warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS state text;

CREATE INDEX IF NOT EXISTS warehouse_inventory_product_idx ON public.warehouse_inventory(product_id);
CREATE INDEX IF NOT EXISTS warehouse_inventory_warehouse_idx ON public.warehouse_inventory(warehouse_id);
CREATE INDEX IF NOT EXISTS orders_fulfillment_warehouse_idx ON public.orders(fulfillment_warehouse_id);
CREATE INDEX IF NOT EXISTS orders_driver_idx ON public.orders(driver_id);
CREATE INDEX IF NOT EXISTS drivers_user_idx ON public.drivers(user_id);
CREATE INDEX IF NOT EXISTS inventory_movements_warehouse_created_idx ON public.inventory_movements(warehouse_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.is_driver()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role = 'driver'
  );
$$;

CREATE OR REPLACE FUNCTION public.sync_product_stock_from_warehouses()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_id uuid := COALESCE(NEW.product_id, OLD.product_id);
BEGIN
  UPDATE public.products
  SET stock = COALESCE((
    SELECT SUM(quantity) FROM public.warehouse_inventory WHERE product_id = v_product_id
  ), 0)
  WHERE id = v_product_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS warehouse_inventory_sync_product_stock ON public.warehouse_inventory;
CREATE TRIGGER warehouse_inventory_sync_product_stock
AFTER INSERT OR UPDATE OR DELETE ON public.warehouse_inventory
FOR EACH ROW EXECUTE FUNCTION public.sync_product_stock_from_warehouses();

CREATE OR REPLACE FUNCTION public.adjust_warehouse_inventory(
  p_warehouse_id uuid,
  p_product_id uuid,
  p_quantity_delta integer,
  p_note text DEFAULT NULL,
  p_reorder_level integer DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quantity integer;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  IF p_quantity_delta = 0 THEN RAISE EXCEPTION 'Quantity change cannot be zero'; END IF;

  IF p_quantity_delta > 0 THEN
    INSERT INTO public.warehouse_inventory (warehouse_id, product_id, quantity, reorder_level)
    VALUES (p_warehouse_id, p_product_id, p_quantity_delta, COALESCE(p_reorder_level, 0))
    ON CONFLICT (warehouse_id, product_id) DO UPDATE
      SET quantity = public.warehouse_inventory.quantity + EXCLUDED.quantity,
          reorder_level = COALESCE(p_reorder_level, public.warehouse_inventory.reorder_level),
          updated_at = timezone('utc', now())
    RETURNING quantity INTO v_quantity;
  ELSE
    UPDATE public.warehouse_inventory
    SET quantity = quantity + p_quantity_delta,
        reorder_level = COALESCE(p_reorder_level, reorder_level),
        updated_at = timezone('utc', now())
    WHERE warehouse_id = p_warehouse_id
      AND product_id = p_product_id
      AND quantity + p_quantity_delta >= 0
    RETURNING quantity INTO v_quantity;
    IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient stock at this warehouse'; END IF;
  END IF;

  INSERT INTO public.inventory_movements (warehouse_id, product_id, quantity_delta, movement_type, note, created_by)
  VALUES (p_warehouse_id, p_product_id, p_quantity_delta, 'adjustment', p_note, (SELECT auth.uid()));
  RETURN v_quantity;
END;
$$;

CREATE OR REPLACE FUNCTION public.transfer_warehouse_stock(
  p_from_warehouse_id uuid,
  p_to_warehouse_id uuid,
  p_product_id uuid,
  p_quantity integer,
  p_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transfer_id uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  IF p_from_warehouse_id = p_to_warehouse_id THEN RAISE EXCEPTION 'Source and destination warehouses must differ'; END IF;
  IF p_quantity < 1 THEN RAISE EXCEPTION 'Transfer quantity must be positive'; END IF;

  UPDATE public.warehouse_inventory
  SET quantity = quantity - p_quantity, updated_at = timezone('utc', now())
  WHERE warehouse_id = p_from_warehouse_id AND product_id = p_product_id AND quantity >= p_quantity;
  IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient stock in source warehouse'; END IF;

  INSERT INTO public.warehouse_inventory (warehouse_id, product_id, quantity)
  VALUES (p_to_warehouse_id, p_product_id, p_quantity)
  ON CONFLICT (warehouse_id, product_id) DO UPDATE
  SET quantity = public.warehouse_inventory.quantity + EXCLUDED.quantity,
      updated_at = timezone('utc', now());

  INSERT INTO public.stock_transfers (from_warehouse_id, to_warehouse_id, product_id, quantity, note, created_by)
  VALUES (p_from_warehouse_id, p_to_warehouse_id, p_product_id, p_quantity, p_note, (SELECT auth.uid()))
  RETURNING id INTO v_transfer_id;

  INSERT INTO public.inventory_movements (warehouse_id, product_id, quantity_delta, movement_type, note, reference_id, created_by)
  VALUES
    (p_from_warehouse_id, p_product_id, -p_quantity, 'transfer_out', p_note, v_transfer_id, (SELECT auth.uid())),
    (p_to_warehouse_id, p_product_id, p_quantity, 'transfer_in', p_note, v_transfer_id, (SELECT auth.uid()));

  RETURN v_transfer_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_driver_availability(p_status text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_driver() THEN RAISE EXCEPTION 'Driver access required'; END IF;
  IF p_status NOT IN ('active', 'offline') THEN RAISE EXCEPTION 'Unsupported availability status'; END IF;

  UPDATE public.drivers
  SET status = p_status, updated_at = timezone('utc', now())
  WHERE user_id = (SELECT auth.uid());
  IF NOT FOUND THEN RAISE EXCEPTION 'Driver profile is not linked to this account'; END IF;
  RETURN p_status;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_driver_order_status(
  p_order_id uuid,
  p_status text,
  p_note text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id uuid;
BEGIN
  IF NOT public.is_driver() THEN RAISE EXCEPTION 'Driver access required'; END IF;
  IF p_status NOT IN ('shipped', 'delivered') THEN RAISE EXCEPTION 'Drivers may only start or complete deliveries'; END IF;

  SELECT id INTO v_driver_id FROM public.drivers WHERE user_id = (SELECT auth.uid());
  IF v_driver_id IS NULL THEN RAISE EXCEPTION 'Driver profile is not linked to this account'; END IF;

  UPDATE public.orders
  SET status = p_status
  WHERE id = p_order_id AND driver_id = v_driver_id
  RETURNING status INTO p_status;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order is not assigned to this driver'; END IF;

  INSERT INTO public.order_status_history (order_id, status, note, changed_by)
  VALUES (p_order_id, p_status, COALESCE(NULLIF(trim(p_note), ''), 'تم التحديث من بوابة المندوب'), (SELECT auth.uid()));

  IF p_status = 'shipped' THEN
    UPDATE public.drivers SET status = 'busy', updated_at = timezone('utc', now()) WHERE id = v_driver_id;
  ELSIF p_status = 'delivered' THEN
    UPDATE public.drivers SET status = 'active', updated_at = timezone('utc', now()) WHERE id = v_driver_id;
  END IF;
  RETURN p_status;
END;
$$;

-- Use warehouse inventory automatically once branches have been configured.
CREATE OR REPLACE FUNCTION public.create_order(
  p_customer_name text,
  p_phone text,
  p_shipping_address text,
  p_city text,
  p_state text,
  p_payment_method text,
  p_items jsonb
)
RETURNS TABLE(order_id uuid, order_number text, total numeric, shipping_fee numeric)
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
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_customer_name IS NULL OR length(trim(p_customer_name)) < 2 THEN RAISE EXCEPTION 'Customer name is required'; END IF;
  IF p_phone IS NULL OR length(trim(p_phone)) < 5 THEN RAISE EXCEPTION 'Phone is required'; END IF;
  IF p_shipping_address IS NULL OR length(trim(p_shipping_address)) < 5 THEN RAISE EXCEPTION 'Shipping address is required'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Cart is empty'; END IF;
  IF p_payment_method NOT IN ('COD','Fawry','Mychashi') THEN RAISE EXCEPTION 'Unsupported payment method'; END IF;

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
    ORDER BY
      CASE WHEN lower(coalesce(w.city, '')) = lower(coalesce(p_city, '')) THEN 0 ELSE 1 END,
      CASE WHEN lower(coalesce(w.state, '')) = lower(coalesce(p_state, '')) THEN 0 ELSE 1 END,
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

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_product_id := (v_item->>'id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;
    IF v_has_warehouse_inventory THEN
      UPDATE public.warehouse_inventory
      SET quantity = quantity - v_quantity, updated_at = timezone('utc', now())
      WHERE warehouse_id = v_warehouse_id AND product_id = v_product_id AND quantity >= v_quantity;
      IF NOT FOUND THEN RAISE EXCEPTION 'Inventory changed before order confirmation'; END IF;
    ELSE
      UPDATE public.products SET stock = stock - v_quantity WHERE id = v_product_id;
    END IF;
  END LOOP;

  v_order_number := 'TB-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  INSERT INTO public.orders (customer_id, customer_name, phone, items, total, shipping_fee, status, payment_method, payment_status, shipping_address, city, state, order_number, fulfillment_warehouse_id)
  VALUES (v_user_id, trim(p_customer_name), trim(p_phone), p_items, round(v_subtotal + v_shipping, 2), v_shipping, 'new', p_payment_method, 'pending', trim(p_shipping_address), p_city, p_state, v_order_number, v_warehouse_id)
  RETURNING id INTO v_order_id;

  IF v_has_warehouse_inventory THEN
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
      INSERT INTO public.inventory_movements (warehouse_id, product_id, quantity_delta, movement_type, note, reference_id, created_by)
      VALUES (v_warehouse_id, (v_item->>'id')::uuid, -((v_item->>'quantity')::integer), 'order_reservation', 'حجز لطلب ' || v_order_number, v_order_id, v_user_id);
    END LOOP;
  END IF;

  INSERT INTO public.order_status_history (order_id, status, changed_by) VALUES (v_order_id, 'new', v_user_id);
  RETURN QUERY SELECT v_order_id, v_order_number, round(v_subtotal + v_shipping, 2), v_shipping;
END;
$$;

ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage warehouses" ON public.warehouses;
CREATE POLICY "Admins manage warehouses" ON public.warehouses FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admins manage warehouse inventory" ON public.warehouse_inventory;
CREATE POLICY "Admins manage warehouse inventory" ON public.warehouse_inventory FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admins view inventory movements" ON public.inventory_movements;
CREATE POLICY "Admins view inventory movements" ON public.inventory_movements FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admins manage stock transfers" ON public.stock_transfers;
CREATE POLICY "Admins manage stock transfers" ON public.stock_transfers FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Drivers view assigned orders" ON public.orders;
CREATE POLICY "Drivers view assigned orders" ON public.orders FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR customer_id = (SELECT auth.uid())
  OR EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = orders.driver_id AND d.user_id = (SELECT auth.uid()))
);

DROP POLICY IF EXISTS "Drivers view their profile" ON public.drivers;
CREATE POLICY "Drivers view their profile" ON public.drivers FOR SELECT TO authenticated
USING (public.is_admin() OR user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Drivers view their order history" ON public.order_status_history;
CREATE POLICY "Drivers view their order history" ON public.order_status_history FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.drivers d ON d.id = o.driver_id
    WHERE o.id = order_status_history.order_id AND d.user_id = (SELECT auth.uid())
  )
);

REVOKE ALL ON FUNCTION public.adjust_warehouse_inventory(uuid, uuid, integer, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adjust_warehouse_inventory(uuid, uuid, integer, text, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.transfer_warehouse_stock(uuid, uuid, uuid, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_warehouse_stock(uuid, uuid, uuid, integer, text) TO authenticated;
REVOKE ALL ON FUNCTION public.set_driver_availability(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_driver_availability(text) TO authenticated;
REVOKE ALL ON FUNCTION public.update_driver_order_status(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_driver_order_status(uuid, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.is_driver() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_driver() TO authenticated;

COMMIT;
