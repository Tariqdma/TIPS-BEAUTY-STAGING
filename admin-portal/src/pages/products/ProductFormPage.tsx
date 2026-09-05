import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
    Save, ArrowRight, Loader2, Image as ImageIcon,
    Plus, Trash2, Tag, DollarSign, Package,
    Sparkles, Globe, Info, ShieldCheck,
    Search, Layout, Hash
} from 'lucide-react';
import type { Product, ProductVariant } from '../../types';

export const ProductFormPage: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!id;

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEditMode);
    const [activeTab, setActiveTab] = useState<'basic' | 'inventory' | 'marketing' | 'seo'>('basic');

    const [formData, setFormData] = useState<Partial<Product>>({
        name_ar: '',
        name_en: '',
        description: '',
        price: 0,
        cost_price: 0,
        discount_percentage: 0,
        brand: '',
        category: '',
        image: '',
        images: [],
        stock: 0,
        origin: 'Sudan',
        expiry: '',
        ingredients: [],
        benefits: [],
        usage: '',
        skin_type: ['All'],
        is_imported: true,
        variants: [],
        marketing_badge: '',
        meta_title: '',
        meta_description: ''
    });

    useEffect(() => {
        if (isEditMode) fetchProduct();
    }, [id]);

    const fetchProduct = async () => {
        try {
            const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
            if (error) throw error;
            if (data) {
                setFormData(data);
            }
        } catch (err) {
            console.error(err);
            navigate('/products');
        } finally {
            setFetching(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isEditMode) {
                const { error } = await supabase.from('products').update(formData).eq('id', id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('products').insert([formData]);
                if (error) throw error;
            }
            navigate('/products');
        } catch (error: any) {
            console.error(error);
            alert('فشل الحفظ: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) : value
        }));
    };

    const handleArrayInput = (name: keyof Product, value: string) => {
        setFormData(prev => ({
            ...prev,
            [name]: value.split(',').map(s => s.trim()).filter(Boolean)
        }));
    };

    const addVariant = () => {
        const newVariant: ProductVariant = { name: '', stock: 0, sku: '' };
        setFormData(prev => ({
            ...prev,
            variants: [...(prev.variants || []), newVariant]
        }));
    };

    const addImage = () => {
        const url = prompt('أدخل رابط الصورة (URL):');
        if (url) {
            setFormData(prev => ({
                ...prev,
                images: [...(prev.images || []), url],
                image: prev.image || url // Set as main image if none exists
            }));
        }
    };

    if (fetching) return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-brand-blue" />
            <p className="text-slate-400 font-bold animate-pulse">جاري جلب بيانات المنتج الفاخر...</p>
        </div>
    );

    return (
        <div className="max-w-[1400px] mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Action Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 sticky top-4 z-30 backdrop-blur-md bg-white/90">
                <div className="flex items-center gap-5">
                    <button
                        onClick={() => navigate('/products')}
                        className="p-4 bg-slate-50 hover:bg-blue-50 hover:text-brand-blue rounded-2xl transition-all group"
                    >
                        <ArrowRight className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                                {isEditMode ? 'تعديل تحفة تجميلية' : 'إضافة منتج فاخر جديد'}
                            </h1>
                            {!isEditMode && <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Draft Mode</span>}
                        </div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-0.5">Global Inventory & Logistics Hub</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button className="hidden md:flex items-center gap-2 text-slate-400 hover:text-slate-600 font-bold px-4 py-2 rounded-xl transition-all">
                        <Globe className="w-4 h-4" />
                        Preview Store
                    </button>
                    <button
                        form="product-form"
                        type="submit"
                        disabled={loading}
                        className="flex-1 md:flex-none bg-slate-900 hover:bg-slate-800 text-white font-black py-4 px-10 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-2xl shadow-slate-900/20 disabled:opacity-50 group active:scale-95"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                        <span>{isEditMode ? 'تحديث البيانات الإحترافية' : 'إطلاق المنتج في السوق'}</span>
                    </button>
                </div>
            </div>

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Left: Section Navigation */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm sticky top-32">
                        <nav className="space-y-2">
                            {[
                                { id: 'basic', label: 'المعلومات الأساسية', icon: Info },
                                { id: 'inventory', label: 'المخزون والبدائل', icon: Package },
                                { id: 'marketing', label: 'التسويق والميزات', icon: Sparkles },
                                { id: 'seo', label: 'تحسين محركات البحث', icon: Globe }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-black text-sm ${activeTab === tab.id
                                        ? 'bg-brand-blue text-white shadow-lg shadow-blue-200'
                                        : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                                        }`}
                                >
                                    <tab.icon className="w-5 h-5" />
                                    {tab.label}
                                    {activeTab === tab.id && <div className="mr-auto w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}
                                </button>
                            ))}
                        </nav>

                        <div className="mt-8 pt-8 border-t border-slate-50 px-4">
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">AI Completeness Score</p>
                                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: '85%' }}></div>
                                </div>
                                <p className="mt-3 text-[10px] font-bold text-center text-slate-500">Suggested: Add meta description</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Dynamic Form Sections */}
                <div className="lg:col-span-9 space-y-10">
                    <form id="product-form" onSubmit={handleSubmit} className="space-y-10">

                        {/* 1. Basic Information Section */}
                        {activeTab === 'basic' && (
                            <section className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
                                    <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-blue-50 text-brand-blue rounded-2xl flex items-center justify-center">
                                                <Info className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-slate-900">هوية المنتج والبيانات الوصفية</h3>
                                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">General Content & Taxonomy</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                اسم المنتج باللغة العربية
                                                <span className="text-brand-blue text-lg">*</span>
                                            </label>
                                            <input name="name_ar" value={formData.name_ar} onChange={handleChange} required placeholder="مثال: زيت الأرغان المغربي النقي" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 focus:ring-2 focus:ring-brand-blue outline-none font-bold text-slate-800 transition-all placeholder:text-slate-300" />
                                            <p className="text-[10px] text-slate-400 font-medium">سيظهر هذا الاسم كعنوان رئيسي في تطبيق العملاء.</p>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                Product Name (English)
                                                <span className="text-rose-500 text-lg">*</span>
                                            </label>
                                            <input name="name_en" value={formData.name_en} onChange={handleChange} required placeholder="Example: Pure Moroccan Argan Oil" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 focus:ring-2 focus:ring-rose-500 outline-none font-bold text-slate-800 transition-all placeholder:text-slate-300" dir="ltr" />
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-3 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">التصنيف الرئيسي</label>
                                            <div className="relative">
                                                <select name="category" value={formData.category} onChange={handleChange} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 focus:ring-2 focus:ring-rose-500 outline-none font-bold text-slate-800 appearance-none bg-transparent relative z-10 transition-all">
                                                    <option value="">اختر التصنيف...</option>
                                                    <option value="skincare">العناية بالبشرة</option>
                                                    <option value="makeup">المكياج</option>
                                                    <option value="haircare">العناية بالشعر</option>
                                                    <option value="fragrances">العطور</option>
                                                </select>
                                                <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">العلامة التجارية (Brand)</label>
                                            <div className="relative">
                                                <input name="brand" value={formData.brand} onChange={handleChange} placeholder="The Ordinary, CeraVe..." className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 focus:ring-2 focus:ring-brand-blue outline-none font-bold text-slate-800 transition-all" />
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">بلد المنشأ</label>
                                            <input name="origin" value={formData.origin} onChange={handleChange} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 focus:ring-2 focus:ring-rose-500 outline-none font-bold text-slate-800 transition-all" />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">وصف المنتج (القصة والفوائد)</label>
                                        <textarea name="description" value={formData.description} onChange={handleChange} rows={6} className="w-full p-6 bg-slate-50 rounded-[2rem] border border-slate-100 focus:ring-2 focus:ring-brand-blue outline-none font-medium text-slate-600 leading-relaxed transition-all" placeholder="اكتب وصفاً جذاباً يشمل القصة وراء المنتج وكيفية صنعه وفائدته للعميل..." />
                                    </div>
                                </div>

                                {/* Media Gallery Section */}
                                <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                                                <ImageIcon className="w-6 h-6 text-indigo-500" />
                                                معرض الصور الفاخر
                                            </h3>
                                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Multi-angle visuals (1:1 Ratio recommended)</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={addImage}
                                            className="bg-indigo-50 text-indigo-600 px-6 py-2 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-indigo-100 transition-all border border-indigo-100"
                                        >
                                            <Plus className="w-4 h-4" />
                                            إضافة صور إضافية
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                        {formData.images?.map((url, idx) => (
                                            <div key={idx} className="relative aspect-square rounded-[2rem] overflow-hidden bg-slate-50 border border-slate-100 group shadow-sm hover:shadow-xl transition-all hover:-translate-y-1">
                                                <img src={url} alt="Gallery" className="w-full h-full object-cover" />
                                                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/50 to-transparent translate-y-full group-hover:translate-y-0 transition-transform">
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData(p => ({ ...p, images: p.images?.filter((_, i) => i !== idx) }))}
                                                        className="w-full py-1.5 bg-red-500 text-white rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                        حذف
                                                    </button>
                                                </div>
                                                {formData.image === url && (
                                                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-emerald-500 text-white text-[8px] font-black rounded-full uppercase">Hero</div>
                                                )}
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={addImage}
                                            className="aspect-square border-4 border-dashed border-slate-50 rounded-[2.5rem] flex flex-col items-center justify-center gap-3 text-slate-300 hover:text-brand-blue hover:border-blue-100 hover:bg-blue-50 transition-all group"
                                        >
                                            <div className="p-4 bg-white rounded-2xl shadow-sm group-hover:shadow-blue-100 group-hover:scale-110 transition-all">
                                                <Plus className="w-8 h-8" />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest">Add Media</span>
                                        </button>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* 2. Inventory & Variants Section */}
                        {activeTab === 'inventory' && (
                            <section className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                                    <div className="relative">
                                        <h3 className="text-xl font-black text-white flex items-center gap-4 mb-10">
                                            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                                                <DollarSign className="w-6 h-6" />
                                            </div>
                                            التحليل المالي والمخزون
                                        </h3>

                                        <div className="grid md:grid-cols-2 gap-10">
                                            <div className="space-y-6">
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">سعر البيع المقترح (ج.س)</label>
                                                    <div className="relative">
                                                        <input type="number" name="price" value={formData.price} onChange={handleChange} className="w-full p-6 bg-white/5 border border-white/10 rounded-[2rem] outline-none focus:ring-2 focus:ring-emerald-500 font-black text-3xl text-white transition-all" />
                                                        <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                            <span className="text-slate-500 font-black">SDG</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">تكلفة الإستيراد (Cost Price)</label>
                                                    <input type="number" name="cost_price" value={formData.cost_price} onChange={handleChange} className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-brand-blue font-bold text-xl text-blue-300" />
                                                    <div className="flex items-center justify-between px-2">
                                                        <p className="text-[10px] text-slate-500 font-bold uppercase">Estimated Gross Margin</p>
                                                        <span className="text-[10px] text-emerald-400 font-black">{((formData.price! - formData.cost_price!) / (formData.price || 1) * 100).toFixed(1)}%</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] space-y-6">
                                                <div className="flex items-center gap-4 mb-2">
                                                    <Package className="w-6 h-6 text-blue-400" />
                                                    <h4 className="text-white font-black">إدارة المستودع</h4>
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">الكمية الكلية المتوفرة</label>
                                                    <div className="relative">
                                                        <input type="number" name="stock" value={formData.stock} onChange={handleChange} className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-black text-2xl text-white" />
                                                        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 w-5 h-5" />
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                                                    <p className="text-[10px] text-blue-200 font-bold leading-tight">سيتم تنبيهك تلقائياً عند وصول المخزون إلى أقل من 5 وحدات.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Variants Section */}
                                <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                                                <Layout className="w-6 h-6 text-amber-500" />
                                                البدائل والألوان (Variants)
                                            </h3>
                                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Manage sizes, shades, or specific flavors</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={addVariant}
                                            className="bg-amber-50 text-amber-600 px-6 py-2 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-amber-100 transition-all border border-amber-100"
                                        >
                                            <Plus className="w-4 h-4" />
                                            إضافة بديل جديد
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {formData.variants?.map((v, idx) => (
                                            <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100 group relative">
                                                <div className="space-y-2">
                                                    <label className="text-[8px] font-black text-slate-400 uppercase">اسم البديل</label>
                                                    <input
                                                        value={v.name}
                                                        onChange={(e) => {
                                                            const nv = [...(formData.variants || [])];
                                                            nv[idx].name = e.target.value;
                                                            setFormData(p => ({ ...p, variants: nv }));
                                                        }}
                                                        placeholder="مثلاً: 50 مل، أحمر"
                                                        className="w-full p-3 bg-white rounded-xl border border-slate-100 focus:ring-2 focus:ring-rose-500 outline-none font-bold text-sm"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[8px] font-black text-slate-400 uppercase">SKU / رمز التخزين</label>
                                                    <input
                                                        value={v.sku}
                                                        onChange={(e) => {
                                                            const nv = [...(formData.variants || [])];
                                                            nv[idx].sku = e.target.value;
                                                            setFormData(p => ({ ...p, variants: nv }));
                                                        }}
                                                        placeholder="TB-SKIN-01"
                                                        className="w-full p-3 bg-white rounded-xl border border-slate-100 focus:ring-2 focus:ring-brand-blue outline-none font-bold text-sm"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[8px] font-black text-slate-400 uppercase">المخزون المحدد</label>
                                                    <input
                                                        type="number"
                                                        value={v.stock}
                                                        onChange={(e) => {
                                                            const nv = [...(formData.variants || [])];
                                                            nv[idx].stock = parseInt(e.target.value);
                                                            setFormData(p => ({ ...p, variants: nv }));
                                                        }}
                                                        className="w-full p-3 bg-white rounded-xl border border-slate-100 focus:ring-2 focus:ring-brand-blue outline-none font-bold text-sm"
                                                    />
                                                </div>
                                                <div className="flex items-end pb-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData(p => ({ ...p, variants: p.variants?.filter((_, i) => i !== idx) }))}
                                                        className="flex items-center gap-2 text-red-400 hover:text-red-500 font-bold text-xs"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        إزالة
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {(!formData.variants || formData.variants.length === 0) && (
                                            <div className="p-12 border-2 border-dashed border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-300">
                                                <Layout className="w-12 h-12 mb-4 opacity-20" />
                                                <p className="text-xs font-bold uppercase tracking-widest">No Variants Configured</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* 3. Marketing & Insights Section */}
                        {activeTab === 'marketing' && (
                            <section className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-10">
                                    <h3 className="text-xl font-black text-slate-900 border-b border-slate-50 pb-6 flex items-center gap-4">
                                        <Sparkles className="w-6 h-6 text-brand-blue" />
                                        أدوات التسويق والجاذبية
                                    </h3>

                                    <div className="grid md:grid-cols-2 gap-10">
                                        <div className="space-y-6">
                                            <div className="space-y-3">
                                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">شارة العرض (Marketing Badge)</label>
                                                <select name="marketing_badge" value={formData.marketing_badge} onChange={handleChange} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-slate-800">
                                                    <option value="">لا يوجد</option>
                                                    <option value="New Arrival">وصل حديثاً</option>
                                                    <option value="Best Seller">الأكثر مبيعاً</option>
                                                    <option value="Limited Edition">إصدار محدود</option>
                                                    <option value="Editor's Choice">اختيار الخبراء</option>
                                                </select>
                                                <p className="text-[10px] text-slate-400 font-medium">سيظهر هذا الملصق على صورة المنتج في المتجر.</p>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">خصم خاص (%)</label>
                                                <div className="relative">
                                                    <input type="number" name="discount_percentage" value={formData.discount_percentage} onChange={handleChange} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-slate-800" />
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-blue font-black">%</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="space-y-3">
                                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">نوع البشرة المناسب (أدخل مفصولاً بفاصلة)</label>
                                                <div className="relative">
                                                    <input
                                                        value={formData.skin_type?.join(', ')}
                                                        onChange={(e) => handleArrayInput('skin_type', e.target.value)}
                                                        placeholder="All, Dry, Oily, Sensitive..."
                                                        className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-slate-800"
                                                    />
                                                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">تاريخ انتهاء الفعالية</label>
                                                <input type="date" name="expiry" value={formData.expiry} onChange={handleChange} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-slate-800" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-10">
                                        <div className="space-y-3">
                                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">المكونات الرئيسية (للبحث والفلترة)</label>
                                            <textarea
                                                value={formData.ingredients?.join(', ')}
                                                onChange={(e) => handleArrayInput('ingredients', e.target.value)}
                                                rows={4}
                                                className="w-full p-5 bg-slate-50 rounded-[2rem] border border-slate-100 font-medium text-slate-600 leading-relaxed"
                                                placeholder="أدخل المكونات مفصولة بفاصلة (مثال: فيتامين C, هيالورونيك أسيد)..."
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">المميزات والنتائج المتوقعة</label>
                                            <textarea
                                                value={formData.benefits?.join(', ')}
                                                onChange={(e) => handleArrayInput('benefits', e.target.value)}
                                                rows={4}
                                                className="w-full p-5 bg-slate-50 rounded-[2rem] border border-slate-100 font-medium text-slate-600 leading-relaxed"
                                                placeholder="أدخل المميزات مفصولة بفاصلة (مثال: تفتيح البشرة، ترطيب عميق)..."
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest text-right">طريقة الإستخدام الإحترافية</label>
                                        <textarea name="usage" value={formData.usage} onChange={handleChange} rows={3} className="w-full p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 font-medium text-slate-600 text-right" placeholder="اشرح للعميل كيفية الحصول على أفضل النتائج..." />
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* 4. SEO Optimization Section */}
                        {activeTab === 'seo' && (
                            <section className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-10">
                                    <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                                        <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center">
                                            <Globe className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-900">تحسين الظهور على محركات البحث (SEO)</h3>
                                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Search Engine Optimization Meta Suite</p>
                                        </div>
                                    </div>

                                    <div className="space-y-8">
                                        <div className="space-y-3">
                                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Meta Title (عنوان الصفحة)</label>
                                            <input name="meta_title" value={formData.meta_title} onChange={handleChange} placeholder="أفضل زيت أرغان في السودان | تيبس بيوتي" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-slate-800" />
                                            <p className="text-[10px] text-slate-400">ينصح بأن لا يتجاوز العنوان 60 حرفاً.</p>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Meta Description (وصف محركات البحث)</label>
                                            <textarea name="meta_description" value={formData.meta_description} onChange={handleChange} rows={4} className="w-full p-5 bg-slate-50 rounded-[2rem] border border-slate-100 font-medium text-slate-600 leading-relaxed" placeholder="اكتشف روتين العناية المتكامل مع تيبس بيوتي. شحن سريع لجميع مدن السودان..." />
                                            <p className="text-[10px] text-slate-400">ينصح بأن يتراوح الوصف بين 150-160 حرفاً.</p>
                                        </div>

                                        {/* Google Preview Simulation */}
                                        <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 space-y-2">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Google Search Preview</p>
                                            <p className="text-blue-600 text-xl font-medium hover:underline cursor-pointer truncate">{formData.meta_title || (formData.name_ar + ' | Tips Beauty')}</p>
                                            <p className="text-emerald-700 text-sm">https://tipsbeauty-sd.com/product/{formData.id || 'slug'}</p>
                                            <p className="text-slate-500 text-sm line-clamp-2">{formData.meta_description || 'اكتشف أفضل منتجات التجميل العالمية في السودان عبر منصة تيبس بيوتي. عروض حصرية ومنتجات أصلية 100%.'}</p>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                    </form>
                </div>
            </div>
        </div>
    );
};
