import React, { useState, useEffect } from 'react';
import {
    TrendingUp, ShoppingBag, DollarSign,
    ArrowUpRight, Plus,
    Download, Calendar, Sparkles, UserCheck
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState({
        revenue: 0,
        profit: 0,
        orders: 0,
        promos: 0,
        growth: 12.5
    });

    useEffect(() => {
        fetchDashboardStats();
    }, []);

    const fetchDashboardStats = async () => {
        try {
            // 1. Fetch Orders for Revenue and Order Count
            const { data: orders } = await supabase.from('orders').select('total, items');
            const revenue = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
            const orderCount = orders?.length || 0;

            // 2. Calculate Profit (Sale - Cost)
            let totalCost = 0;
            orders?.forEach(order => {
                order.items?.forEach((item: any) => {
                    const cost = item.costPrice || 0;
                    totalCost += cost * (item.quantity || 1);
                });
            });
            const profit = revenue - totalCost;

            // 3. Simple Mock for Promos for now
            const { count: promoCount } = await supabase.from('promotions').select('*', { count: 'exact', head: true });

            setStats({
                revenue,
                profit,
                orders: orderCount,
                promos: promoCount || 0,
                growth: 15.8
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const kpiCards = [
        { label: 'إجمالي الإيرادات', value: `${stats.revenue.toLocaleString()} ج.س`, icon: DollarSign, color: 'blue', trend: '+12%' },
        { label: 'صافي الربح', value: `${stats.profit.toLocaleString()} ج.س`, icon: TrendingUp, color: 'emerald', trend: '+8.4%' },
        { label: 'عدد الطلبات', value: stats.orders.toString(), icon: ShoppingBag, color: 'blue', trend: '+5%' },
        { label: 'العروض النشطة', value: stats.promos.toString(), icon: Sparkles, color: 'amber', trend: 'ثابت' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">نظرة عامة على العمل</h1>
                    <p className="text-slate-500 font-medium mt-1">مرحباً بك مجدداً في مركز إدارة تيبس بيوتي</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-bold hover:bg-slate-50 transition-all text-sm shadow-sm">
                        <Calendar className="w-4 h-4" />
                        آخر 30 يوم
                    </button>
                    <button className="flex items-center gap-2 bg-brand-blue text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all text-sm shadow-lg shadow-blue-200">
                        <Download className="w-4 h-4" />
                        تصدير التقارير
                    </button>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpiCards.map((card, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-${card.color}-50 rounded-full -mr-12 -mt-12 opacity-50 group-hover:scale-110 transition-transform`}></div>
                        <div className="relative">
                            <div className={`w-12 h-12 rounded-2xl bg-${card.color}-50 flex items-center justify-center text-${card.color}-600 mb-4 border border-${card.color}-100`}>
                                <card.icon className="w-6 h-6" />
                            </div>
                            <p className="text-sm font-bold text-slate-500 mb-1">{card.label}</p>
                            <h3 className="text-2xl font-black text-slate-900">{card.value}</h3>
                            <div className="mt-4 flex items-center gap-2">
                                <span className={`flex items-center text-xs font-black ${card.trend.includes('-') ? 'text-red-500' : 'text-emerald-500'}`}>
                                    {card.trend}
                                    <ArrowUpRight className="w-3 h-3 ml-1" />
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">مقارنة بالشهر الماضي</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Quick Actions */}
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col h-full">
                    <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-brand-blue" />
                        إجراءات سريعة
                    </h3>
                    <div className="grid grid-cols-2 gap-4 flex-1">
                        <button className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 hover:bg-blue-50 hover:border-blue-100 hover:text-brand-blue transition-all group">
                            <div className="p-3 bg-white rounded-xl shadow-sm group-hover:shadow-blue-100">
                                <Plus className="w-6 h-6" />
                            </div>
                            <span className="font-bold text-sm">إضافة منتج</span>
                        </button>
                        <button className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 hover:bg-amber-50 hover:border-amber-100 hover:text-amber-600 transition-all group">
                            <div className="p-3 bg-white rounded-xl shadow-sm group-hover:shadow-amber-100">
                                <Sparkles className="w-6 h-6" />
                            </div>
                            <span className="font-bold text-sm">إنشاء عرض</span>
                        </button>
                        <button className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 hover:bg-blue-50 hover:border-blue-100 hover:text-blue-600 transition-all group">
                            <div className="p-3 bg-white rounded-xl shadow-sm group-hover:shadow-blue-100">
                                <UserCheck className="w-6 h-6" />
                            </div>
                            <span className="font-bold text-sm">تعيين سائق</span>
                        </button>
                        <button className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 hover:bg-emerald-50 hover:border-emerald-100 hover:text-emerald-600 transition-all group">
                            <div className="p-3 bg-white rounded-xl shadow-sm group-hover:shadow-emerald-100">
                                <Download className="w-6 h-6" />
                            </div>
                            <span className="font-bold text-sm">تصدير مبيعات</span>
                        </button>
                    </div>
                </div>

                {/* AI Strategic Insights */}
                <div className="lg:col-span-2 bg-slate-900 p-8 rounded-3xl shadow-xl relative overflow-hidden flex flex-col h-full">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                    <div className="relative flex flex-col h-full">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-blue-400">
                                    <Sparkles className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white tracking-tight">رؤى Gemini الإستراتيجية</h3>
                                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">مدعوم بالذكاء الاصطناعي</p>
                                </div>
                            </div>
                            <span className="px-3 py-1 bg-brand-blue text-white text-[10px] font-black rounded-full uppercase tracking-tighter shadow-lg shadow-blue-900/50">Live Analysis</span>
                        </div>

                        <div className="space-y-4 flex-1">
                            <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-5 rounded-2xl group hover:border-brand-blue/30 transition-all">
                                <p className="text-blue-400 text-xs font-black uppercase mb-2 tracking-widest">توصية السوق المحلي</p>
                                <p className="text-slate-200 text-sm font-medium leading-relaxed">
                                    هناك زيادة ملحوظة في الطلب على مجموعات العناية بالبشرة الواقية من الشمس في منطقة بورتسودان بنسبة 22%. نقترح تفعيل عرض "صيف الساحل" لزيادة المبيعات.
                                </p>
                            </div>
                            <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-5 rounded-2xl group hover:border-blue-500/30 transition-all">
                                <p className="text-blue-400 text-xs font-black uppercase mb-2 tracking-widest">تحليل المخزون</p>
                                <p className="text-slate-200 text-sm font-medium leading-relaxed">
                                    منتجات تفتيح البشرة من ماركة "CeraVe" توشك على النفاد. معدل الدوران الحالي يشير إلى الحاجة لإعادة طلب 50 وحدة لضمان توفرها خلال عطلة العيد.
                                </p>
                            </div>
                        </div>

                        <button className="mt-6 w-full py-3.5 bg-white text-slate-900 rounded-xl font-black text-sm hover:bg-slate-100 transition-all shadow-xl">
                            توليد تقرير إستراتيجي شامل
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
