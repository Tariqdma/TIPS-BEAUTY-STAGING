import React, { useState } from 'react';
import {
    Sparkles, Tag, Calendar, Target, Plus,
    Gift, UserCheck, Trash2, Edit2, CreditCard
} from 'lucide-react';

export const MarketingPage: React.FC = () => {
    const [promos] = useState([
        { id: 1, name: 'خصم الشتاء', target: 'جميع المنتجات', discount: '20%', status: 'نشط', type: 'نسبة' },
        { id: 2, name: 'عروض العطور', target: 'تصنيف: العطور', discount: '500 ج.س', status: 'مجدول', type: 'مبلغ ثابت' },
    ]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">التسويق والعروض</h1>
                    <p className="text-slate-500 font-medium mt-1">إدارة الحملات الترويجية، الخصومات ونقاط الولاء</p>
                </div>
                <button className="flex items-center gap-2 bg-brand-blue text-white px-6 py-3 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
                    <Plus className="w-5 h-5" />
                    إنشاء عرض جديد
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Promotions Engine */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                            <h3 className="font-black text-slate-900 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-brand-blue" />
                                العروض النشطة والمجدولة
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-right">
                                <thead>
                                    <tr className="border-b border-slate-50">
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">اسم العرض</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">الخصم</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">يستهدف</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">الحالة</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {promos.map((promo) => (
                                        <tr key={promo.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-slate-900 text-sm">{promo.name}</p>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <Calendar className="w-3 h-3 text-slate-400" />
                                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">01 Dec - 31 Dec</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-black">
                                                    {promo.discount}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Target className="w-3.5 h-3.5 text-slate-300" />
                                                    <span className="text-xs font-bold text-slate-600">{promo.target}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase ${promo.status === 'نشط' ? 'bg-brand-blue text-white' : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                    {promo.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-100 transition-all">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition-all">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Quick Promo Creator */}
                    <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-brand-blue/20 transition-all"></div>
                        <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
                            <Tag className="w-5 h-5 text-brand-blue" />
                            مولد الخصومات السريع
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">مكان العرض</label>
                                <select className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-rose-500 font-bold text-xs appearance-none">
                                    <option>جميع المنتجات</option>
                                    <option>تصنيف معين</option>
                                    <option>منتج واحد فقط</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">قيمة الخصم</label>
                                <div className="flex gap-2">
                                    <input type="text" placeholder="20" className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-blue font-black text-sm" />
                                    <select className="bg-brand-blue text-white rounded-xl px-3 py-2.5 font-black text-xs">
                                        <option>%</option>
                                        <option>ج.س</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-end">
                                <button className="w-full bg-white text-slate-900 font-black text-sm py-2.5 rounded-xl hover:bg-slate-100 transition-all shadow-lg active:scale-95">
                                    تفعيل فوري!
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Loyalty & Beauty Points */}
                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden h-full">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-brand-blue border border-blue-100">
                                <Gift className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900 tracking-tight">نظام نقاط الجمال</h3>
                                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Beauty Points Sync</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-xs font-bold text-slate-500 mb-1">إجمالي النقاط الموزعة</p>
                                <h4 className="text-2xl font-black text-slate-900">1,245,600 <span className="text-xs font-medium text-slate-400 ml-1">نقطة</span></h4>
                                <div className="mt-3 w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                                    <div className="bg-brand-blue h-full w-2/3"></div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">قواعد النقاط</h5>
                                <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:border-blue-200 transition-all cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <CreditCard className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm font-bold text-slate-700">لكل 1000 ج.س شراء</span>
                                    </div>
                                    <span className="text-sm font-black text-brand-blue">10 نقاط</span>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:border-blue-200 transition-all cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <UserCheck className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm font-bold text-slate-700">بمناسبة يوم الأم</span>
                                    </div>
                                    <span className="text-sm font-black text-emerald-500">نقاط مضاعفة</span>
                                </div>
                            </div>

                            <button className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-slate-800 transition-all shadow-xl">
                                إدارة عملاء الولاء
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
