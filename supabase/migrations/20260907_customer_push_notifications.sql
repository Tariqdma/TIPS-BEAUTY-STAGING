BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.customer_push_tokens (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expo_push_token text NOT NULL UNIQUE,
  platform text NOT NULL CHECK (platform IN ('ios', 'android')),
  device_name text,
  is_active boolean NOT NULL DEFAULT true,
  last_registered_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  invalidated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);
CREATE INDEX IF NOT EXISTS customer_push_tokens_customer_active_idx ON public.customer_push_tokens(customer_id) WHERE is_active;

CREATE TABLE IF NOT EXISTS public.push_notification_deliveries (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  push_token_id uuid NOT NULL REFERENCES public.customer_push_tokens(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('shipped', 'delivered')),
  status text NOT NULL CHECK (status IN ('submitted', 'failed', 'delivered')),
  expo_ticket_id text,
  error_message text,
  response_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT unique_order_push_event_per_device UNIQUE (order_id, event_type, push_token_id)
);
CREATE INDEX IF NOT EXISTS push_deliveries_receipt_idx ON public.push_notification_deliveries(expo_ticket_id) WHERE expo_ticket_id IS NOT NULL;

ALTER TABLE public.customer_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_notification_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Customers manage own push tokens" ON public.customer_push_tokens;
CREATE POLICY "Customers manage own push tokens" ON public.customer_push_tokens FOR ALL TO authenticated
  USING (customer_id = (SELECT auth.uid())) WITH CHECK (customer_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "Admins manage customer push tokens" ON public.customer_push_tokens;
CREATE POLICY "Admins manage customer push tokens" ON public.customer_push_tokens FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admins view push deliveries" ON public.push_notification_deliveries;
CREATE POLICY "Admins view push deliveries" ON public.push_notification_deliveries FOR SELECT TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.trigger_order_status_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_headers jsonb;
  v_authorization text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status OR NEW.status NOT IN ('shipped', 'delivered') THEN RETURN NEW; END IF;
  v_headers := COALESCE(NULLIF(current_setting('request.headers', true), ''), '{}')::jsonb;
  v_authorization := v_headers ->> 'authorization';
  IF v_authorization IS NULL OR v_authorization = '' THEN RETURN NEW; END IF;

  PERFORM net.http_post(
    url := 'https://eaomyiihsuikinkdhwzy.supabase.co/functions/v1/order-status-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', v_authorization),
    body := jsonb_build_object('order_id', NEW.id, 'status', NEW.status),
    timeout_milliseconds := 5000
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_order_delivery_status_push ON public.orders;
CREATE TRIGGER on_order_delivery_status_push
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.trigger_order_status_push();

REVOKE ALL ON FUNCTION public.trigger_order_status_push() FROM PUBLIC, anon, authenticated;

COMMIT;
