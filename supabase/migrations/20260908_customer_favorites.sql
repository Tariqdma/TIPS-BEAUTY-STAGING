BEGIN;

CREATE TABLE IF NOT EXISTS public.customer_favorites (
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, product_id)
);

CREATE INDEX IF NOT EXISTS customer_favorites_customer_created_idx
  ON public.customer_favorites (customer_id, created_at DESC);

ALTER TABLE public.customer_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers view own favorites" ON public.customer_favorites;
CREATE POLICY "Customers view own favorites"
  ON public.customer_favorites FOR SELECT TO authenticated
  USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Customers add own favorites" ON public.customer_favorites;
CREATE POLICY "Customers add own favorites"
  ON public.customer_favorites FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "Customers delete own favorites" ON public.customer_favorites;
CREATE POLICY "Customers delete own favorites"
  ON public.customer_favorites FOR DELETE TO authenticated
  USING (customer_id = auth.uid());

REVOKE ALL ON TABLE public.customer_favorites FROM anon;
GRANT SELECT, INSERT, DELETE ON TABLE public.customer_favorites TO authenticated;

COMMIT;
