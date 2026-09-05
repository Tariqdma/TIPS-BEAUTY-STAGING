import React, { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeftRight, MapPin, PackagePlus, Plus, RefreshCw, Store, Warehouse as WarehouseIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Warehouse = {
    id: string;
    name: string;
    code: string;
    state: string;
    city: string;
    address: string | null;
    phone: string | null;
    is_active: boolean;
};

type Product = { id: string; name_ar: string; brand: string | null; stock: number };
type InventoryRow = {
    warehouse_id: string;
    product_id: string;
    quantity: number;
    reorder_level: number;
    product: { id: string; name_ar: string; brand: string | null }[] | null;
};

type Transfer = {
    id: string;
    quantity: number;
    note: string | null;
    created_at: string;
    from_warehouse: { name: string }[] | null;
    to_warehouse: { name: string }[] | null;
    product: { name_ar: string }[] | null;
};

const emptyWarehouse = { name: '', code: '', state: '', city: '', address: '', phone: '' };

export const WarehousesPage: React.FC = () => {
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [inventory, setInventory] = useState<InventoryRow[]>([]);
    const [transfers, setTransfers] = useState<Transfer[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [showWarehouseForm, setShowWarehouseForm] = useState(false);
    const [warehouseForm, setWarehouseForm] = useState(emptyWarehouse);
    const [stockForm, setStockForm] = useState({ warehouseId: '', productId: '', quantity: '', note: '', reorderLevel: '5' });
    const [transferForm, setTransferForm] = useState({ fromWarehouseId: '', toWarehouseId: '', productId: '', quantity: '', note: '' });

    const loadData = async () => {
        setLoading(true);
        setError('');
        const [warehouseResult, productResult, inventoryResult, transferResult] = await Promise.all([
            supabase.from('warehouses').select('*').order('state').order('city').order('name'),
            supabase.from('products').select('id,name_ar,brand,stock').order('name_ar'),
            supabase.from('warehouse_inventory').select('warehouse_id,product_id,quantity,reorder_level,product:products(id,name_ar,brand)').order('updated_at', { ascending: false }),
            supabase.from('stock_transfers').select('id,quantity,note,created_at,from_warehouse:warehouses!stock_transfers_from_warehouse_id_fkey(name),to_warehouse:warehouses!stock_transfers_to_warehouse_id_fkey(name),product:products(name_ar)').order('created_at', { ascending: false }).limit(8),
        ]);
        const firstError = warehouseResult.error || productResult.error || inventoryResult.error || transferResult.error;
        if (firstError) setError(firstError.message);
        setWarehouses((warehouseResult.data || []) as Warehouse[]);
        setProducts((productResult.data || []) as Product[]);
        setInventory((inventoryResult.data || []) as InventoryRow[]);
        setTransfers((transferResult.data || []) as Transfer[]);
        setLoading(false);
    };

    useEffect(() => { void loadData(); }, []);

    const inventoryByWarehouse = useMemo(() => warehouses.map((warehouse) => ({
        warehouse,
        rows: inventory.filter((row) => row.warehouse_id === warehouse.id),
    })), [warehouses, inventory]);

    const createWarehouse = async (event: FormEvent) => {
        event.preventDefault();
        setSaving(true); setError(''); setMessage('');
        const { error: insertError } = await supabase.from('warehouses').insert({
            ...warehouseForm,
            code: warehouseForm.code.trim().toUpperCase(),
            name: warehouseForm.name.trim(),
            state: warehouseForm.state.trim(),
            city: warehouseForm.city.trim(),
            address: warehouseForm.address.trim() || null,
            phone: warehouseForm.phone.trim() || null,
        });
        setSaving(false);
        if (insertError) { setError(insertError.message); return; }
        setWarehouseForm(emptyWarehouse); setShowWarehouseForm(false); setMessage('تمت إضافة الفرع بنجاح.');
        void loadData();
    };

    const changeWarehouseActive = async (warehouse: Warehouse) => {
        setError(''); setMessage('');
        const { error: updateError } = await supabase.from('warehouses').update({ is_active: !warehouse.is_active }).eq('id', warehouse.id);
        if (updateError) { setError(updateError.message); return; }
        setWarehouses((current) => current.map((item) => item.id === warehouse.id ? { ...item, is_active: !item.is_active } : item));
    };

    const adjustStock = async (event: FormEvent) => {
        event.preventDefault();
        const quantity = Number(stockForm.quantity);
        if (!stockForm.warehouseId || !stockForm.productId || !Number.isInteger(quantity) || quantity === 0) {
            setError('اختر الفرع والمنتج وأدخل كمية صحيحة غير صفرية.'); return;
        }
        setSaving(true); setError(''); setMessage('');
        const { error: rpcError } = await supabase.rpc('adjust_warehouse_inventory', {
            p_warehouse_id: stockForm.warehouseId,
            p_product_id: stockForm.productId,
            p_quantity_delta: quantity,
            p_note: stockForm.note.trim() || null,
            p_reorder_level: Math.max(0, Number(stockForm.reorderLevel) || 0),
        });
        setSaving(false);
        if (rpcError) { setError(rpcError.message); return; }
        setStockForm({ warehouseId: stockForm.warehouseId, productId: '', quantity: '', note: '', reorderLevel: '5' });
        setMessage('تم تحديث مخزون الفرع وتسجيل الحركة.');
        void loadData();
    };

    const transferStock = async (event: FormEvent) => {
        event.preventDefault();
        const quantity = Number(transferForm.quantity);
        if (!transferForm.fromWarehouseId || !transferForm.toWarehouseId || !transferForm.productId || !Number.isInteger(quantity) || quantity < 1) {
            setError('أكمل بيانات التحويل بكمية صحيحة.'); return;
        }
        if (transferForm.fromWarehouseId === transferForm.toWarehouseId) { setError('لا يمكن التحويل إلى نفس الفرع.'); return; }
        setSaving(true); setError(''); setMessage('');
        const { error: rpcError } = await supabase.rpc('transfer_warehouse_stock', {
            p_from_warehouse_id: transferForm.fromWarehouseId,
            p_to_warehouse_id: transferForm.toWarehouseId,
            p_product_id: transferForm.productId,
            p_quantity: quantity,
            p_note: transferForm.note.trim() || null,
        });
        setSaving(false);
        if (rpcError) { setError(rpcError.message); return; }
        setTransferForm({ fromWarehouseId: '', toWarehouseId: '', productId: '', quantity: '', note: '' });
        setMessage('تم تحويل المخزون بين الفرعين وتسجيل العملية.');
        void loadData();
    };

    const lowStock = inventory.filter((row) => row.quantity <= row.reorder_level).length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="flex items-center gap-3"><WarehouseIcon className="w-8 h-8 text-brand-blue" /><h1 className="text-2xl sm:text-3xl font-black text-slate-900">الفروع والمخازن</h1></div>
                    <p className="mt-1 text-sm sm:text-base text-slate-500">إدارة مخزون كل ولاية، التحويلات الداخلية، وتجهيز الطلبات من أقرب فرع.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => void loadData()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />تحديث</button>
                    <button onClick={() => setShowWarehouseForm((current) => !current)} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"><Plus className="w-4 h-4" />فرع جديد</button>
                </div>
            </div>

            {error && <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
            {message && <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{message}</div>}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><p className="text-xs font-bold text-slate-400">الفروع النشطة</p><p className="mt-2 text-3xl font-black text-slate-900">{warehouses.filter((item) => item.is_active).length}</p></div>
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><p className="text-xs font-bold text-slate-400">وحدات مخزون مسجلة</p><p className="mt-2 text-3xl font-black text-slate-900">{inventory.reduce((sum, item) => sum + Number(item.quantity), 0)}</p></div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 shadow-sm"><p className="text-xs font-bold text-amber-700">أصناف تحتاج إعادة طلب</p><p className="mt-2 text-3xl font-black text-amber-800">{lowStock}</p></div>
            </div>

            {showWarehouseForm && <form onSubmit={createWarehouse} className="grid grid-cols-1 gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-5 sm:grid-cols-2 lg:grid-cols-3">
                <h2 className="sm:col-span-2 lg:col-span-3 font-black text-slate-900">إضافة فرع أو مخزن</h2>
                <input required value={warehouseForm.name} onChange={(event) => setWarehouseForm({ ...warehouseForm, name: event.target.value })} placeholder="اسم الفرع أو المخزن" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none" />
                <input required value={warehouseForm.code} onChange={(event) => setWarehouseForm({ ...warehouseForm, code: event.target.value })} placeholder="رمز مختصر، مثلاً KRT-01" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none" />
                <input required value={warehouseForm.state} onChange={(event) => setWarehouseForm({ ...warehouseForm, state: event.target.value })} placeholder="الولاية" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none" />
                <input required value={warehouseForm.city} onChange={(event) => setWarehouseForm({ ...warehouseForm, city: event.target.value })} placeholder="المدينة" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none" />
                <input value={warehouseForm.address} onChange={(event) => setWarehouseForm({ ...warehouseForm, address: event.target.value })} placeholder="العنوان التفصيلي" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none" />
                <input value={warehouseForm.phone} onChange={(event) => setWarehouseForm({ ...warehouseForm, phone: event.target.value })} placeholder="هاتف الفرع" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none" />
                <div className="sm:col-span-2 lg:col-span-3 flex gap-2"><button disabled={saving} className="rounded-xl bg-brand-blue px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{saving ? 'جارٍ الحفظ...' : 'حفظ الفرع'}</button><button type="button" onClick={() => setShowWarehouseForm(false)} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600">إلغاء</button></div>
            </form>}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <form onSubmit={adjustStock} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
                    <div className="flex items-center gap-2"><PackagePlus className="w-5 h-5 text-brand-blue" /><h2 className="font-black text-slate-900">تعديل مخزون فرع</h2></div>
                    <select required value={stockForm.warehouseId} onChange={(event) => setStockForm({ ...stockForm, warehouseId: event.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"><option value="">اختر الفرع</option>{warehouses.filter((item) => item.is_active).map((item) => <option key={item.id} value={item.id}>{item.name} — {item.city}</option>)}</select>
                    <select required value={stockForm.productId} onChange={(event) => setStockForm({ ...stockForm, productId: event.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"><option value="">اختر المنتج</option>{products.map((item) => <option key={item.id} value={item.id}>{item.name_ar}{item.brand ? ` — ${item.brand}` : ''}</option>)}</select>
                    <div className="grid grid-cols-2 gap-3"><input required type="number" value={stockForm.quantity} onChange={(event) => setStockForm({ ...stockForm, quantity: event.target.value })} placeholder="الكمية (+ أو -)" className="rounded-xl border border-slate-200 px-4 py-3 text-sm" /><input required min="0" type="number" value={stockForm.reorderLevel} onChange={(event) => setStockForm({ ...stockForm, reorderLevel: event.target.value })} placeholder="حد إعادة الطلب" className="rounded-xl border border-slate-200 px-4 py-3 text-sm" /></div>
                    <input value={stockForm.note} onChange={(event) => setStockForm({ ...stockForm, note: event.target.value })} placeholder="سبب التعديل (اختياري)" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
                    <button disabled={saving} className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">تسجيل حركة المخزون</button>
                </form>

                <form onSubmit={transferStock} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
                    <div className="flex items-center gap-2"><ArrowLeftRight className="w-5 h-5 text-brand-blue" /><h2 className="font-black text-slate-900">تحويل مخزون بين الفروع</h2></div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><select required value={transferForm.fromWarehouseId} onChange={(event) => setTransferForm({ ...transferForm, fromWarehouseId: event.target.value })} className="rounded-xl border border-slate-200 px-4 py-3 text-sm"><option value="">من الفرع</option>{warehouses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select required value={transferForm.toWarehouseId} onChange={(event) => setTransferForm({ ...transferForm, toWarehouseId: event.target.value })} className="rounded-xl border border-slate-200 px-4 py-3 text-sm"><option value="">إلى الفرع</option>{warehouses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
                    <select required value={transferForm.productId} onChange={(event) => setTransferForm({ ...transferForm, productId: event.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"><option value="">اختر المنتج</option>{products.map((item) => <option key={item.id} value={item.id}>{item.name_ar}</option>)}</select>
                    <div className="grid grid-cols-2 gap-3"><input required min="1" type="number" value={transferForm.quantity} onChange={(event) => setTransferForm({ ...transferForm, quantity: event.target.value })} placeholder="الكمية" className="rounded-xl border border-slate-200 px-4 py-3 text-sm" /><input value={transferForm.note} onChange={(event) => setTransferForm({ ...transferForm, note: event.target.value })} placeholder="ملاحظة" className="rounded-xl border border-slate-200 px-4 py-3 text-sm" /></div>
                    <button disabled={saving} className="w-full rounded-xl bg-brand-blue px-5 py-3 text-sm font-bold text-white disabled:opacity-60">تنفيذ التحويل</button>
                </form>
            </div>

            <section className="space-y-4"><h2 className="flex items-center gap-2 text-xl font-black text-slate-900"><Store className="w-5 h-5 text-brand-blue" />رصيد المخزون حسب الفرع</h2>
            {loading ? <div className="rounded-2xl bg-white p-10 text-center text-slate-400">جارٍ تحميل بيانات المخازن...</div> : inventoryByWarehouse.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-400">أضف أول فرع للبدء في توزيع المخزون حسب الولاية.</div> : <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{inventoryByWarehouse.map(({ warehouse, rows }) => <article key={warehouse.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div><h3 className="font-black text-slate-900">{warehouse.name}</h3><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin className="w-3.5 h-3.5" />{warehouse.city}، {warehouse.state}</p></div><button onClick={() => void changeWarehouseActive(warehouse)} className={`rounded-full px-3 py-1 text-xs font-bold ${warehouse.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{warehouse.is_active ? 'نشط' : 'متوقف'}</button></div><div className="mt-4 space-y-2 border-t border-slate-100 pt-3">{rows.length ? rows.map((row) => <div key={row.product_id} className="flex items-center justify-between text-sm"><span className="text-slate-700">{row.product?.[0]?.name_ar || 'منتج محذوف'}</span><span className={`font-black ${row.quantity <= row.reorder_level ? 'text-amber-600' : 'text-slate-900'}`}>{row.quantity} <small className="font-normal text-slate-400">/ حد {row.reorder_level}</small></span></div>) : <p className="text-sm text-slate-400">لا توجد كميات مسجلة بعد.</p>}</div></article>)}</div>}
            </section>

            {transfers.length > 0 && <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><h2 className="mb-4 font-black text-slate-900">آخر التحويلات</h2><div className="space-y-3">{transfers.map((transfer) => <div key={transfer.id} className="flex flex-col gap-1 rounded-xl bg-slate-50 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"><span className="font-bold text-slate-800">{transfer.product?.[0]?.name_ar || 'منتج'} — {transfer.quantity} وحدة</span><span className="text-slate-500">{transfer.from_warehouse?.[0]?.name || '—'} ← {transfer.to_warehouse?.[0]?.name || '—'}</span><span className="text-xs text-slate-400">{new Date(transfer.created_at).toLocaleDateString('ar-EG')}</span></div>)}</div></section>}
        </div>
    );
};
