BEGIN;

-- RLS policies invoke this security-definer helper for every role.
-- It returns only the caller's own administrative status and is needed for
-- public storefront rows to evaluate a false admin condition safely.
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

COMMIT;
