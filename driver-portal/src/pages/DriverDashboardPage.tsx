import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleAlert, Clock3, LocateFixed, LogOut, MapPin, MapPinOff, Navigation, PackageCheck, Phone, RefreshCw, Truck, XCircle } from 'lucide-react';
import { useDriverAuth } from '../context/DriverAuthContext';
import { supabase } from '../lib/supabase';

type DeliveryStatus = 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'delivery_failed';
type Order = { id: string; order_number: string | null; customer_name: string | null; phone: string | null; shipping_address: string | null; city: string | null; state: string | null; total: number; payment_method: string | null; payment_status: string | null; status: DeliveryStatus; created_at: string };
type TimelineItem = { id: string; order_id: string; status: string; note: string | null; created_at: string };
const failureReasons = ['العميل لم يرد على الهاتف', 'العنوان غير صحيح أو غير واضح', 'العميل طلب التأجيل', 'تعذر الوصول للمنطقة', 'سبب آخر'];
const statusText: Record<DeliveryStatus, string> = { confirmed: 'بانتظار الاستلام', preparing: 'قيد التجهيز', shipped: 'في الطريق', delivered: 'تم التوصيل', delivery_failed: 'تعذر التسليم' };
const statusIcon = (status: string) => status === 'delivered' ? <CheckCircle2 size={15}/> : status === 'delivery_failed' ? <XCircle size={15}/> : status === 'shipped' ? <Truck size={15}/> : <Clock3 size={15}/>;

