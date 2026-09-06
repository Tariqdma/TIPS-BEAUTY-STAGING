BEGIN;

-- Trigger functions are not API endpoints. Remove PostgreSQL's default PUBLIC EXECUTE privilege.
REVOKE ALL ON FUNCTION public.award_order_loyalty_points() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.queue_order_notification() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.queue_return_notification() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_product_stock_from_warehouses() FROM PUBLIC;

-- Security helpers and operational functions are callable only after authentication.
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_driver() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.adjust_warehouse_inventory(uuid, uuid, integer, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.transfer_warehouse_stock(uuid, uuid, uuid, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_driver_availability(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_driver_order_status(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_order(text, text, text, text, text, text, jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_driver() TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_warehouse_inventory(uuid, uuid, integer, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_warehouse_stock(uuid, uuid, uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_driver_availability(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_driver_order_status(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_order(text, text, text, text, text, text, jsonb) TO authenticated;

COMMIT;
