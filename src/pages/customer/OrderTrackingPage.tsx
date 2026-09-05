import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Truck, Package, Clock, AlertCircle } from 'lucide-react';
import { CheckCircle } from 'lucide-react';

export const OrderTrackingPage: React.FC = () => {
    const [orderId, setOrderId] = useState('');
    const [order, setOrder] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleTrack = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setOrder(null);

        try {
            // In a real app, maybe search by phone number too for security
            // Here assuming orderId is the UUID
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('id', orderId) // User needs to know the exact UUID? Maybe phone + simple ID is better later
                .single();

            if (error) throw error;
            if (data) setOrder(data);
        } catch (err) {
            setError('لم يتم العثور على طلب بهذا الرقم. يرجى التأكد من الرقم والمحاولة مرة أخرى.');
        } finally {
            setLoading(false);
        }
    };

    const getStatusStep = (status: string) => {
        const steps = ['new', 'confirmed', 'preparing', 'shipped', 'delivered'];
        return steps.indexOf(status) + 1;
    };

    const steps = [
        { id: 'new', label: 'تم الاستلام', icon: Clock },
        { id: 'confirmed', label: 'مؤكد', icon: CheckCircle },
        { id: 'preparing', label: 'جاري التجهيز', icon: Package },
        { id: 'shipped', label: 'خرج للتوصيل', icon: Truck },
        { id: 'delivered', label: 'تم التوصيل', icon: CheckCircle },
    ];

    return (
        <div className="max-w-3xl mx-auto p-8 min-h-[60vh]">
            <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">تتبع طلبك</h1>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-8">
                <form onSubmit={handleTrack} className="flex gap-4">
                    <input
                        type="text"
                        placeholder="أدخل رقم الطلب (UUID)"
                        value={orderId}
                        onChange={e => setOrderId(e.target.value)}
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-6 py-4 outline-none focus:ring-2 focus:ring-brand-blue"
                        required
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-brand-blue hover:bg-blue-700 text-white font-bold px-8 rounded-xl transition-all shadow-lg shadow-blue-200 flex items-center gap-2"
                    >
                        {loading ? '...' : <Search className="w-5 h-5" />}
                        تتبع
                    </button>
                </form>
                {error && (
                    <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        {error}
                    </div>
                )}
            </div>

            {order && (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 animate-fadeIn">
                    <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
                        <div>
                            <p className="text-gray-500 text-sm">رقم الطلب</p>
                            <p className="font-mono font-bold text-gray-800">{order.id.split('-')[0]}...</p>
                        </div>
                        <div className="text-left">
                            <p className="text-gray-500 text-sm">تاريخ الطلب</p>
                            <p className="font-bold text-gray-800">{new Date(order.created_at).toLocaleDateString('ar-EG')}</p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative flex justify-between mb-8 overflow-hidden">
                        {/* Line */}
                        <div className="absolute top-5 left-0 right-0 h-1 bg-gray-100 -z-0">
                            <div
                                className="h-full bg-green-500 transition-all duration-1000"
                                style={{ width: `${(getStatusStep(order.status) / 5) * 100}%` }}
                            ></div>
                        </div>

                        {steps.map((step, idx) => {
                            const isActive = getStatusStep(order.status) > idx;
                            const isCurrent = order.status === step.id;
                            const StepIcon = step.icon;

                            return (
                                <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${isActive || isCurrent ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-200 text-gray-400'
                                        }`}>
                                        <StepIcon className="w-5 h-5" />
                                    </div>
                                    <span className={`text-xs font-bold ${isActive || isCurrent ? 'text-green-600' : 'text-gray-400'}`}>
                                        {step.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl mb-6">
                        <h4 className="font-bold text-gray-800 mb-2">حالة الطلب الحالية:</h4>
                        <p className="text-gray-600">
                            {order.status === 'new' && 'تم استلام طلبك بنجاح وسيتم تأكيده قريباً.'}
                            {order.status === 'confirmed' && 'تم تأكيد الطلب ويجري تجهيزه.'}
                            {order.status === 'preparing' && 'يقوم فريقنا بتجهيز وتغليف طلبك بعناية.'}
                            {order.status === 'shipped' && 'تم تسليم الطلب للمندوب وهو في الطريق إليك.'}
                            {order.status === 'delivered' && 'تم توصيل الطلب. نتمنى أن ينال إعجابك!'}
                        </p>
                    </div>

                    <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
                        <h4 className="font-bold text-gray-800 p-4 border-b border-gray-50">موقع التوصيل (تقديري)</h4>
                        <iframe
                            width="100%"
                            height="300"
                            style={{ border: 0 }}
                            loading="lazy"
                            allowFullScreen
                            src={`https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${encodeURIComponent(order.city + ', ' + order.address)}`}
                        ></iframe>
                        <div className="p-2 text-xs text-center text-gray-400">
                            ملاحظة: الخريطة توضيحية وتعتمد على العنوان المدخل.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
