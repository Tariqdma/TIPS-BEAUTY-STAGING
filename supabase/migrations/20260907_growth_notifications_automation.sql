BEGIN;

CREATE OR REPLACE FUNCTION public.create_customer_notification(
  p_customer_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_order_id uuid DEFAULT NULL,
  p_product_id uuid DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.customer_notifications(customer_id, type, title_ar, body_ar, order_id, product_id, payload)
  VALUES (p_customer_id, p_type, p_title, p_body, p_order_id, p_product_id, COALESCE(p_payload, '{}'::jsonb))
  ON CONFLICT (order_id, type) WHERE order_id IS NOT NULL DO NOTHING
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_profile_referral_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL OR trim(NEW.referral_code) = '' THEN
    NEW.referral_code := 'TIPS' || upper(substr(replace(NEW.id::text, '-', ''), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS profiles_create_referral_code ON public.profiles;
CREATE TRIGGER profiles_create_referral_code BEFORE INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.create_profile_referral_code();

CREATE OR REPLACE FUNCTION public.order_create_internal_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE v_type text; v_title text; v_body text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_type := 'order_created'; v_title := 'تم استلام طلبك'; v_body := 'تم استلام طلبك رقم ' || COALESCE(NEW.order_number, '') || ' بنجاح.';
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    v_type := 'order_status_' || NEW.status;
    v_title := CASE NEW.status WHEN 'confirmed' THEN 'تم تأكيد الطلب' WHEN 'preparing' THEN 'طلبك قيد التجهيز' WHEN 'shipped' THEN 'طلبك في الطريق' WHEN 'delivered' THEN 'تم توصيل طلبك' WHEN 'cancelled' THEN 'تم إلغاء الطلب' WHEN 'delivery_failed' THEN 'تعذر تسليم الطلب' ELSE 'تم تحديث الطلب' END;
    v_body := CASE NEW.status WHEN 'confirmed' THEN 'تم تأكيد طلبك رقم ' || NEW.order_number || '.' WHEN 'preparing' THEN 'يجري تجهيز طلبك رقم ' || NEW.order_number || '.' WHEN 'shipped' THEN 'طلبك رقم ' || NEW.order_number || ' في الطريق إليك.' WHEN 'delivered' THEN 'تم توصيل طلبك رقم ' || NEW.order_number || '. شكراً لاختيارك تيبس بيوتي.' WHEN 'cancelled' THEN 'تم إلغاء طلبك رقم ' || NEW.order_number || '.' WHEN 'delivery_failed' THEN 'تعذر تسليم طلبك رقم ' || NEW.order_number || '. تواصلي معنا للمساعدة.' ELSE 'تم تحديث طلبك رقم ' || NEW.order_number || '.' END;
  ELSIF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    v_type := 'payment_' || NEW.payment_status; v_title := 'تحديث حالة الدفع'; v_body := 'تم تحديث حالة دفع طلبك رقم ' || NEW.order_number || '.';
  ELSE
    RETURN NEW;
  END IF;
  PERFORM public.create_customer_notification(NEW.customer_id, v_type, v_title, v_body, NEW.id, NULL, jsonb_build_object('order_number', NEW.order_number, 'status', NEW.status, 'payment_status', NEW.payment_status, 'url', '/orders'));
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS orders_create_internal_notifications ON public.orders;
CREATE TRIGGER orders_create_internal_notifications AFTER INSERT OR UPDATE OF status, payment_status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.order_create_internal_notification();

CREATE OR REPLACE FUNCTION public.notify_restock_subscribers(p_product_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE v_product_name text;
BEGIN
  SELECT name_ar INTO v_product_name FROM public.products WHERE id = p_product_id;
  IF v_product_name IS NULL THEN RETURN; END IF;
  INSERT INTO public.customer_notifications(customer_id, product_id, type, title_ar, body_ar, payload)
  SELECT rs.customer_id, p_product_id, 'back_in_stock', 'المنتج عاد للمخزون', v_product_name || ' أصبح متوفراً الآن. أسرعي قبل نفاد الكمية.', jsonb_build_object('product_id', p_product_id, 'url', '/product/' || p_product_id::text)
  FROM public.restock_subscriptions rs WHERE rs.product_id = p_product_id AND rs.is_active;
  UPDATE public.restock_subscriptions SET is_active = false, notified_at = timezone('utc', now()) WHERE product_id = p_product_id AND is_active;
END;
$$;
CREATE OR REPLACE FUNCTION public.products_restock_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF COALESCE(OLD.stock, 0) <= 0 AND COALESCE(NEW.stock, 0) > 0 THEN PERFORM public.notify_restock_subscribers(NEW.id); END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS products_notify_restock_subscribers ON public.products;
CREATE TRIGGER products_notify_restock_subscribers AFTER UPDATE OF stock ON public.products FOR EACH ROW EXECUTE FUNCTION public.products_restock_notification();
CREATE OR REPLACE FUNCTION public.inventory_restock_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.quantity > 0 THEN PERFORM public.notify_restock_subscribers(NEW.product_id); END IF;
  ELSIF OLD.quantity <= 0 AND NEW.quantity > 0 THEN
    PERFORM public.notify_restock_subscribers(NEW.product_id);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS warehouse_inventory_notify_restock_subscribers ON public.warehouse_inventory;
CREATE TRIGGER warehouse_inventory_notify_restock_subscribers AFTER INSERT OR UPDATE OF quantity ON public.warehouse_inventory FOR EACH ROW EXECUTE FUNCTION public.inventory_restock_notification();

REVOKE ALL ON FUNCTION public.create_customer_notification(uuid, text, text, text, uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_profile_referral_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.order_create_internal_notification() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_restock_subscribers(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.products_restock_notification() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.inventory_restock_notification() FROM PUBLIC, anon, authenticated;

COMMIT;
