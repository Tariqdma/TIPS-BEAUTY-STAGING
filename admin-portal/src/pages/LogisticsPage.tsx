import React, { useState } from 'react';
import {
    Truck, UserPlus, MapPin, Navigation,
    Phone, CheckCircle, AlertTriangle, Search
} from 'lucide-react';

export const LogisticsPage: React.FC = () => {
    const [drivers] = useState([
        { id: 1, name: 'محمد أحمد', phone: '0912345678', vehicle: 'Hyundai Accent (White)', status: 'available', trips: 12 },
        { id: 2, name: 'ياسر علي', phone: '0987654321', vehicle: 'Toyota Hilux (Silver)', status: 'busy', trips: 8 },
        { id: 3, name: 'عمر عثمان', phone: '0901234567', vehicle: 'Motorcycle', status: 'offline', trips: 15 },
    ]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">الخدمات اللوجستية</h1>
                    <p className="text-slate-500 font-medium mt-1">إدارة السائقين، تعيين الرحلات، ومتابعة التوصيل</p>
                </div>
                <button className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black hover:bg-slate-800 transition-all shadow-xl">
                    <UserPlus className="w-5 h-5" />
                    إضافة سائق جديد
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Real-time Fleet Status */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100">
                                <Navigation className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">متاح الآن</p>
                                <h4 className="text-xl font-black text-slate-900">5 سائقين</h4>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-100">
                                <Truck className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">في رحلة</p>
                                <h4 className="text-xl font-black text-slate-900">12 طلب</h4>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center border border-red-100">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">تأخيرات</p>
                                <h4 className="text-xl font-black text-slate-900">2 طلب</h4>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                            <h3 className="font-black text-slate-900">قائمة السائقين والمناديب</h3>
                            <div className="relative">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input type="text" placeholder="البحث..." className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-brand-blue" />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-right border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-50">
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">السائق</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">المركبة</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">الحالة</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">الرحلات</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">التواصل</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {drivers.map((driver) => (
                                        <tr key={driver.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 font-black text-sm">
                                                        {driver.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 text-sm">{driver.name}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Certified Porter</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-xs font-bold text-slate-600">{driver.vehicle}</p>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase inline-flex items-center gap-1.5 ${driver.status === 'available' ? 'bg-emerald-50 text-emerald-600' :
                                                    driver.status === 'busy' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${driver.status === 'available' ? 'bg-emerald-500' :
                                                        driver.status === 'busy' ? 'bg-blue-500' : 'bg-slate-400'
                                                        }`}></span>
                                                    {driver.status === 'available' ? 'متاح' :
                                                        driver.status === 'busy' ? 'في رحلة' : 'غير متصل'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <p className="text-xs font-black text-slate-700">{driver.trips}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-brand-blue transition-all border border-slate-100">
                                                        <Phone className="w-4 h-4" />
                                                    </button>
                                                    <button className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-blue-500 transition-all border border-slate-100">
                                                        <MapPin className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Dispatch Panel */}
                <div className="bg-slate-900 p-8 rounded-3xl shadow-xl space-y-8 flex flex-col h-full overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>
                    <h3 className="text-xl font-black text-white flex items-center gap-2">
                        <Navigation className="w-5 h-5 text-blue-400" />
                        لوحة التوزيع الفوري
                    </h3>
                    <div className="space-y-4 flex-1">
                        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
                            <div className="flex justify-between items-start mb-3">
                                <span className="text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-500/10 px-2 py-0.5 rounded">Urgent Dispatch</span>
                                <span className="text-[10px] text-slate-500 font-bold uppercase">2 mins ago</span>
                            </div>
                            <p className="text-white font-bold text-sm mb-1">طلب رقم #F0A2</p>
                            <p className="text-slate-400 text-xs font-medium">الخرطوم، شارع الستين - عمارة القصر</p>
                            <button className="mt-4 w-full py-2 bg-blue-500 text-white rounded-xl text-xs font-black hover:bg-blue-600 transition-all shadow-lg shadow-blue-900/40">
                                تعيين أفضل سائق متاح
                            </button>
                        </div>
                        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl opacity-60">
                            <p className="text-white font-bold text-sm mb-1">طلب رقم #E411</p>
                            <p className="text-slate-400 text-xs font-medium">بورتسودان، حي الشاطئ - خلف الفندق</p>
                            <button className="mt-4 w-full py-2 bg-white/10 text-white rounded-xl text-xs font-black">
                                تأكيد التعيين
                            </button>
                        </div>
                    </div>

                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-white font-black text-sm">تم التوصيل بنجاح</p>
                                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-tighter">Last 1 hour: 8 orders</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
