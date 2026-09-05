import React, { useEffect, useMemo, useState } from 'react';
import { Search, ShoppingBag, User, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type OrderStatus = 'new' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';

type Order = {
    id: string;
    order_number: string | null;
    customer_name: string | null;
    phone: string | null;
    status: OrderStatus;
    payment_method: string | null;
    payment_status: string | null;
    financial_status: string | null;
    total: number;
    shipping_fee: number;
    city: string | null;
    shipping_address: string | null;
    driver_id: string | null;
    created_at: string;
};

type Driver = { id: string; name: string; phone: string; status: 'active' | 'busy' | 'offline' };

const statusOptions: { value: OrderStatus; label: string }[] = [
    { value: 'new', label: 'طلب جديد' },
    { value: 'confirmed', label: 'تم التأكيد' },
    { value: 'preparing', label: 'جاري التجهيز' },
    { value: 'shipped', label: 'خرج للتوصيل' },
    { value: 'delivered', label: 'تم التوصيل' },
    { value: 'cancelled', label: 'ملغي' },
];

export const OrderListPage: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchOrders = async () => {
        setLoading(true);
        setError('');
        const [{ data: orderData, error: orderError }, { data: driverData, error: driverError }] = await Promise.all([
            supabase.from('orders').select('id,order_number,customer_name,phone,status,payment_method,payment_status,financial_status,total,shipping_fee,city,shipping_address,driver_id,created_at').order('created_at', { ascending: false }),
            supabase.from('drivers').select('id,name,phone,status').order('name'),
        ]);
        if (orderError || driverError) setError(orderError?.message || driverError?.message || 'تعذر تحميل البيانات');
        setOrders((orderData || []) as Order[]);
        setDrivers((driverData || []) as Driver[]);
        setLoading(false);
    };

    useEffect(() => { void fetchOrders(); }, []);

    const filteredOrders = useMemo(() => orders.filter((order) => {
        const query = search.trim().toLowerCase();
        const matchesSearch = !query || [order.order_number, order.customer_name, order.phone, order.city]
            .some((value) => value?.toLowerCase().includes(query));
        return matchesSearch && (statusFilter === 'all' || order.status === statusFilter);
    }), [orders, search, statusFilter]);

    const updateStatus = async (order: Order, status: OrderStatus) => {
        if (status === order.status) return;
        const { error: updateError } = await supabase.from('orders').update({ status }).eq('id', order.id);
        if (updateError) { setError(updateError.message); return; }
        const { error: historyError } = await supabase.from('order_status_history').insert({ order_id: order.id, status, note: 'تم التحديث من لوحة الإدارة' });
        if (historyError) { setError(historyError.message); return; }
        setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status } : item));
    };

    const assignDriver = async (order: Order, driverId: string) => {
        const { error: updateError } = await supabase.from('orders').update({ driver_id: driverId || null }).eq('id', order.id);
        if (updateError) { setError(updateError.message); return; }
        setOrders((current) => current.map((item) => item.id === order.id ? { ...item, driver_id: driverId || null } : item));
    };

    const getStatusStyles = (status: OrderStatus) => {
        switch (status) {
            case 'new': return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'confirmed': return 'bg-amber-50 text-amber-600 border-amber-100';
            case 'preparing': return 'bg-purple-50 text-purple-600 border-purple-100';
            case 'shipped': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
            case 'delivered': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'cancelled': return 'bg-red-50 text-red-600 border-red-100';
        }
    };

    const driverName = (driverId: string | null) => drivers.find((driver) => driver.id === driverId)?.name || '';

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">إدارة الطلبات</h1>
                    <p className="text-slate-500 font-medium mt-1">إدارة الحالات، الدفع، والمندوبين من قاعدة البيانات مباشرة</p>
                </div>
                <button onClick={() => void fetchOrders()} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm disabled:opacity-50">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> تحديث
                </button>
            </div>

            {error && <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl p-4 text-sm font-bold">{error}</div>}

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap gap-3">
                <div className="flex-1 min-w-[300px] relative">
                    <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input value={search} onChange={(event) => setSearch(event.target.value)} type="text" placeholder="البحث برقم الطلب، اسم العميل، أو الهاتف..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-brand-blue outline-none transition-all font-medium text-sm" />
                </div>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 font-bold text-sm text-slate-700 outline-none">
                    <option value="all">كل الحالات</option>
                    {statusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                </select>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                        <thead><tr className="bg-slate-900 border-b border-slate-800">
                            <th className="px-6 py-5 text-xs font-black text-slate-400">معلومات الطلب</th>
                            <th className="px-6 py-5 text-xs font-black text-slate-400">العميل</th>
                            <th className="px-6 py-5 text-xs font-black text-slate-400 text-center">الحالة</th>
                            <th className="px-6 py-5 text-xs font-black text-slate-400 text-center">الدفع</th>
                            <th className="px-6 py-5 text-xs font-black text-slate-400">المندوب</th>
                            <th className="px-6 py-5 text-xs font-black text-slate-400 text-left">الإجمالي</th>
                        </tr></thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredOrders.length > 0 ? filteredOrders.map((order) => (
                                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-5"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 font-black text-sm"><ShoppingBag className="w-4 h-4" /></div><div><p className="font-bold text-slate-900 text-sm">{order.order_number || order.id.slice(0, 8)}</p><p className="text-[10px] text-slate-400 font-bold mt-0.5">{new Date(order.created_at).toLocaleDateString('ar-EG')} · {order.city || '—'}</p></div></div></td>
                                    <td className="px-6 py-5"><p className="font-bold text-slate-900 text-sm">{order.customer_name || '—'}</p><p className="text-xs text-slate-500 font-medium">{order.phone || '—'}</p></td>
                                    <td className="px-6 py-5 text-center"><select value={order.status} onChange={(event) => void updateStatus(order, event.target.value as OrderStatus)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black border outline-none ${getStatusStyles(order.status)}`}>{statusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></td>
                                    <td className="px-6 py-5 text-center"><div className="flex flex-col items-center"><span className={`px-2 py-0.5 rounded text-[9px] font-black ${order.payment_status === 'paid' || order.financial_status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{order.payment_status === 'paid' || order.financial_status === 'paid' ? 'مدفوع' : 'معلق'}</span><span className="text-[9px] text-slate-400 font-bold mt-1">{order.payment_method || '—'}</span></div></td>
                                    <td className="px-6 py-5"><div className="flex items-center gap-2"><User className="w-4 h-4 text-slate-400" /><select value={order.driver_id || ''} onChange={(event) => void assignDriver(order, event.target.value)} className="bg-transparent text-xs font-bold text-slate-600 outline-none border-none py-1 max-w-[150px]"><option value="">غير معين</option>{drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name} ({driver.status})</option>)}</select>{order.driver_id && <span className="sr-only">{driverName(order.driver_id)}</span>}</div></td>
                                    <td className="px-6 py-5 text-left font-black text-slate-900">{Number(order.total || 0).toLocaleString()} ج.س</td>
                                </tr>
                            )) : <tr><td colSpan={6} className="px-6 py-20 text-center"><div className="flex flex-col items-center opacity-20"><ShoppingBag className="w-12 h-12 mb-3 grayscale" /><p className="font-black text-lg">لا توجد طلبات للعرض</p></div></td></tr>}
                        </tbody>
                    </table>
                </div>
                <div className="bg-slate-50/50 px-6 py-4 border-t border-slate-100"><p className="text-[10px] text-slate-400 font-bold">عرض {filteredOrders.length} من أصل {orders.length} طلب</p></div>
            </div>
        </div>
    );
};
