BEGIN;

-- Customer-specific review actions must not be callable by anonymous sessions.
REVOKE EXECUTE ON FUNCTION public.get_reviewable_order_items() FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_purchased_product_review(uuid, uuid, integer, text, text[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_reviewable_order_items() TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_purchased_product_review(uuid, uuid, integer, text, text[]) TO authenticated;

COMMIT;
