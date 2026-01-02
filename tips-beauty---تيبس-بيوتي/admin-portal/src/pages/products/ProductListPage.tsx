
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Product } from '../../types';
import {
    Plus, Edit, Trash2, Search, Filter, Download,
    BarChart3, TrendingUp,
    Eye, Package, Sparkles
} from 'lucide-react';

export const ProductListPage: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) setProducts(data);
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا المنتج بشكل نهائي؟')) return;

        try {
            const { error } = await supabase.from('products').delete().eq('id', id);
            if (error) throw error;
            setProducts(products.filter(p => p.id !== id));
        } catch (error) {
            alert('فشل الحذف');
            console.error(error);
        }
    };

    const filteredProducts = products.filter(p =>
        p.name_ar.includes(searchTerm) ||
        p.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.brand?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 border-4 border-blue-100 border-t-brand-blue rounded-full animate-spin"></div>
            <p className="text-slate-400 font-black animate-pulse uppercase tracking-widest text-xs">Syncing Premium Inventory...</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Package className="w-8 h-8 text-brand-blue" />
                        كتالوج المنتجات الفاخرة
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">إدارة المخزون، التسعير، وتحليل الأداء للمنتجات التجميلية</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-5 py-3 rounded-2xl font-bold hover:bg-slate-50 transition-all shadow-sm">
                        <Download className="w-4 h-4" />
                        تصدير البيانات
                    </button>
                    <Link
                        to="/products/new"
                        className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 transition-all shadow-xl shadow-slate-900/20 active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        إضافة منتج جديد
                    </Link>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
                    <div className="w-14 h-14 bg-blue-50 text-brand-blue rounded-2xl flex items-center justify-center border border-blue-100">
                        <BarChart3 className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total SKU Count</p>
                        <h4 className="text-2xl font-black text-slate-900">{products.length} منتج</h4>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
                    <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center border border-emerald-100">
                        <TrendingUp className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">In-Stock Value</p>
                        <h4 className="text-2xl font-black text-slate-900">{products.reduce((acc, p) => acc + (p.price * p.stock), 0).toLocaleString()} ج.س</h4>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
                    <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center border border-amber-100">
                        <Sparkles className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Promotions</p>
                        <h4 className="text-2xl font-black text-slate-900">{products.filter(p => p.marketing_badge).length} عرض</h4>
                    </div>
                </div>
            </div>

            {/* Filter & Table Area */}
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/30">
                    <div className="relative flex-1 max-w-md">
                        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="البحث بالاسم، الماركة، أو الرمز..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-6 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-blue/10 focus:border-blue-300 transition-all font-medium text-sm"
                        />
                    </div>
                    <div className="flex gap-3">
                        <button className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 transition-all text-sm">
                            <Filter className="w-4 h-4" />
                            تصفية
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">المنتج والماركة</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">التصنيف</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">السعر المالي</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">المخزون / البدائل</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">الحالة التسويقية</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredProducts.map((product) => (
                                <tr key={product.id} className="hover:bg-slate-50/50 transition-all group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <img
                                                    src={product.image}
                                                    alt={product.name_ar}
                                                    className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-100 shadow-sm group-hover:scale-105 transition-transform"
                                                />
                                                {product.is_imported && (
                                                    <div className="absolute -top-2 -right-2 bg-indigo-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase border-2 border-white">Import</div>
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 text-sm mb-0.5">{product.name_ar}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{product.brand}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                            {product.category}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div>
                                            <p className="font-black text-slate-900 text-sm">{product.price.toLocaleString()} ج.س</p>
                                            <p className="text-[10px] text-emerald-500 font-bold">Margin: {(((product.price - (product.cost_price || 0)) / product.price) * 100).toFixed(0)}%</p>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className={`w - 2 h - 2 rounded - full ${product.stock > 10 ? 'bg-emerald-500' : product.stock > 0 ? 'bg-amber-500' : 'bg-red-500'} `} />
                                            <div>
                                                <p className={`text - sm font - black ${product.stock === 0 ? 'text-red-500' : 'text-slate-700'} `}>
                                                    {product.stock > 0 ? `${product.stock} مندوب` : 'نفذ الكمية'}
                                                </p>
                                                {product.variants && product.variants.length > 0 && (
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{product.variants.length} Variants Active</p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        {product.marketing_badge ? (
                                            <div className="flex items-center gap-2 text-brand-blue">
                                                <Sparkles className="w-4 h-4" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">{product.marketing_badge}</span>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Standard</span>
                                        )}
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center justify-center gap-3">
                                            <button className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all">
                                                <Eye className="w-5 h-5" />
                                            </button>
                                            <Link
                                                to={`/ products / edit / ${product.id} `}
                                                className="p-2 text-slate-400 hover:text-brand-blue hover:bg-blue-50 rounded-xl transition-all"
                                            >
                                                <Edit className="w-5 h-5" />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(product.id || '')}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredProducts.length === 0 && (
                    <div className="p-20 text-center space-y-4">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                            <Search className="w-10 h-10 text-slate-200" />
                        </div>
                        <div>
                            <p className="text-slate-900 font-black">لا توجد منتجات مطابقة لعملية البحث</p>
                            <p className="text-slate-400 text-sm mt-1">جرب استخدام كلمات مفتاحية مختلفة أو تغيير التصنيف</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
