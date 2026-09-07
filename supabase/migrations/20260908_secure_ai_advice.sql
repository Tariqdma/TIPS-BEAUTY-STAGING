BEGIN;

CREATE TABLE IF NOT EXISTS public.ai_request_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);
CREATE INDEX IF NOT EXISTS ai_request_limits_customer_created_idx ON public.ai_request_limits(customer_id, created_at DESC);
ALTER TABLE public.ai_request_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ai_request_limits FROM PUBLIC, anon, authenticated;

COMMIT;
