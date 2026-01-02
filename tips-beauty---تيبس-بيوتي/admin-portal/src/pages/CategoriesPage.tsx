import React, { useState } from 'react';
import { Plus, Edit2, Trash2, FolderTree, Search, Layers } from 'lucide-react';


export const CategoriesPage: React.FC = () => {
    const [categories] = useState([
        { id: 1, name: 'العناية بالبشرة', slugs: 'skincare', productCount: 45, icon: '✨' },
        { id: 2, name: 'المكياج', slugs: 'makeup', productCount: 32, icon: '💄' },
        { id: 3, name: 'العطور', slugs: 'fragrances', productCount: 28, icon: '🌸' },
        { id: 4, name: 'العناية بالشعر', slugs: 'haircare', productCount: 15, icon: '💇‍♀️' },
        { id: 5, name: 'العدسات', slugs: 'lenses', productCount: 12, icon: '👁️' },
        { id: 6, name: 'الإكسسوارات', slugs: 'accessories', productCount: 8, icon: '💍' },
    ]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">التصنيفات والهيكلية</h1>
                    <p className="text-slate-500 font-medium mt-1">تنظيم شجرة المنتجات والتصنيفات في المتجر</p>
                </div>
                <button className="flex items-center gap-2 bg-brand-blue text-white px-6 py-3 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
                    <Plus className="w-5 h-5" />
                    إضافة تصنيف رئيسي
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Stats Sidebar */}
                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                        <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                            <Layers className="w-5 h-5 text-brand-blue" />
                            إحصائيات الشجرة
                        </h3>
                        <div className="space-y-6">
                            <div className="flex justify-between items-center text-sm font-bold">
                                <span className="text-slate-500">تصنيفات رئيسية</span>
                                <span className="text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">8</span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-bold text-brand-blue">
                                <span className="">تصنيفات فرعية</span>
                                <span className="bg-blue-50 px-3 py-1 rounded-lg">24</span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-bold text-blue-500">
                                <span className="">إجمالي المنتجات</span>
                                <span className="bg-blue-50 px-3 py-1 rounded-lg">140</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900 p-8 rounded-3xl shadow-xl">
                        <h3 className="text-white font-black mb-4 flex items-center gap-2">
                            <FolderTree className="w-5 h-5 text-emerald-400" />
                            نصيحة Gemini
                        </h3>
                        <p className="text-slate-400 text-sm font-medium leading-relaxed">
                            إضافة تصنيف فرعي لـ "العناية بالشعر" متخصص في "البروتين والكيراتين" سيزيد من دقة البحث لعملائنا في السودان بنسبة 15%.
                        </p>
                    </div>
                </div>

                {/* Categories Grid */}
                <div className="lg:col-span-3">
                    <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm mb-6 flex items-center gap-4">
                        <div className="flex-1 relative">
                            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input type="text" placeholder="البحث عن تصنيف..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand-blue" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {categories.map((cat) => (
                            <div key={cat.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group border-b-4 border-b-slate-50 hover:border-b-brand-blue">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="text-3xl bg-slate-50 w-14 h-14 rounded-2xl flex items-center justify-center border border-slate-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                                        {cat.icon}
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><Edit2 className="w-4 h-4" /></button>
                                        <button className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                                <h4 className="text-xl font-black text-slate-900 mb-1">{cat.name}</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4">Slug: {cat.slugs}</p>

                                <div className="flex items-center justify-between mt-auto pt-6 border-t border-slate-50">
                                    <span className="text-xs font-black text-slate-600">{cat.productCount} منتج</span>
                                    <button className="text-[10px] font-black uppercase text-brand-blue hover:underline">إدارة الفرعية</button>
                                </div>
                            </div>
                        ))}
                        <button className="p-8 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-4 text-slate-400 hover:text-brand-blue hover:border-blue-200 hover:bg-blue-50 transition-all font-black text-sm uppercase tracking-widest group">
                            <div className="w-12 h-12 rounded-full border-2 border-slate-200 border-dashed flex items-center justify-center group-hover:border-blue-200 group-hover:rotate-90 transition-all">
                                <Plus className="w-6 h-6" />
                            </div>
                            إضافة مجموعات جديدة
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
