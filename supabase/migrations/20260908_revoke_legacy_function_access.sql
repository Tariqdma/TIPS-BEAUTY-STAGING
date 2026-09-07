BEGIN;

-- Internal policy helpers do not need an anonymous API surface.
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
REVOKE ALL ON FUNCTION public.is_driver() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_driver() TO authenticated;

-- Replaced by checkout_order_safe/checkout_order_with_growth with an idempotency key.
REVOKE ALL ON FUNCTION public.create_order(text,text,text,text,text,text,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.checkout_order(text,text,text,text,text,text,jsonb,text,integer) FROM PUBLIC, anon, authenticated;

COMMIT;
