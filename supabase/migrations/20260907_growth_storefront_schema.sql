BEGIN;

CREATE TABLE IF NOT EXISTS public.storefront_banners (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  title_ar text NOT NULL,
  subtitle_ar text,
  image_url text,
  action_type text NOT NULL DEFAULT 'collection' CHECK (action_type IN ('collection', 'category', 'product', 'url', 'none')),
  action_value text,
  display_order integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CHECK (ends_at IS NULL OR ends_at >= starts_at)
);
CREATE INDEX IF NOT EXISTS storefront_banners_active_idx ON public.storefront_banners(display_order) WHERE is_active;

CREATE TABLE IF NOT EXISTS public.storefront_collections (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  name_ar text NOT NULL,
  description_ar text,
  icon text NOT NULL DEFAULT 'auto-awesome',
  rule_type text NOT NULL CHECK (rule_type IN ('manual', 'newest', 'best_sellers', 'discount', 'price_under', 'category')),
  rule_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  display_order integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);
CREATE TABLE IF NOT EXISTS public.storefront_collection_products (
  collection_id uuid NOT NULL REFERENCES public.storefront_collections(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  display_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (collection_id, product_id)
);
CREATE INDEX IF NOT EXISTS storefront_collection_products_order_idx ON public.storefront_collection_products(collection_id, display_order);

INSERT INTO public.storefront_collections (slug, name_ar, description_ar, icon, rule_type, rule_config, display_order)
VALUES
  ('tips-picks', 'اختيارات تيبس', 'منتجات نوصي بها لكِ', 'auto-awesome', 'manual', '{}'::jsonb, 10),
  ('best-sellers', 'الأكثر طلباً', 'الأكثر شراءً من عميلات تيبس', 'local-fire-department', 'best_sellers', jsonb_build_object('days', 60), 20),
  ('new-arrivals', 'وصل حديثاً', 'أحدث ما وصل إلى تيبس بيوتي', 'new-releases', 'newest', jsonb_build_object('limit', 12), 30),
  ('today-deals', 'عروض اليوم', 'منتجات عليها خصومات فعالة الآن', 'sell', 'discount', jsonb_build_object('minimum_discount', 1), 40),
  ('under-10000', 'تحت 10,000 ج.س', 'خيارات جميلة تناسب الميزانية', 'savings', 'price_under', jsonb_build_object('price', 10000), 50)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.customer_notifications (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  type text NOT NULL,
  title_ar text NOT NULL,
  body_ar text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  read_at timestamptz
);
CREATE INDEX IF NOT EXISTS customer_notifications_inbox_idx ON public.customer_notifications(customer_id, is_read, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS customer_notifications_order_event_unique ON public.customer_notifications(order_id, type) WHERE order_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.restock_subscriptions (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  notified_at timestamptz,
  UNIQUE (customer_id, product_id)
);
CREATE INDEX IF NOT EXISTS restock_subscriptions_product_active_idx ON public.restock_subscriptions(product_id) WHERE is_active;

CREATE TABLE IF NOT EXISTS public.loyalty_tiers (
  id text PRIMARY KEY CHECK (id IN ('bronze', 'silver', 'gold')),
  name_ar text NOT NULL,
  minimum_lifetime_points integer NOT NULL CHECK (minimum_lifetime_points >= 0),
  points_multiplier numeric NOT NULL DEFAULT 1 CHECK (points_multiplier >= 1),
  benefits_ar text,
  display_order integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);
INSERT INTO public.loyalty_tiers (id, name_ar, minimum_lifetime_points, points_multiplier, benefits_ar, display_order)
VALUES ('bronze', 'برونزي', 0, 1, 'نقاط جمال على كل طلب مكتمل', 10), ('silver', 'فضي', 500, 1.10, 'زيادة 10% في نقاط الجمال', 20), ('gold', 'ذهبي', 1500, 1.25, 'زيادة 25% في نقاط الجمال وأولوية العروض', 30)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS loyalty_lifetime_points integer NOT NULL DEFAULT 0 CHECK (loyalty_lifetime_points >= 0),
  ADD COLUMN IF NOT EXISTS loyalty_tier text NOT NULL DEFAULT 'bronze' REFERENCES public.loyalty_tiers(id),
  ADD COLUMN IF NOT EXISTS referral_code text,
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_unique_idx ON public.profiles(referral_code) WHERE referral_code IS NOT NULL;
UPDATE public.profiles SET referral_code = 'TIPS' || upper(substr(replace(id::text, '-', ''), 1, 8)) WHERE referral_code IS NULL;

CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  points_awarded integer NOT NULL DEFAULT 100 CHECK (points_awarded > 0),
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('pending', 'available', 'reversed')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (referred_customer_id)
);

CREATE TABLE IF NOT EXISTS public.affiliate_profiles (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  customer_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'rejected')),
  commission_rate numeric NOT NULL DEFAULT 3 CHECK (commission_rate >= 0 AND commission_rate <= 100),
  minimum_payout numeric NOT NULL DEFAULT 5000 CHECK (minimum_payout >= 0),
  payout_method text,
  payout_details text,
  admin_note text,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);