export const DriverDashboardPage: React.FC = () => {
    const { driver, user, signOut, refreshDriver } = useDriverAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [history, setHistory] = useState<Record<string, TimelineItem[]>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [note, setNote] = useState<Record<string, string>>({});
    const [failureReason, setFailureReason] = useState<Record<string, string>>({});
    const [locationSharing, setLocationSharing] = useState(false);
    const [locationStatus, setLocationStatus] = useState('لم تتم مشاركة الموقع');
    const watchId = useRef<number | null>(null);

    const loadOrders = async () => {
        if (!driver) return;
        setLoading(true); setError('');
        const { data, error: responseError } = await supabase.from('orders').select('id,order_number,customer_name,phone,shipping_address,city,state,total,payment_method,payment_status,status,created_at').eq('driver_id', driver.id).in('status', ['confirmed', 'preparing', 'shipped', 'delivered', 'delivery_failed']).order('created_at', { ascending: false });
        if (responseError) { setError(responseError.message); setLoading(false); return; }
        const nextOrders = (data || []) as Order[];
        setOrders(nextOrders);
        if (nextOrders.length) {
            const { data: historyData, error: historyError } = await supabase.from('order_status_history').select('id,order_id,status,note,created_at').in('order_id', nextOrders.map((item) => item.id)).order('created_at', { ascending: true });
            if (historyError) setError(historyError.message);
            const grouped: Record<string, TimelineItem[]> = {};
            (historyData || []).forEach((item) => { const record = item as TimelineItem; grouped[record.order_id] = [...(grouped[record.order_id] || []), record]; });
            setHistory(grouped);
        } else setHistory({});
        setLoading(false);
    };
    useEffect(() => { void loadOrders(); }, [driver?.id]);

    useEffect(() => {
        if (!driver) return;
        const channel = supabase.channel(`driver-live-orders-${driver.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `driver_id=eq.${driver.id}` }, (payload) => {
                if (payload.eventType === 'DELETE') { setOrders((current) => current.filter((item) => item.id !== (payload.old as { id: string }).id)); return; }
                const next = payload.new as Order;
                setOrders((current) => { const exists = current.some((item) => item.id === next.id); return exists ? current.map((item) => item.id === next.id ? { ...item, ...next } : item) : [next, ...current]; });
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_status_history' }, () => { void loadOrders(); }).subscribe();
        return () => { void supabase.removeChannel(channel); };
    }, [driver?.id]);

    const stopLocationSharing = () => {
        if (watchId.current !== null && 'geolocation' in navigator) navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null; setLocationSharing(false); setLocationStatus('تم إيقاف مشاركة الموقع');
    };
    useEffect(() => () => { if (watchId.current !== null && 'geolocation' in navigator) navigator.geolocation.clearWatch(watchId.current); }, []);

    const enRouteOrders = useMemo(() => orders.filter((order) => order.status === 'shipped'), [orders]);
    const startLocationSharing = () => {
        if (!enRouteOrders.length) { setError('يمكن مشاركة الموقع فقط أثناء وجود طلب في الطريق للتوصيل.'); return; }
        if (!('geolocation' in navigator)) { setError('المتصفح لا يدعم خدمة تحديد الموقع.'); return; }
        setError(''); setLocationStatus('يجري طلب إذن الموقع...');
        watchId.current = navigator.geolocation.watchPosition(async (position) => {
            const { error: locationError } = await supabase.rpc('share_driver_location', { p_latitude: position.coords.latitude, p_longitude: position.coords.longitude, p_accuracy_meters: position.coords.accuracy });
            if (locationError) { setError(locationError.message); stopLocationSharing(); return; }
            setLocationSharing(true); setLocationStatus(`آخر تحديث: ${new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })} · دقة ${Math.round(position.coords.accuracy)}م`);
        }, (geoError) => { setError(`تعذر تحديد الموقع: ${geoError.message}`); stopLocationSharing(); }, { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 });
    };

    const setAvailability = async (status: 'active' | 'offline') => { setSaving('availability'); setError(''); const { error: responseError } = await supabase.rpc('set_driver_availability', { p_status: status }); setSaving(null); if (responseError) { setError(responseError.message); return; } if (status === 'offline') stopLocationSharing(); await refreshDriver(); };
    const updateOrder = async (order: Order, status: 'shipped' | 'delivered' | 'delivery_failed') => {
        const reason = failureReason[order.id] || '';
        if (status === 'delivery_failed' && !reason) { setError('اختاري سبب تعذر التسليم قبل حفظ التحديث.'); return; }
        setSaving(order.id); setError('');
        const { error: responseError } = await supabase.rpc('update_driver_order_status', { p_order_id: order.id, p_status: status, p_note: note[order.id] || null, p_failure_reason: status === 'delivery_failed' ? reason : null });
        setSaving(null);
        if (responseError) { setError(responseError.message); return; }
        setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status } : item));
        if (status !== 'shipped' && !orders.some((item) => item.id !== order.id && item.status === 'shipped')) stopLocationSharing();
        await refreshDriver();
    };
    const activeOrders = useMemo(() => orders.filter((order) => !['delivered', 'delivery_failed'].includes(order.status)), [orders]);
    const deliveredCount = orders.filter((order) => order.status === 'delivered').length;
    const failedCount = orders.filter((order) => order.status === 'delivery_failed').length;
    const availabilityLabel = driver?.status === 'active' ? 'متاح' : driver?.status === 'busy' ? 'في مهمة' : 'غير متصل';

    return <main className="driver-app" dir="rtl"><header className="driver-header"><div><p className="eyebrow">TIPS BEAUTY DELIVERY</p><h1>أهلاً، {driver?.name || user?.email}</h1><p className="muted">{driver?.phone}</p></div><button onClick={() => void signOut()} className="icon-button" title="تسجيل الخروج"><LogOut size={20}/></button></header><section className="availability"><div><p>حالتك الحالية</p><h2 className={`availability-${driver?.status}`}>{availabilityLabel}</h2></div><div className="availability-actions"><button onClick={() => void setAvailability('active')} disabled={saving === 'availability'} className="available">متاح</button><button onClick={() => void setAvailability('offline')} disabled={saving === 'availability'} className="offline">إنهاء الوردية</button></div></section><section className={`location-share ${locationSharing ? 'location-live' : ''}`}><div><span className="location-icon">{locationSharing ? <LocateFixed size={19}/> : <MapPinOff size={19}/>}</span><div><b>{locationSharing ? 'مشاركة الموقع مفعلة' : 'مشاركة الموقع اختيارية'}</b><p>{locationStatus}</p></div></div>{locationSharing ? <button onClick={stopLocationSharing} className="stop-location">إيقاف</button> : <button onClick={startLocationSharing} disabled={!enRouteOrders.length} className="start-location">بدء أثناء التوصيل</button>}</section>{error && <div className="error"><CircleAlert size={17}/>{error}</div>}<section className="stats"><div><Clock3 size={20}/><strong>{activeOrders.length}</strong><span>مهام نشطة</span></div><div><CheckCircle2 size={20}/><strong>{deliveredCount}</strong><span>طلبات مكتملة</span></div><div><AlertTriangle size={20}/><strong>{failedCount}</strong><span>تعذر تسليمها</span></div></section><div className="section-title"><div><h2>مهامي</h2><p>تتحدث الحالة والسجل فورياً عند التعديل من المندوب أو الإدارة.</p></div><button onClick={() => void loadOrders()} className="icon-button"><RefreshCw className={loading ? 'spin' : ''} size={20}/></button></div>{loading ? <div className="empty">جارٍ تحميل المهام...</div> : activeOrders.length ? <section className="tasks">{activeOrders.map((order) => <article key={order.id} className="task-card"><div className="task-top"><div><p className="order-number">{order.order_number || order.id.slice(0, 8)}</p><p className="task-time">{new Date(order.created_at).toLocaleDateString('ar-EG')}</p></div><span className={`order-status status-${order.status}`}>{statusText[order.status]}</span></div><div className="customer"><div className="avatar">{order.customer_name?.charAt(0) || 'ع'}</div><div><h3>{order.customer_name || 'عميل تيبس'}</h3><a href={`tel:${order.phone || ''}`}><Phone size={14}/>{order.phone || 'لا يوجد هاتف'}</a></div></div><div className="address"><MapPin size={18}/><span>{order.shipping_address || 'لا يوجد عنوان'}<small>{order.city || ''}{order.state ? `، ${order.state}` : ''}</small></span></div><div className="order-meta"><span>المبلغ: <b>{Number(order.total || 0).toLocaleString()} ج.س</b></span><span>{order.payment_method === 'COD' ? 'تحصيل عند الاستلام' : 'مدفوع إلكترونياً'}</span></div><div className="timeline"><p>سجل الحالة</p>{(history[order.id] || []).length ? (history[order.id] || []).map((item) => <div className={`timeline-item timeline-${item.status}`} key={item.id}><span>{statusIcon(item.status)}</span><div><b>{statusText[item.status as DeliveryStatus] || item.status}</b><small>{new Date(item.created_at).toLocaleString('ar-EG')}</small>{item.note && <em>{item.note}</em>}</div></div>) : <small className="timeline-empty">سيظهر سجل التحديثات هنا.</small>}</div><textarea value={note[order.id] || ''} onChange={(event) => setNote({ ...note, [order.id]: event.target.value })} placeholder="ملاحظة للتحديث (اختياري)" rows={2}/>{order.status === 'shipped' && <select className="failure-select" value={failureReason[order.id] || ''} onChange={(event) => setFailureReason({ ...failureReason, [order.id]: event.target.value })}><option value="">سبب تعذر التسليم (اختياري حتى تختار الإبلاغ)</option>{failureReasons.map((reason) => <option key={reason} value={reason}>{reason}</option>)}</select>}<div className="task-actions"><a className="map-button" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${order.city || ''} ${order.shipping_address || ''}`)}`}><Navigation size={17}/>فتح الخريطة</a>{order.status === 'shipped' ? <><button disabled={saving === order.id} onClick={() => void updateOrder(order, 'delivery_failed')} className="failed-button"><XCircle size={17}/>{saving === order.id ? 'جارٍ الحفظ...' : 'تعذر التسليم'}</button><button disabled={saving === order.id} onClick={() => void updateOrder(order, 'delivered')} className="complete-button"><PackageCheck size={17}/>{saving === order.id ? 'جارٍ الحفظ...' : 'تم التوصيل'}</button></> : <button disabled={saving === order.id} onClick={() => void updateOrder(order, 'shipped')} className="primary-button"><Truck size={17}/>{saving === order.id ? 'جارٍ الحفظ...' : 'بدء التوصيل'}</button>}</div></article>)}</section> : <div className="empty"><CheckCircle2 size={38}/><h3>لا توجد مهام نشطة</h3><p>عندما تعين لك الإدارة طلباً سيظهر هنا فوراً.</p></div>}</main>;
};
