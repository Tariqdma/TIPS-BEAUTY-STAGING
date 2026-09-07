BEGIN;

-- The output parameter `id` is visible as a PL/pgSQL variable. Qualify all
-- orders columns so the administrative state transition function is unambiguous.
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
  SELECT o.* INTO v_order FROM public.orders AS o WHERE o.id = p_order_id FOR UPDATE;
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

  IF p_warehouse_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.warehouses AS w WHERE w.id = p_warehouse_id AND w.is_active
  ) THEN RAISE EXCEPTION 'Selected warehouse is not active'; END IF;

  IF p_driver_id IS NOT NULL THEN
    SELECT d.warehouse_id, d.status INTO v_driver_warehouse, v_driver_status
    FROM public.drivers AS d WHERE d.id = p_driver_id FOR UPDATE;
    IF NOT FOUND OR v_driver_status NOT IN ('active', 'busy') THEN RAISE EXCEPTION 'Selected driver is not available'; END IF;
    IF v_driver_warehouse IS NOT NULL AND v_next_warehouse IS NOT NULL AND v_driver_warehouse <> v_next_warehouse THEN RAISE EXCEPTION 'Selected driver is assigned to another warehouse'; END IF;
  END IF;
  IF v_next_status = 'shipped' AND v_next_driver IS NULL THEN RAISE EXCEPTION 'Assign a driver before starting delivery'; END IF;

  UPDATE public.orders AS o
  SET status = v_next_status,
      driver_id = v_next_driver,
      fulfillment_warehouse_id = v_next_warehouse
  WHERE o.id = v_order.id
  RETURNING o.status <> v_order.status OR o.driver_id IS DISTINCT FROM v_order.driver_id OR o.fulfillment_warehouse_id IS DISTINCT FROM v_order.fulfillment_warehouse_id,
            o.id, o.status, o.driver_id, o.fulfillment_warehouse_id, timezone('utc', now())
  INTO v_changed, id, status, driver_id, fulfillment_warehouse_id, updated_at;

  IF v_changed THEN
    INSERT INTO public.order_status_history(order_id, status, note, changed_by)
    VALUES (v_order.id, v_next_status, COALESCE(NULLIF(trim(p_note), ''), CASE WHEN v_next_status <> v_order.status THEN 'تم التحديث من لوحة الإدارة' ELSE 'تم تحديث تعيين التجهيز أو المندوب من لوحة الإدارة' END), auth.uid());
  END IF;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_order_operation(uuid, text, text, uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_order_operation(uuid, text, text, uuid, uuid, text) TO authenticated;

COMMIT;
