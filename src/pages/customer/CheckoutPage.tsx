import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { supabase } from '../../lib/supabase';
import { PaymentMethod } from '../../types';
import { CreditCard, Wallet, Banknote } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const CheckoutPage: React.FC = () => {
    const { cart, cartCount, clearCart } = useStore();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        city: 'الخرطوم', // Default
        paymentMethod: 'COD' as PaymentMethod
    });

    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                name: user.user_metadata.full_name || '',
                phone: user.user_metadata.phone || ''
            }));
        }
    }, [user]);

    const subtotal = cart.reduce((sum, item) => sum + (item.discountedPrice || item.price) * item.quantity, 0);
    const shipping = 1500;
    const total = subtotal + shipping;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            alert('يرجى تسجيل الدخول لإتمام الطلب');
            navigate('/login', { state: { from: window.location } });
            return;
        }

        setLoading(true);

        try {
            const { data, error } = await supabase.rpc('create_order', {
                p_customer_name: formData.name,
                p_phone: formData.phone,
                p_shipping_address: formData.address,
                p_city: formData.city,
                p_state: '',
                p_payment_method: formData.paymentMethod,
                p_items: cart.map(item => ({ id: item.id, quantity: item.quantity }))
            });

            if (error) throw error;

            const createdOrder = Array.isArray(data) ? data[0] : data;
            if (!createdOrder?.order_number) throw new Error('لم يتم إنشاء رقم الطلب');
            clearCart();
            navigate(`/track-order?order=${encodeURIComponent(createdOrder.order_number)}`);
        } catch (error: any) {
            console.error(error);
            alert('فشل إنشاء الطلب: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (cartCount === 0) return <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-gray-100 m-4">السلة فارغة</div>;

    const paymentMethods = [
        { id: 'COD', label: 'الدفع عند الاستلام', icon: Banknote, desc: 'ادفع نقداً عند وصول المندوب' },
        { id: 'Fawry', label: 'فوري (Fawry)', icon: Wallet, desc: 'الدفع الآمن عبر فوري' },
        { id: 'Mychashi', label: 'ماي كاشي (Mychashi)', icon: CreditCard, desc: 'الدفع الإلكتروني السريع' },
    ];

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-8">إتمام الطلب</h1>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                        <h2 className="font-bold border-b border-gray-50 pb-2">بيانات التوصيل</h2>
                        <div>
                            <label className="text-sm font-bold text-gray-700 block mb-1">الاسم بالكامل</label>
                            <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-brand-blue" />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-gray-700 block mb-1">رقم الهاتف</label>
                            <input required type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-brand-blue" />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-gray-700 block mb-1">المدينة</label>
                            <select value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-brand-blue">
                                <option value="الخرطوم">الخرطوم</option>
                                <option value="بحري">بحري</option>
                                <option value="أم درمان">أم درمان</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-bold text-gray-700 block mb-1">العنوان بالتفصيل</label>
                            <textarea required value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-brand-blue" rows={3} />
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                        <h2 className="font-bold border-b border-gray-50 pb-2">طريقة الدفع</h2>
                        <div className="space-y-3">
                            {paymentMethods.map((pm) => (
                                <label key={pm.id} className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${formData.paymentMethod === pm.id ? 'border-brand-blue bg-brand-blue-soft' : 'border-gray-200 hover:bg-gray-50'}`}>
                                    <input
                                        type="radio"
                                        name="payment"
                                        value={pm.id}
                                        checked={formData.paymentMethod === pm.id}
                                        onChange={() => setFormData({ ...formData, paymentMethod: pm.id as PaymentMethod })}
                                        className="w-4 h-4 text-brand-blue focus:ring-brand-blue"
                                    />
                                    <div className={`p-2 rounded-lg ${formData.paymentMethod === pm.id ? 'bg-white' : 'bg-gray-100'}`}>
                                        <pm.icon className={`w-6 h-6 ${formData.paymentMethod === pm.id ? 'text-brand-blue' : 'text-gray-500'}`} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800">{pm.label}</p>
                                        <p className="text-xs text-gray-500">{pm.desc}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-brand-blue hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                    >
                        {loading ? 'جاري المعالجة...' : `تأكيد الطلب (${total.toLocaleString()} ج.س)`}
                    </button>
                </form>

                {/* Summary */}
                <div className="h-fit bg-gray-50 p-6 rounded-2xl border border-gray-200 sticky top-24">
                    <h3 className="font-bold text-gray-800 mb-4">ملخص الطلب ({cartCount} منتجات)</h3>
                    <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2">
                        {cart.map((item) => (
                            <div key={`${item.id}-${item.selectedVariantId}`} className="flex gap-3 text-sm">
                                <img src={item.image} className="w-12 h-12 rounded-lg object-cover" alt="" />
                                <div className="flex-1">
                                    <p className="font-bold text-gray-800">{item.name_ar}</p>
                                    <div className="flex justify-between mt-1">
                                        <span className="text-gray-500">x{item.quantity}</span>
                                        <span className="font-medium">{(item.discountedPrice || item.price).toLocaleString()} ج.س</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="space-y-2 border-t border-gray-200 pt-4">
                        <div className="flex justify-between text-gray-600">
                            <span>المجموع</span>
                            <span>{subtotal.toLocaleString()} ج.س</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                            <span>التوصيل</span>
                            <span>{shipping.toLocaleString()} ج.س</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg text-gray-800 border-top pt-2">
                            <span>الإجمالي</span>
                            <span className="text-brand-blue">{total.toLocaleString()} ج.س</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
