BEGIN;

DROP POLICY IF EXISTS "No direct client access" ON public.checkout_idempotency;
CREATE POLICY "No direct client access" ON public.checkout_idempotency
  AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "No direct client access" ON public.ai_request_limits;
CREATE POLICY "No direct client access" ON public.ai_request_limits
  AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

COMMIT;
