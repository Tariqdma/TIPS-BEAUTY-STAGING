import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { supabase } from '../../lib/supabase';
import { CreditCard, Gift, Landmark, Loader2, Ticket, Wallet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type PaymentMethod = {
    code: 'COD' | 'BANK_TRANSFER' | 'Fawry' | 'Mychashi';
    name_ar: string;
    description_ar: string | null;
    requires_proof: boolean;
    account_details: Record<string, string> | null;
};

export const CheckoutPage: React.FC = () => {
    const { cart, cartCount, clearCart } = useStore();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [methods, setMethods] = useState<PaymentMethod[]>([]);
    const [points, setPoints] = useState(0);
    const [formData, setFormData] = useState({ name: '', phone: '', address: '', city: 'الخرطوم', paymentMethod: 'COD' as PaymentMethod['code'], couponCode: '', pointsToRedeem: '' });

    useEffect(() => {
        void supabase.from('payment_methods').select('code,name_ar,description_ar,requires_proof,account_details').order('display_order').then(({ data }) => {
            const available = (data || []) as PaymentMethod[];
            setMethods(available);
            if (available.length && !available.some((method) => method.code === formData.paymentMethod)) setFormData((current) => ({ ...current, paymentMethod: available[0].code }));
        });
    }, []);

    useEffect(() => {
        if (!user) return;
        setFormData((current) => ({ ...current, name: user.user_metadata.full_name || '', phone: user.user_metadata.phone || '' }));
        void supabase.from('profiles').select('beauty_points').eq('id', user.id).maybeSingle().then(({ data }) => setPoints(Number(data?.beauty_points || 0)));
    }, [user]);

    const subtotal = useMemo(() => cart.reduce((sum, item) => sum + (item.discountedPrice || item.price) * item.quantity, 0), [cart]);
    const shipping = 1500;
    const selectedMethod = methods.find((method) => method.code === formData.paymentMethod);

    const methodIcon = (code: PaymentMethod['code']) => code === 'COD' ? Wallet : code === 'BANK_TRANSFER' ? Landmark : CreditCard;

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!user) { navigate('/login', { state: { from: window.location } }); return; }
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('checkout_order', {
                p_customer_name: formData.name,
                p_phone: formData.phone,
                p_shipping_address: formData.address,
                p_city: formData.city,
                p_state: '',
                p_payment_method: formData.paymentMethod,
                p_items: cart.map((item) => ({ id: item.id, quantity: item.quantity })),
                p_coupon_code: formData.couponCode.trim() || null,
                p_points_to_redeem: Number(formData.pointsToRedeem || 0),
            });
            if (error) throw error;
            const order = Array.isArray(data) ? data[0] : data;
            if (!order?.order_number || !order?.order_id) throw new Error('لم يتم إنشاء رقم الطلب');
            clearCart();
            if (selectedMethod?.requires_proof) navigate(`/payment-proof?order=${encodeURIComponent(order.order_id)}&number=${encodeURIComponent(order.order_number)}`);
            else navigate(`/track-order?order=${encodeURIComponent(order.order_number)}`);
        } catch (error: any) {
            alert(`فشل إنشاء الطلب: ${error.message || 'يرجى المحاولة مرة أخرى'}`);
        } finally { setLoading(false); }
    };

    if (cartCount === 0) return <div className="m-4 rounded-xl border border-gray-100 bg-white p-8 text-center shadow-sm">السلة فارغة</div>;

    return <div className="mx-auto max-w-5xl p-4 md:p-8"><div className="mb-8"><h1 className="text-2xl font-bold text-gray-800">إتمام الطلب</h1><p className="mt-1 text-sm text-gray-500">السعر والمخزون والخصومات تُراجع بأمان عند تأكيد الطلب.</p></div><div className="grid gap-8 md:grid-cols-2"><form onSubmit={handleSubmit} className="space-y-6"><section className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"><h2 className="border-b border-gray-50 pb-2 font-bold">بيانات التوصيل</h2><input required value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} placeholder="الاسم بالكامل" className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 outline-none focus:ring-2 focus:ring-brand-blue"/><input required type="tel" value={formData.phone} onChange={(event) => setFormData({ ...formData, phone: event.target.value })} placeholder="رقم الهاتف" className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 outline-none focus:ring-2 focus:ring-brand-blue"/><select value={formData.city} onChange={(event) => setFormData({ ...formData, city: event.target.value })} className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 outline-none focus:ring-2 focus:ring-brand-blue"><option value="الخرطوم">الخرطوم</option><option value="بحري">بحري</option><option value="أم درمان">أم درمان</option></select><textarea required value={formData.address} onChange={(event) => setFormData({ ...formData, address: event.target.value })} placeholder="العنوان بالتفصيل" rows={3} className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 outline-none focus:ring-2 focus:ring-brand-blue"/></section><section className="space-y-3 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"><h2 className="border-b border-gray-50 pb-2 font-bold">طريقة الدفع</h2>{methods.length ? methods.map((method) => { const Icon = methodIcon(method.code); return <label key={method.code} className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-all ${formData.paymentMethod === method.code ? 'border-brand-blue bg-brand-blue-soft' : 'border-gray-200 hover:bg-gray-50'}`}><input type="radio" checked={formData.paymentMethod === method.code} onChange={() => setFormData({ ...formData, paymentMethod: method.code })}/><Icon className="h-6 w-6 text-brand-blue"/><span><b className="block text-gray-800">{method.name_ar}</b><small className="text-gray-500">{method.description_ar}{method.requires_proof ? ' سيتم طلب إثبات التحويل بعد إنشاء الطلب.' : ''}</small></span></label>; }) : <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin"/>جارٍ تحميل طرق الدفع...</div>}</section><section className="space-y-3 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-6"><div className="flex items-center gap-2"><Ticket className="h-5 w-5 text-indigo-600"/><h2 className="font-bold">كوبون ونقاط الجمال</h2></div><input value={formData.couponCode} onChange={(event) => setFormData({ ...formData, couponCode: event.target.value.toUpperCase() })} placeholder="أدخل كود الخصم إن وجد" className="w-full rounded-lg border border-indigo-100 bg-white p-3 uppercase outline-none focus:ring-2 focus:ring-brand-blue"/><div className="rounded-xl bg-white p-3 text-sm text-gray-600"><span className="font-bold text-indigo-700">رصيدك: {points.toLocaleString()} نقطة</span><p className="mt-1 text-xs">يُحدد النظام قيمة الخصم بعد التحقق من الرصيد والحد الأدنى.</p></div><input type="number" min="0" max={points} value={formData.pointsToRedeem} onChange={(event) => setFormData({ ...formData, pointsToRedeem: event.target.value })} placeholder="عدد النقاط التي تريدين استبدالها" className="w-full rounded-lg border border-indigo-100 bg-white p-3 outline-none focus:ring-2 focus:ring-brand-blue"/></section><button type="submit" disabled={loading || !methods.length} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue py-4 font-bold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{loading && <Loader2 className="h-5 w-5 animate-spin"/>}{loading ? 'جارٍ تأكيد الطلب...' : 'تأكيد الطلب'}</button></form><aside className="h-fit rounded-2xl border border-gray-200 bg-gray-50 p-6 md:sticky md:top-24"><h3 className="mb-4 font-bold text-gray-800">ملخص الطلب ({cartCount} منتجات)</h3><div className="mb-6 max-h-60 space-y-3 overflow-y-auto pr-2">{cart.map((item) => <div key={`${item.id}-${item.selectedVariantId}`} className="flex gap-3 text-sm"><img src={item.image} className="h-12 w-12 rounded-lg object-cover" alt=""/><div className="flex-1"><p className="font-bold text-gray-800">{item.name_ar}</p><div className="mt-1 flex justify-between"><span className="text-gray-500">x{item.quantity}</span><span>{((item.discountedPrice || item.price) * item.quantity).toLocaleString()} ج.س</span></div></div></div>)}</div><div className="space-y-2 border-t border-gray-200 pt-4 text-sm"><div className="flex justify-between text-gray-600"><span>المجموع التقديري</span><span>{subtotal.toLocaleString()} ج.س</span></div><div className="flex justify-between text-gray-600"><span>التوصيل التقديري</span><span>{shipping.toLocaleString()} ج.س</span></div><div className="flex justify-between border-t pt-2 text-lg font-bold text-gray-800"><span>قبل الخصومات</span><span className="text-brand-blue">{(subtotal + shipping).toLocaleString()} ج.س</span></div><p className="pt-2 text-xs text-gray-400">يظهر الإجمالي النهائي بعد اعتماد الكوبون والنقاط في النظام.</p></div></aside></div></div>;
};
