BEGIN;

-- Previous migrations had direct role grants from deployment defaults.
-- These functions are invoked only by database triggers and must not be REST endpoints.
REVOKE ALL ON FUNCTION public.award_order_loyalty_points() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.queue_order_notification() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.queue_return_notification() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_product_stock_from_warehouses() FROM anon, authenticated;

COMMIT;
