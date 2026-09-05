import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CircleAlert, Clock3, LogOut, MapPin, Navigation, PackageCheck, Phone, RefreshCw, Truck } from 'lucide-react';
import { useDriverAuth } from '../context/DriverAuthContext';
import { supabase } from '../lib/supabase';

type Order = { id: string; order_number: string | null; customer_name: string | null; phone: string | null; shipping_address: string | null; city: string | null; state: string | null; total: number; payment_method: string | null; payment_status: string | null; status: 'confirmed' | 'preparing' | 'shipped' | 'delivered'; created_at: string };

export const DriverDashboardPage: React.FC = () => {
    const { driver, user, signOut, refreshDriver } = useDriverAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [note, setNote] = useState<Record<string, string>>({});

    const loadOrders = async () => {
        if (!driver) return;
        setLoading(true); setError('');
        const { data, error: responseError } = await supabase.from('orders').select('id,order_number,customer_name,phone,shipping_address,city,state,total,payment_method,payment_status,status,created_at').eq('driver_id', driver.id).in('status', ['confirmed', 'preparing', 'shipped', 'delivered']).order('created_at', { ascending: false });
        if (responseError) setError(responseError.message);
        setOrders((data || []) as Order[]);
        setLoading(false);
    };
    useEffect(() => { void loadOrders(); }, [driver?.id]);

    const setAvailability = async (status: 'active' | 'offline') => {
        setSaving('availability'); setError('');
        const { error: responseError } = await supabase.rpc('set_driver_availability', { p_status: status });
        setSaving(null);
        if (responseError) { setError(responseError.message); return; }
        await refreshDriver();
    };
    const updateOrder = async (order: Order, status: 'shipped' | 'delivered') => {
        setSaving(order.id); setError('');
        const { error: responseError } = await supabase.rpc('update_driver_order_status', { p_order_id: order.id, p_status: status, p_note: note[order.id] || null });
        setSaving(null);
        if (responseError) { setError(responseError.message); return; }
        setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status } : item));
        await refreshDriver();
    };
    const activeOrders = useMemo(() => orders.filter((order) => order.status !== 'delivered'), [orders]);
    const deliveredCount = orders.filter((order) => order.status === 'delivered').length;
    const availabilityLabel = driver?.status === 'active' ? 'متاح' : driver?.status === 'busy' ? 'في مهمة' : 'غير متصل';

    return <main className="driver-app" dir="rtl"><header className="driver-header"><div><p className="eyebrow">TIPS BEAUTY DELIVERY</p><h1>أهلاً، {driver?.name || user?.email}</h1><p className="muted">{driver?.phone}</p></div><button onClick={() => void signOut()} className="icon-button" title="تسجيل الخروج"><LogOut size={20}/></button></header><section className="availability"><div><p>حالتك الحالية</p><h2 className={`availability-${driver?.status}`}>{availabilityLabel}</h2></div><div className="availability-actions"><button onClick={() => void setAvailability('active')} disabled={saving === 'availability'} className="available">متاح</button><button onClick={() => void setAvailability('offline')} disabled={saving === 'availability'} className="offline">إنهاء الوردية</button></div></section>{error && <div className="error"><CircleAlert size={17}/>{error}</div>}<section className="stats"><div><Clock3 size={20}/><strong>{activeOrders.length}</strong><span>مهام نشطة</span></div><div><CheckCircle2 size={20}/><strong>{deliveredCount}</strong><span>طلبات مكتملة</span></div><div><Truck size={20}/><strong>{driver?.status === 'busy' ? 1 : 0}</strong><span>في الطريق</span></div></section><div className="section-title"><div><h2>مهامي</h2><p>فقط الطلبات التي عينتها الإدارة لك.</p></div><button onClick={() => void loadOrders()} className="icon-button"><RefreshCw className={loading ? 'spin' : ''} size={20}/></button></div>{loading ? <div className="empty">جارٍ تحميل المهام...</div> : activeOrders.length ? <section className="tasks">{activeOrders.map((order) => <article key={order.id} className="task-card"><div className="task-top"><div><p className="order-number">{order.order_number || order.id.slice(0, 8)}</p><p className="task-time">{new Date(order.created_at).toLocaleDateString('ar-EG')}</p></div><span className={`order-status status-${order.status}`}>{order.status === 'shipped' ? 'في الطريق' : order.status === 'preparing' ? 'قيد التجهيز' : 'جاهز للتأكيد'}</span></div><div className="customer"><div className="avatar">{order.customer_name?.charAt(0) || 'ع'}</div><div><h3>{order.customer_name || 'عميل تيبس'}</h3><a href={`tel:${order.phone || ''}`}><Phone size={14}/>{order.phone || 'لا يوجد هاتف'}</a></div></div><div className="address"><MapPin size={18}/><span>{order.shipping_address || 'لا يوجد عنوان'}<small>{order.city || ''}{order.state ? `، ${order.state}` : ''}</small></span></div><div className="order-meta"><span>المبلغ: <b>{Number(order.total || 0).toLocaleString()} ج.س</b></span><span>{order.payment_method === 'COD' ? 'تحصيل عند الاستلام' : 'مدفوع إلكترونياً'}</span></div><textarea value={note[order.id] || ''} onChange={(event) => setNote({ ...note, [order.id]: event.target.value })} placeholder="ملاحظة للتحديث (اختياري)" rows={2}/><div className="task-actions"><a className="map-button" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${order.city || ''} ${order.shipping_address || ''}`)}`}><Navigation size={17}/>فتح الخريطة</a>{order.status === 'shipped' ? <button disabled={saving === order.id} onClick={() => void updateOrder(order, 'delivered')} className="complete-button"><PackageCheck size={17}/>{saving === order.id ? 'جارٍ الحفظ...' : 'تم التوصيل'}</button> : <button disabled={saving === order.id} onClick={() => void updateOrder(order, 'shipped')} className="primary-button"><Truck size={17}/>{saving === order.id ? 'جارٍ الحفظ...' : 'بدء التوصيل'}</button>}</div></article>)}</section> : <div className="empty"><CheckCircle2 size={38}/><h3>لا توجد مهام نشطة</h3><p>عندما تعين لك الإدارة طلباً سيظهر هنا.</p></div>}</main>;
};
