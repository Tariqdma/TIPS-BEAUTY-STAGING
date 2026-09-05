import React, { useState, useEffect } from 'react';
import {
    Search, ShoppingBag,
    User
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

export const OrderListPage: React.FC = () => {
    const [orders, setOrders] = useState<any[]>([]);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
            setOrders(data || []);
        } catch (error) {
            console.error('Error fetching orders:', error);
        }
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'new': return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'confirmed': return 'bg-amber-50 text-amber-600 border-amber-100';
            case 'preparing': return 'bg-purple-50 text-purple-600 border-purple-100';
            case 'shipped': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
            case 'delivered': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            default: return 'bg-gray-50 text-gray-600 border-gray-100';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'new': return 'طلب جديد';
            case 'confirmed': return 'تم التأكيد';
            case 'preparing': return 'جاري التجهيز';
            case 'shipped': return 'تم الشحن';
            case 'delivered': return 'تم التوصيل';
            default: return status;
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">إدارة الطلبات</h1>
                    <p className="text-slate-500 font-medium mt-1">إدارة حالات الشحن، السائقين، والدفع</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap gap-3">
                <div className="flex-1 min-w-[300px] relative">
                    <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="البحث برقم الطلب، اسم العميل، أو الهاتف..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-brand-blue outline-none transition-all font-medium text-sm"
                    />
                </div>
                <select className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 font-bold text-sm text-slate-700 outline-none focus:ring-2 focus:ring-brand-blue">
                    <option>كل الحالات</option>
                    <option>جديد</option>
                    <option>جاري التوصيل</option>
                    <option>تم التسليم</option>
                </select>
                <select className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 font-bold text-sm text-slate-700 outline-none focus:ring-2 focus:ring-brand-blue">
                    <option>كل طرق الدفع</option>
                    <option>كاش (COD)</option>
                    <option>أونلاين (Fawry/Mychashi)</option>
                </select>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                        <thead>
                            <tr className="bg-slate-900 border-b border-slate-800">
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">معلومات الطلب</th>
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">العميل</th>
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-center">الحالة</th>
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-center">الدفع</th>
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">السائق</th>
                                <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-left">الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {orders.length > 0 ? orders.map((order) => (
                                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 font-black text-sm">
                                                #{order.id.slice(0, 4)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 text-sm">طلب رقم {order.id.slice(0, 8)}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                                                    {new Date(order.created_at).toLocaleDateString('ar-EG')}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className="font-bold text-slate-900 text-sm">{order.customer_name}</p>
                                        <p className="text-xs text-slate-500 font-medium">{order.customer_phone}</p>
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border ${getStatusStyles(order.status)}`}>
                                            {getStatusLabel(order.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <div className="flex flex-col items-center">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${order.financial_status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {order.financial_status === 'paid' ? 'مدفوع' : 'معلق'}
                                            </span>
                                            <span className="text-[9px] text-slate-400 font-bold mt-1">Cash on Delivery</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                                                <User className="w-4 h-4" />
                                            </div>
                                            <select className="bg-transparent text-xs font-bold text-slate-600 outline-none border-none py-1 group-hover:text-brand-blue cursor-pointer">
                                                <option>تعيين سائق...</option>
                                                <option>محمد أحمد (نشط)</option>
                                                <option>ياسر علي (في رحلة)</option>
                                            </select>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-left font-black text-slate-900">
                                        {order.total.toLocaleString()} ج.س
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center opacity-20">
                                            <ShoppingBag className="w-12 h-12 mb-3 grayscale" />
                                            <p className="font-black text-lg">لا توجد طلبات للعرض</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination */}
                <div className="bg-slate-50/50 px-6 py-4 flex items-center justify-between border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Showing 1 to 10 of 42 orders</p>
                    <div className="flex gap-2">
                        <button className="px-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-600 hover:bg-slate-50 disabled:opacity-50">السابق</button>
                        <button className="px-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-600 hover:bg-slate-50">التالي</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
