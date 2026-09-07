BEGIN;

CREATE OR REPLACE FUNCTION public.award_order_loyalty_points()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_points integer; v_rate numeric; v_multiplier numeric := 1; v_lifetime integer; v_tier text;
BEGIN
  IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered' THEN
    SELECT COALESCE(points_per_1000, 0) INTO v_rate FROM public.loyalty_settings WHERE id = true;
    SELECT COALESCE(loyalty_lifetime_points, 0) INTO v_lifetime FROM public.profiles WHERE id = NEW.customer_id FOR UPDATE;
    SELECT id, points_multiplier INTO v_tier, v_multiplier FROM public.loyalty_tiers WHERE is_active AND minimum_lifetime_points <= v_lifetime ORDER BY minimum_lifetime_points DESC LIMIT 1;
    v_points := floor(GREATEST(NEW.total - NEW.shipping_fee, 0) / 1000 * v_rate * COALESCE(v_multiplier, 1));
    IF v_points > 0 THEN
      INSERT INTO public.loyalty_ledger(customer_id, order_id, points_delta, event_type, note)
      VALUES (NEW.customer_id, NEW.id, v_points, 'earn', 'نقاط مكتسبة من طلب مكتمل') ON CONFLICT DO NOTHING;
      IF FOUND THEN
        SELECT id INTO v_tier FROM public.loyalty_tiers WHERE is_active AND minimum_lifetime_points <= v_lifetime + v_points ORDER BY minimum_lifetime_points DESC LIMIT 1;
        UPDATE public.profiles SET beauty_points = COALESCE(beauty_points, 0) + v_points, loyalty_lifetime_points = COALESCE(loyalty_lifetime_points, 0) + v_points, loyalty_tier = COALESCE(v_tier, 'bronze') WHERE id = NEW.customer_id;
        NEW.points_earned := v_points;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.checkout_order_with_growth(
  p_customer_name text, p_phone text, p_shipping_address text, p_city text, p_state text,
  p_payment_method text, p_items jsonb, p_coupon_code text DEFAULT NULL, p_points_to_redeem integer DEFAULT 0,
  p_referral_code text DEFAULT NULL, p_affiliate_code text DEFAULT NULL
)
RETURNS TABLE(order_id uuid, order_number text, total numeric, shipping_fee numeric, discount_amount numeric, points_discount numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_order record; v_user uuid := auth.uid(); v_referrer uuid; v_affiliate uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NULLIF(trim(COALESCE(p_referral_code, '')), '') IS NOT NULL THEN
    SELECT id INTO v_referrer FROM public.profiles WHERE referral_code = upper(trim(p_referral_code)) AND id <> v_user;
    IF v_referrer IS NULL THEN RAISE EXCEPTION 'Invalid referral code'; END IF;
  END IF;
  IF NULLIF(trim(COALESCE(p_affiliate_code, '')), '') IS NOT NULL THEN
    SELECT id INTO v_affiliate FROM public.affiliate_profiles WHERE code = upper(trim(p_affiliate_code)) AND status = 'active' AND customer_id <> v_user;
    IF v_affiliate IS NULL THEN RAISE EXCEPTION 'Invalid affiliate code'; END IF;
  END IF;
  SELECT * INTO v_order FROM public.checkout_order(p_customer_name, p_phone, p_shipping_address, p_city, p_state, p_payment_method, p_items, p_coupon_code, p_points_to_redeem);
  UPDATE public.orders SET referral_code = NULLIF(upper(trim(COALESCE(p_referral_code, ''))), ''), referral_referrer_id = v_referrer, affiliate_code = NULLIF(upper(trim(COALESCE(p_affiliate_code, ''))), ''), affiliate_id = v_affiliate WHERE id = v_order.order_id;
  IF v_referrer IS NOT NULL THEN UPDATE public.profiles SET referred_by = v_referrer WHERE id = v_user AND referred_by IS NULL; END IF;
  RETURN QUERY SELECT v_order.order_id, v_order.order_number, v_order.total, v_order.shipping_fee, v_order.discount_amount, v_order.points_discount;
END;
$$;

CREATE OR REPLACE FUNCTION public.award_growth_rewards()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_reward_id uuid; v_affiliate public.affiliate_profiles%ROWTYPE; v_commission numeric;
BEGIN
  IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered' THEN
    IF NEW.referral_referrer_id IS NOT NULL THEN
      INSERT INTO public.referral_rewards(referrer_id, referred_customer_id, order_id, points_awarded, status)
      VALUES (NEW.referral_referrer_id, NEW.customer_id, NEW.id, 100, 'available')
      ON CONFLICT (referred_customer_id) DO NOTHING RETURNING id INTO v_reward_id;
      IF v_reward_id IS NOT NULL THEN
        UPDATE public.profiles SET beauty_points = COALESCE(beauty_points, 0) + 100 WHERE id = NEW.referral_referrer_id;
        INSERT INTO public.loyalty_ledger(customer_id, order_id, points_delta, event_type, note) VALUES (NEW.referral_referrer_id, NEW.id, 100, 'referral_bonus', 'مكافأة إحالة عميلة جديدة');
        PERFORM public.create_customer_notification(NEW.referral_referrer_id, 'referral_reward', 'مكافأة إحالة جديدة', 'حصلتِ على 100 نقطة جمال بعد اكتمال أول طلب من عميلتك المُحالة.', NEW.id, NULL, jsonb_build_object('url', '/referrals'));
      END IF;
    END IF;
    IF NEW.affiliate_id IS NOT NULL THEN
      SELECT * INTO v_affiliate FROM public.affiliate_profiles WHERE id = NEW.affiliate_id AND status = 'active';
      IF FOUND THEN
        v_commission := round(GREATEST(NEW.total - NEW.shipping_fee, 0) * v_affiliate.commission_rate / 100, 2);
        INSERT INTO public.affiliate_commissions(affiliate_id, customer_id, order_id, commission_rate, commission_amount, status)
        VALUES (v_affiliate.id, NEW.customer_id, NEW.id, v_affiliate.commission_rate, v_commission, 'pending') ON CONFLICT (order_id) DO NOTHING;
        PERFORM public.create_customer_notification(v_affiliate.customer_id, 'affiliate_commission', 'عمولة جديدة معلقة', 'تم تسجيل عمولة بقيمة ' || to_char(v_commission, 'FM999G999G990D00') || ' ج.س بعد اكتمال طلب عبر رابطك.', NEW.id, NULL, jsonb_build_object('url', '/affiliate'));
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS orders_award_growth_rewards ON public.orders;
CREATE TRIGGER orders_award_growth_rewards AFTER UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.award_growth_rewards();

CREATE OR REPLACE FUNCTION public.submit_affiliate_application(p_display_name text, p_payout_method text DEFAULT NULL, p_payout_details text DEFAULT NULL)
RETURNS public.affiliate_profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_user uuid := auth.uid(); v_profile public.affiliate_profiles%ROWTYPE; v_code text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_display_name IS NULL OR length(trim(p_display_name)) < 2 THEN RAISE EXCEPTION 'Display name is required'; END IF;
  v_code := 'TIPSA' || upper(substr(replace(v_user::text, '-', ''), 1, 7));
  INSERT INTO public.affiliate_profiles(customer_id, display_name, code, status, payout_method, payout_details)
  VALUES (v_user, trim(p_display_name), v_code, 'pending', NULLIF(trim(p_payout_method), ''), NULLIF(trim(p_payout_details), ''))
  ON CONFLICT (customer_id) DO UPDATE SET display_name = EXCLUDED.display_name, payout_method = EXCLUDED.payout_method, payout_details = EXCLUDED.payout_details, updated_at = timezone('utc', now())
  RETURNING * INTO v_profile;
  RETURN v_profile;
END;
$$;
CREATE OR REPLACE FUNCTION public.set_affiliate_status(p_affiliate_id uuid, p_status text, p_commission_rate numeric DEFAULT NULL, p_admin_note text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  IF p_status NOT IN ('pending', 'active', 'suspended', 'rejected') THEN RAISE EXCEPTION 'Unsupported affiliate status'; END IF;
  UPDATE public.affiliate_profiles SET status = p_status, commission_rate = COALESCE(p_commission_rate, commission_rate), admin_note = NULLIF(trim(p_admin_note), ''), approved_by = CASE WHEN p_status = 'active' THEN auth.uid() ELSE approved_by END, approved_at = CASE WHEN p_status = 'active' THEN timezone('utc', now()) ELSE approved_at END, updated_at = timezone('utc', now()) WHERE id = p_affiliate_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Affiliate application not found'; END IF;
  RETURN p_status;
END;
$$;
CREATE OR REPLACE FUNCTION public.review_affiliate_commission(p_commission_id uuid, p_status text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  IF p_status NOT IN ('approved', 'paid', 'reversed') THEN RAISE EXCEPTION 'Unsupported commission status'; END IF;
  UPDATE public.affiliate_commissions SET status = p_status, approved_by = auth.uid(), approved_at = CASE WHEN p_status IN ('approved', 'paid') THEN timezone('utc', now()) ELSE approved_at END, paid_at = CASE WHEN p_status = 'paid' THEN timezone('utc', now()) ELSE paid_at END WHERE id = p_commission_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Commission not found'; END IF;
  RETURN p_status;
END;
$$;

REVOKE ALL ON FUNCTION public.award_growth_rewards() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.checkout_order_with_growth(text, text, text, text, text, text, jsonb, text, integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.checkout_order_with_growth(text, text, text, text, text, text, jsonb, text, integer, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.submit_affiliate_application(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_affiliate_application(text, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.set_affiliate_status(uuid, text, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_affiliate_status(uuid, text, numeric, text) TO authenticated;
REVOKE ALL ON FUNCTION public.review_affiliate_commission(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_affiliate_commission(uuid, text) TO authenticated;

COMMIT;
