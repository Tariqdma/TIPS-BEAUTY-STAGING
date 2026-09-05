import React, { useEffect, useMemo, useState } from 'react';
import { Search, ShoppingBag, User, RefreshCw, Warehouse } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type OrderStatus = 'new' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';
type Order = { id: string; order_number: string | null; customer_name: string | null; phone: string | null; status: OrderStatus; payment_method: string | null; payment_status: string | null; financial_status: string | null; total: number; shipping_fee: number; city: string | null; shipping_address: string | null; driver_id: string | null; fulfillment_warehouse_id: string | null; created_at: string };
type Driver = { id: string; name: string; phone: string; status: 'active' | 'busy' | 'offline' };
type WarehouseItem = { id: string; name: string; city: string; is_active: boolean };

const statusOptions: { value: OrderStatus; label: string }[] = [
    { value: 'new', label: 'طلب جديد' }, { value: 'confirmed', label: 'تم التأكيد' }, { value: 'preparing', label: 'جاري التجهيز' }, { value: 'shipped', label: 'خرج للتوصيل' }, { value: 'delivered', label: 'تم التوصيل' }, { value: 'cancelled', label: 'ملغي' },
];

export const OrderListPage: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchOrders = async () => {
        setLoading(true); setError('');
        const [orderResponse, driverResponse, warehouseResponse] = await Promise.all([
            supabase.from('orders').select('id,order_number,customer_name,phone,status,payment_method,payment_status,financial_status,total,shipping_fee,city,shipping_address,driver_id,fulfillment_warehouse_id,created_at').order('created_at', { ascending: false }),
            supabase.from('drivers').select('id,name,phone,status').order('name'),
            supabase.from('warehouses').select('id,name,city,is_active').eq('is_active', true).order('name'),
        ]);
        const firstError = orderResponse.error || driverResponse.error || warehouseResponse.error;
        if (firstError) setError(firstError.message);
        setOrders((orderResponse.data || []) as Order[]);
        setDrivers((driverResponse.data || []) as Driver[]);
        setWarehouses((warehouseResponse.data || []) as WarehouseItem[]);
        setLoading(false);
    };

    useEffect(() => { void fetchOrders(); }, []);

    const filteredOrders = useMemo(() => orders.filter((order) => {
        const query = search.trim().toLowerCase();
        const matchesSearch = !query || [order.order_number, order.customer_name, order.phone, order.city].some((value) => value?.toLowerCase().includes(query));
        return matchesSearch && (statusFilter === 'all' || order.status === statusFilter);
    }), [orders, search, statusFilter]);

    const updateOrder = async (order: Order, values: Partial<Pick<Order, 'status' | 'driver_id' | 'fulfillment_warehouse_id'>>) => {
        const { error: updateError } = await supabase.from('orders').update(values).eq('id', order.id);
        if (updateError) { setError(updateError.message); return; }
        if (values.status && values.status !== order.status) {
            const { error: historyError } = await supabase.from('order_status_history').insert({ order_id: order.id, status: values.status, note: 'تم التحديث من لوحة الإدارة' });
            if (historyError) { setError(historyError.message); return; }
        }
        setOrders((current) => current.map((item) => item.id === order.id ? { ...item, ...values } : item));
    };

    const getStatusStyles = (status: OrderStatus) => ({ new: 'bg-blue-50 text-blue-600 border-blue-100', confirmed: 'bg-amber-50 text-amber-600 border-amber-100', preparing: 'bg-purple-50 text-purple-600 border-purple-100', shipped: 'bg-indigo-50 text-indigo-600 border-indigo-100', delivered: 'bg-emerald-50 text-emerald-600 border-emerald-100', cancelled: 'bg-red-50 text-red-600 border-red-100' }[status]);
    const driverName = (id: string | null) => drivers.find((driver) => driver.id === id)?.name || 'غير معين';
    const warehouseName = (id: string | null) => warehouses.find((warehouse) => warehouse.id === id)?.name || 'غير معين';

    const EditControls = ({ order }: { order: Order }) => <div className="grid gap-2 sm:grid-cols-3">
        <select value={order.status} onChange={(event) => void updateOrder(order, { status: event.target.value as OrderStatus })} className={`rounded-lg border px-3 py-2 text-xs font-black outline-none ${getStatusStyles(order.status)}`}>{statusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select>
        <select value={order.driver_id || ''} onChange={(event) => void updateOrder(order, { driver_id: event.target.value || null })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 outline-none"><option value="">تعيين مندوب...</option>{drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name} ({driver.status})</option>)}</select>
        <select value={order.fulfillment_warehouse_id || ''} onChange={(event) => void updateOrder(order, { fulfillment_warehouse_id: event.target.value || null })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 outline-none"><option value="">تعيين مخزن...</option>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name} — {warehouse.city}</option>)}</select>
    </div>;

    return <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl sm:text-3xl font-black text-slate-900">إدارة الطلبات</h1><p className="mt-1 text-sm text-slate-500">تعيين الفرع والمندوب وتحديث حالة كل طلب.</p></div><button onClick={() => void fetchOrders()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />تحديث</button></div>
        {error && <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 w-5 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث برقم الطلب أو العميل أو الهاتف..." className="w-full rounded-xl border border-slate-100 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none" /></div><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700"><option value="all">كل الحالات</option>{statusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></div>

        <div className="space-y-3 md:hidden">{filteredOrders.length ? filteredOrders.map((order) => <article key={order.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2"><ShoppingBag className="w-5 text-brand-blue" /><div><p className="font-black text-slate-900">{order.order_number || order.id.slice(0, 8)}</p><p className="text-xs text-slate-400">{new Date(order.created_at).toLocaleDateString('ar-EG')} · {order.city || '—'}</p></div></div><span className={`rounded-lg border px-2 py-1 text-[10px] font-black ${getStatusStyles(order.status)}`}>{statusOptions.find((item) => item.value === order.status)?.label}</span></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div><span className="text-slate-400">العميل:</span> <b>{order.customer_name || '—'}</b></div><div><span className="text-slate-400">الإجمالي:</span> <b>{Number(order.total || 0).toLocaleString()} ج.س</b></div><div><span className="text-slate-400">المندوب:</span> <b>{driverName(order.driver_id)}</b></div><div><span className="text-slate-400">المخزن:</span> <b>{warehouseName(order.fulfillment_warehouse_id)}</b></div></div><div className="mt-4"><EditControls order={order} /></div></article>) : <div className="rounded-2xl bg-white p-10 text-center text-slate-400">لا توجد طلبات للعرض</div>}</div>

        <div className="hidden overflow-x-auto rounded-3xl border border-slate-100 bg-white shadow-sm md:block"><table className="w-full text-right"><thead><tr className="bg-slate-900 text-xs text-slate-400"><th className="px-5 py-4">الطلب</th><th className="px-5 py-4">العميل</th><th className="px-5 py-4">الحالة</th><th className="px-5 py-4">الدفع</th><th className="px-5 py-4">المندوب</th><th className="px-5 py-4">مخزن التجهيز</th><th className="px-5 py-4">الإجمالي</th></tr></thead><tbody className="divide-y divide-slate-50">{filteredOrders.length ? filteredOrders.map((order) => <tr key={order.id}><td className="px-5 py-4"><p className="font-bold text-slate-900">{order.order_number || order.id.slice(0, 8)}</p><p className="text-[10px] text-slate-400">{order.city || '—'}</p></td><td className="px-5 py-4"><p className="font-bold text-sm">{order.customer_name || '—'}</p><p className="text-xs text-slate-400">{order.phone || '—'}</p></td><td className="px-5 py-4"><select value={order.status} onChange={(event) => void updateOrder(order, { status: event.target.value as OrderStatus })} className={`rounded-lg border px-2 py-1.5 text-xs font-black outline-none ${getStatusStyles(order.status)}`}>{statusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></td><td className="px-5 py-4"><span className="text-xs font-bold">{order.payment_status === 'paid' || order.financial_status === 'paid' ? 'مدفوع' : 'معلق'}</span><p className="text-[10px] text-slate-400">{order.payment_method || '—'}</p></td><td className="px-5 py-4"><div className="flex items-center gap-1"><User className="w-4 text-slate-400" /><select value={order.driver_id || ''} onChange={(event) => void updateOrder(order, { driver_id: event.target.value || null })} className="max-w-32 bg-transparent text-xs font-bold outline-none"><option value="">غير معين</option>{drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}</select></div></td><td className="px-5 py-4"><div className="flex items-center gap-1"><Warehouse className="w-4 text-slate-400" /><select value={order.fulfillment_warehouse_id || ''} onChange={(event) => void updateOrder(order, { fulfillment_warehouse_id: event.target.value || null })} className="max-w-36 bg-transparent text-xs font-bold outline-none"><option value="">غير معين</option>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></div></td><td className="px-5 py-4 font-black">{Number(order.total || 0).toLocaleString()} ج.س</td></tr>) : <tr><td colSpan={7} className="p-16 text-center text-slate-400">لا توجد طلبات للعرض</td></tr>}</tbody></table></div>
        <p className="text-xs font-bold text-slate-400">عرض {filteredOrders.length} من أصل {orders.length} طلب</p>
    </div>;
};
