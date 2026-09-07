BEGIN;

CREATE OR REPLACE FUNCTION public.subscribe_restock(p_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = p_product_id) THEN RAISE EXCEPTION 'Product not found'; END IF;
  INSERT INTO public.restock_subscriptions(customer_id, product_id, is_active, notified_at)
  VALUES (v_user_id, p_product_id, true, NULL)
  ON CONFLICT (customer_id, product_id) DO UPDATE
  SET is_active = true, notified_at = NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.subscribe_restock(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.subscribe_restock(uuid) TO authenticated;

COMMIT;
