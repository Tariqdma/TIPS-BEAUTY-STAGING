BEGIN;

DROP POLICY IF EXISTS "Customers manage own push tokens" ON public.customer_push_tokens;
DROP POLICY IF EXISTS "Admins manage customer push tokens" ON public.customer_push_tokens;
CREATE POLICY "Admins manage customer push tokens" ON public.customer_push_tokens FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.register_customer_push_token(
  p_expo_push_token text,
  p_platform text,
  p_device_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_customer_id uuid := auth.uid();
  v_token_id uuid;
BEGIN
  IF v_customer_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_platform NOT IN ('ios', 'android') THEN RAISE EXCEPTION 'Unsupported device platform'; END IF;
  IF p_expo_push_token IS NULL OR p_expo_push_token !~ '^ExponentPushToken\[[^\]]+\]$|^ExpoPushToken\[[^\]]+\]$' THEN
    RAISE EXCEPTION 'Invalid Expo push token';
  END IF;

  INSERT INTO public.customer_push_tokens (customer_id, expo_push_token, platform, device_name, is_active, invalidated_at, last_registered_at)
  VALUES (v_customer_id, p_expo_push_token, p_platform, NULLIF(trim(p_device_name), ''), true, NULL, timezone('utc', now()))
  ON CONFLICT (expo_push_token) DO UPDATE SET
    customer_id = EXCLUDED.customer_id,
    platform = EXCLUDED.platform,
    device_name = EXCLUDED.device_name,
    is_active = true,
    invalidated_at = NULL,
    last_registered_at = timezone('utc', now())
  RETURNING id INTO v_token_id;
  RETURN v_token_id;
END;
$$;

REVOKE ALL ON FUNCTION public.register_customer_push_token(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_customer_push_token(text, text, text) TO authenticated;

COMMIT;
