BEGIN;

-- Last known location only: no route history is retained.
CREATE TABLE IF NOT EXISTS public.driver_last_locations (
  driver_id uuid PRIMARY KEY REFERENCES public.drivers(id) ON DELETE CASCADE,
  latitude numeric(9,6) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude numeric(9,6) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  accuracy_meters numeric(10,2) CHECK (accuracy_meters IS NULL OR accuracy_meters >= 0),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.driver_last_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins view driver locations" ON public.driver_last_locations;
CREATE POLICY "Admins view driver locations" ON public.driver_last_locations
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE INDEX IF NOT EXISTS driver_last_locations_updated_at_idx ON public.driver_last_locations(updated_at DESC);

CREATE OR REPLACE FUNCTION public.share_driver_location(
  p_latitude numeric,
  p_longitude numeric,
  p_accuracy_meters numeric DEFAULT NULL
)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id uuid;
  v_updated_at timestamptz;
BEGIN
  IF NOT public.is_driver() THEN RAISE EXCEPTION 'Driver access required'; END IF;
  IF p_latitude NOT BETWEEN -90 AND 90 OR p_longitude NOT BETWEEN -180 AND 180 THEN
    RAISE EXCEPTION 'Invalid GPS coordinates';
  END IF;
  IF p_accuracy_meters IS NOT NULL AND p_accuracy_meters < 0 THEN RAISE EXCEPTION 'Invalid GPS accuracy'; END IF;

  SELECT id INTO v_driver_id FROM public.drivers WHERE user_id = auth.uid();
  IF v_driver_id IS NULL THEN RAISE EXCEPTION 'Driver profile is not linked to this account'; END IF;

  INSERT INTO public.driver_last_locations (driver_id, latitude, longitude, accuracy_meters, updated_at)
  VALUES (v_driver_id, p_latitude, p_longitude, p_accuracy_meters, timezone('utc', now()))
  ON CONFLICT (driver_id) DO UPDATE SET
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    accuracy_meters = EXCLUDED.accuracy_meters,
    updated_at = EXCLUDED.updated_at
  RETURNING updated_at INTO v_updated_at;
  RETURN v_updated_at;
END;
$$;

-- A driver can only mark an assigned in-transit order as failed. The reason is mandatory.
CREATE OR REPLACE FUNCTION public.update_driver_order_status(
  p_order_id uuid,
  p_status text,
  p_note text DEFAULT NULL,
  p_failure_reason text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id uuid;
  v_note text;
BEGIN
  IF NOT public.is_driver() THEN RAISE EXCEPTION 'Driver access required'; END IF;
  IF p_status NOT IN ('shipped', 'delivered', 'delivery_failed') THEN RAISE EXCEPTION 'Drivers may only update active delivery states'; END IF;
  IF p_status = 'delivery_failed' AND NULLIF(trim(COALESCE(p_failure_reason, '')), '') IS NULL THEN
    RAISE EXCEPTION 'A delivery failure reason is required';
  END IF;

  SELECT id INTO v_driver_id FROM public.drivers WHERE user_id = auth.uid();
  IF v_driver_id IS NULL THEN RAISE EXCEPTION 'Driver profile is not linked to this account'; END IF;

  UPDATE public.orders SET status = p_status
  WHERE id = p_order_id AND driver_id = v_driver_id
    AND ((p_status = 'shipped' AND status IN ('confirmed', 'preparing'))
      OR (p_status IN ('delivered', 'delivery_failed') AND status = 'shipped'))
  RETURNING status INTO p_status;
  IF NOT FOUND THEN RAISE EXCEPTION 'This status transition is not available for the assigned order'; END IF;

  v_note := CASE WHEN p_status = 'delivery_failed'
    THEN concat('تعذر التسليم: ', trim(p_failure_reason), CASE WHEN NULLIF(trim(COALESCE(p_note, '')), '') IS NULL THEN '' ELSE concat(' — ', trim(p_note)) END)
    ELSE COALESCE(NULLIF(trim(p_note), ''), 'تم التحديث من بوابة المندوب') END;
  INSERT INTO public.order_status_history (order_id, status, note, changed_by)
  VALUES (p_order_id, p_status, v_note, auth.uid());

  UPDATE public.drivers SET status = CASE WHEN p_status = 'shipped' THEN 'busy' ELSE 'active' END, updated_at = timezone('utc', now()) WHERE id = v_driver_id;
  RETURN p_status;
END;
$$;

DROP FUNCTION IF EXISTS public.update_driver_order_status(uuid, text, text);

REVOKE ALL ON FUNCTION public.share_driver_location(numeric,numeric,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.share_driver_location(numeric,numeric,numeric) TO authenticated;
REVOKE ALL ON FUNCTION public.update_driver_order_status(uuid,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_driver_order_status(uuid,text,text,text) TO authenticated;

-- Low-latency UI updates. RLS still limits records visible to each signed-in role.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'order_status_history') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_status_history;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'driver_last_locations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_last_locations;
  END IF;
END;
$$;

COMMIT;
