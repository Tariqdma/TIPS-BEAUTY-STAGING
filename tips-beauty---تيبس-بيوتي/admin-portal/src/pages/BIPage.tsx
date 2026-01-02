import React, { useState } from 'react';
import {
    TrendingUp, PieChart, BarChart3, Sparkles,
    ArrowUpRight, ArrowDownRight, Layers,
    RefreshCw, Info, DollarSign, Plus, Tag, Edit2
} from 'lucide-react';

export const BIPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState('insights');

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">ذكاء الأعمال (BI)</h1>
                    <p className="text-slate-500 font-medium mt-1">التقارير المالية، هوامش الربح، والرؤى الإستراتيجية</p>
                </div>
                <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
                    <button
                        onClick={() => setActiveTab('insights')}
                        className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all ${activeTab === 'insights' ? 'bg-brand-blue text-white shadow-lg shadow-blue-200' : 'text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        رؤى Gemini
                    </button>
                    <button
                        onClick={() => setActiveTab('finance')}
                        className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all ${activeTab === 'finance' ? 'bg-brand-blue text-white shadow-lg shadow-blue-200' : 'text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        التحليل المالي
                    </button>
                    <button
                        onClick={() => setActiveTab('taxonomy')}
                        className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all ${activeTab === 'taxonomy' ? 'bg-brand-blue text-white shadow-lg shadow-blue-200' : 'text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        التصنيفات
                    </button>
                </div>
            </div>

            {activeTab === 'insights' && (
                <div className="space-y-8">
                    {/* Gemini Expanded Insight */}
                    <div className="bg-slate-900 p-10 rounded-[40px] shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-blue/10 rounded-full -mr-[250px] -mt-[250px] blur-[100px] animate-pulse"></div>
                        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full -ml-[200px] -mb-[200px] blur-[100px]"></div>

                        <div className="relative">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 mb-12">
                                <div className="flex items-center gap-5">
                                    <div className="w-16 h-16 bg-gradient-to-br from-brand-blue to-cyan-500 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-blue-900/50">
                                        <Sparkles className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black text-white tracking-tight">Gemini Strategic Hub</h2>
                                        <p className="text-cyan-400 font-bold uppercase tracking-widest text-xs mt-1">SUDANESE MARKET SPECIALIST</p>
                                    </div>
                                </div>
                                <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-xl text-white px-8 py-4 rounded-2xl font-black transition-all border border-white/10 shadow-xl group-hover:scale-105">
                                    <RefreshCw className="w-5 h-5" />
                                    تحديث التحليل اللحظي
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition-all cursor-default group/card">
                                    <div className="w-12 h-12 bg-brand-blue text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-900/40">
                                        <TrendingUp className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-white font-black text-xl mb-3 tracking-tight">سلوك المستهلك</h3>
                                    <p className="text-slate-400 text-sm font-medium leading-relaxed">
                                        تفضيلات مستهلكي الخرطوم تتجه نحو "العناية الطبية" (Dermaceuticals) بنسبة نمو 18%. يُنصح بزيادة تنوع منتجات CeraVe و La Roche-Posay لبناء الثقة.
                                    </p>
                                </div>
                                <div className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition-all cursor-default group/card">
                                    <div className="w-12 h-12 bg-blue-500 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-900/40">
                                        <PieChart className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-white font-black text-xl mb-3 tracking-tight">توزيع الطلب</h3>
                                    <p className="text-slate-400 text-sm font-medium leading-relaxed">
                                        مدينة بورتسودان تمثل حالياً 40% من مبيعات العناية بالبشرة. نقترح إنشاء مخزن توزيع إقليمي هناك لتقليل تكاليف الشحن وزمن التوصيل بنسبة 30%.
                                    </p>
                                </div>
                                <div className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition-all cursor-default group/card">
                                    <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-amber-900/40">
                                        <Layers className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-white font-black text-xl mb-3 tracking-tight">تحسين الهوامش</h3>
                                    <p className="text-slate-400 text-sm font-medium leading-relaxed">
                                        تكلفة الشحن الدولي ارتفعت. الحل هو تقليل "عروض الخصم المباشر" واستبدالها بـ "نقاط الولاء" لزيادة القيمة الشرطية للعميل دون التضحية بالهامش الفوري.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-12 bg-gradient-to-r from-brand-blue/20 to-blue-500/20 p-8 rounded-3xl border border-white/5 flex items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-2xl">
                                        <Info className="w-6 h-6 text-slate-900" />
                                    </div>
                                    <p className="text-slate-200 text-sm font-bold max-w-2xl">
                                        تم تحليل أكثر من 50,000 نقطة بيانات تشمل اتجاهات السوق الإقليمي، أسعار العملات، وتاريخ الطلبات في الـ 24 ساعة الماضية.
                                    </p>
                                </div>
                                <button className="bg-white text-slate-900 px-8 py-3.5 rounded-2xl font-black text-sm hover:scale-105 transition-transform whitespace-nowrap">
                                    عرض التقرير المفصل
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'finance' && (
                <div className="space-y-8 animate-in slide-in-from-bottom duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                            <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-emerald-500" />
                                تحليل الربح والخسارة (P&L)
                            </h3>
                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">إجمالي الإيرادات</p>
                                        <h4 className="text-2xl font-black text-slate-900">8,500,000 <span className="text-sm font-medium text-slate-400">ج.س</span></h4>
                                    </div>
                                    <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                                        <ArrowUpRight className="w-6 h-6" />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">تكلفة البضائع المباعة (COGS)</p>
                                        <h4 className="text-2xl font-black text-slate-900">5,200,000 <span className="text-sm font-medium text-slate-400">ج.س</span></h4>
                                    </div>
                                    <div className="p-3 bg-red-100 text-red-600 rounded-xl">
                                        <ArrowDownRight className="w-6 h-6" />
                                    </div>
                                </div>
                                <div className="p-8 bg-slate-900 rounded-3xl text-white block">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">إجمالي مجمل الربح</p>
                                    <h4 className="text-4xl font-black mb-4 tracking-tighter">3,300,000 <span className="text-lg font-medium text-slate-500">ج.س</span></h4>
                                    <div className="flex items-center gap-3">
                                        <span className="px-3 py-1 bg-emerald-500 text-white rounded-full text-xs font-black">Margin: 38.8%</span>
                                        <span className="text-slate-400 text-xs font-bold">أداء ممتاز للشهر الحالي</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-blue-500" />
                                    توزيع المبيعات حسب القنوات
                                </h3>
                                <button className="text-brand-blue font-bold text-xs hover:underline flex items-center gap-1">
                                    التفاصيل
                                    <ArrowUpRight className="w-3 h-3" />
                                </button>
                            </div>
                            <div className="flex-1 flex flex-col justify-center space-y-8">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <span className="text-sm font-black text-slate-700">المتجر الإلكتروني</span>
                                        <span className="text-xs font-bold text-slate-400">72% - 6.1M</span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                                        <div className="bg-brand-blue h-full w-[72%] shadow-lg shadow-blue-200"></div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <span className="text-sm font-black text-slate-700">تطبيق الموبايل</span>
                                        <span className="text-xs font-bold text-slate-400">20% - 1.7M</span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                                        <div className="bg-blue-500 h-full w-[20%] shadow-lg shadow-blue-200"></div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <span className="text-sm font-black text-slate-700">الوكلاء والموزعين</span>
                                        <span className="text-xs font-bold text-slate-400">8% - 0.7M</span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                                        <div className="bg-amber-500 h-full w-[8%] shadow-lg shadow-amber-200"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'taxonomy' && (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
                    <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-blue-50 text-brand-blue rounded-2xl flex items-center justify-center">
                                <Tag className="w-7 h-7" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">هيكلية التصنيفات (Taxonomy)</h3>
                                <p className="text-slate-500 text-sm font-medium">تنظيم شجرة المنتجات للمتجر</p>
                            </div>
                        </div>
                        <button className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-black text-sm hover:bg-slate-800 transition-all shadow-xl">
                            <RefreshCw className="w-4 h-4" />
                            إعادة ترتيب التصنيفات
                        </button>
                    </div>
                    {/* Placeholder Grid */}
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {['العناية بالبشرة', 'العناية بالشعر', 'المكياج', 'العطور', 'العدسات', 'الإكسسوارات'].map((cat, i) => (
                            <div key={i} className="p-6 bg-slate-50 border border-slate-100 rounded-3xl group hover:border-blue-300 transition-all cursor-pointer">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-black text-slate-400">ID: {100 + i}</span>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="p-1.5 bg-white text-slate-400 rounded-lg hover:text-slate-900"><Edit2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                </div>
                                <h4 className="text-lg font-black text-slate-900 mb-2">{cat}</h4>
                                <p className="text-xs text-slate-500 font-bold">128 منتج نشط</p>
                            </div>
                        ))}
                        <button className="p-6 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-brand-blue hover:border-blue-200 hover:bg-blue-50 transition-all">
                            <Plus className="w-8 h-8" />
                            <span className="font-black text-sm uppercase">إضافة تصنيف جديد</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
