BEGIN;

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
  WHERE id = p_order_id
    AND driver_id = v_driver_id
    AND (
      (p_status = 'shipped' AND status IN ('confirmed', 'preparing'))
      OR (p_status = 'delivered' AND status = 'shipped')
    )
  RETURNING status INTO p_status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This status transition is not available for the assigned order';
  END IF;

  INSERT INTO public.order_status_history (order_id, status, note, changed_by)
  VALUES (p_order_id, p_status, COALESCE(NULLIF(trim(p_note), ''), 'تم التحديث من بوابة المندوب'), (SELECT auth.uid()));

  IF p_status = 'shipped' THEN
    UPDATE public.drivers SET status = 'busy', updated_at = timezone('utc', now()) WHERE id = v_driver_id;
  ELSE
    UPDATE public.drivers SET status = 'active', updated_at = timezone('utc', now()) WHERE id = v_driver_id;
  END IF;
  RETURN p_status;
END;
$$;

COMMIT;