CREATE TABLE IF NOT EXISTS public.affiliate_commissions (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliate_profiles(id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  commission_rate numeric NOT NULL CHECK (commission_rate >= 0),
  commission_amount numeric NOT NULL CHECK (commission_amount >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'reversed')),
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);
CREATE INDEX IF NOT EXISTS affiliate_commissions_affiliate_status_idx ON public.affiliate_commissions(affiliate_id, status, created_at DESC);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS referral_code text,
  ADD COLUMN IF NOT EXISTS referral_referrer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS affiliate_code text,
  ADD COLUMN IF NOT EXISTS affiliate_id uuid REFERENCES public.affiliate_profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS orders_referral_referrer_idx ON public.orders(referral_referrer_id) WHERE referral_referrer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_affiliate_idx ON public.orders(affiliate_id) WHERE affiliate_id IS NOT NULL;

ALTER TABLE public.loyalty_ledger DROP CONSTRAINT IF EXISTS loyalty_ledger_event_type_check;
ALTER TABLE public.loyalty_ledger ADD CONSTRAINT loyalty_ledger_event_type_check CHECK (event_type IN ('earn', 'redeem', 'adjustment', 'refund_reversal', 'referral_bonus'));

ALTER TABLE public.storefront_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_collection_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restock_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view active storefront banners" ON public.storefront_banners FOR SELECT TO anon, authenticated USING (is_active AND starts_at <= timezone('utc', now()) AND (ends_at IS NULL OR ends_at >= timezone('utc', now())));
CREATE POLICY "Admins manage storefront banners" ON public.storefront_banners FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Public view active storefront collections" ON public.storefront_collections FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY "Admins manage storefront collections" ON public.storefront_collections FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Public view active collection products" ON public.storefront_collection_products FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.storefront_collections c WHERE c.id = collection_id AND c.is_active));
CREATE POLICY "Admins manage collection products" ON public.storefront_collection_products FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Customers view own notifications" ON public.customer_notifications FOR SELECT TO authenticated USING (customer_id = (SELECT auth.uid()));
CREATE POLICY "Customers update own notifications" ON public.customer_notifications FOR UPDATE TO authenticated USING (customer_id = (SELECT auth.uid())) WITH CHECK (customer_id = (SELECT auth.uid()));
CREATE POLICY "Admins view notifications" ON public.customer_notifications FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Customers manage restock subscriptions" ON public.restock_subscriptions FOR ALL TO authenticated USING (customer_id = (SELECT auth.uid())) WITH CHECK (customer_id = (SELECT auth.uid()));
CREATE POLICY "Admins view restock subscriptions" ON public.restock_subscriptions FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Public view active loyalty tiers" ON public.loyalty_tiers FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY "Admins manage loyalty tiers" ON public.loyalty_tiers FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Customers view own referral rewards" ON public.referral_rewards FOR SELECT TO authenticated USING (referrer_id = (SELECT auth.uid()));
CREATE POLICY "Admins manage referral rewards" ON public.referral_rewards FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Customers view own affiliate profile" ON public.affiliate_profiles FOR SELECT TO authenticated USING (customer_id = (SELECT auth.uid()));
CREATE POLICY "Admins manage affiliate profiles" ON public.affiliate_profiles FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Affiliates view own commissions" ON public.affiliate_commissions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.affiliate_profiles ap WHERE ap.id = affiliate_id AND ap.customer_id = (SELECT auth.uid())));
CREATE POLICY "Admins manage affiliate commissions" ON public.affiliate_commissions FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

REVOKE ALL ON TABLE public.customer_notifications, public.restock_subscriptions, public.referral_rewards, public.affiliate_profiles, public.affiliate_commissions FROM anon;
GRANT SELECT ON TABLE public.storefront_banners, public.storefront_collections, public.storefront_collection_products, public.loyalty_tiers TO anon, authenticated;

COMMIT;
