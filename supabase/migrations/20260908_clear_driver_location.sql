BEGIN;

CREATE OR REPLACE FUNCTION public.clear_driver_location()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_driver_id uuid;
BEGIN
  IF NOT public.is_driver() THEN RAISE EXCEPTION 'Driver access required'; END IF;
  SELECT id INTO v_driver_id FROM public.drivers WHERE user_id = auth.uid();
  IF v_driver_id IS NULL THEN RAISE EXCEPTION 'Driver profile is not linked to this account'; END IF;
  DELETE FROM public.driver_last_locations WHERE driver_id = v_driver_id;
END;
$$;

REVOKE ALL ON FUNCTION public.clear_driver_location() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clear_driver_location() TO authenticated;

COMMIT;
