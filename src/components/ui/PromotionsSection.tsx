import React from 'react';
import { Timer, Tag } from 'lucide-react';

export const PromotionsSection: React.FC = () => {
    return (
        <div className="mb-12">
            <div className="flex justify-between items-end mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Tag className="text-brand-blue" />
                    عروض حصرية
                </h2>
                <span className="text-brand-blue font-bold text-sm bg-brand-blue-soft px-3 py-1 rounded-full border border-brand-blue-soft flex items-center gap-1">
                    <Timer className="w-4 h-4" />
                    تنتهي قريباً
                </span>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                {/* Promo Card 1 */}
                <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl p-6 text-white relative overflow-hidden group cursor-pointer hover:shadow-xl transition-all">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-x-10 -translate-y-10 group-hover:scale-110 transition-transform"></div>
                    <div className="relative z-10">
                        <span className="bg-white/20 backdrop-blur-md text-xs px-2 py-1 rounded-md mb-3 inline-block">عناية بالبشرة</span>
                        <h3 className="text-2xl font-bold mb-2">خصم 20% على باقة النضارة</h3>
                        <p className="mb-4 text-white/80 text-sm">احصلي على إشراقة لا مثيل لها مع منتجاتنا المختارة.</p>
                        <button className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-50 transition-colors">
                            تسوقي العرض
                        </button>
                    </div>
                    <img src="https://images.unsplash.com/photo-1620917670397-a3313d64190c?auto=format&fit=crop&q=80&w=400" className="absolute -bottom-4 -left-4 w-32 h-32 object-cover rounded-full border-4 border-white/20 rotate-12 group-hover:rotate-0 transition-transform" />
                </div>

                {/* Promo Card 2 */}
                <div className="bg-gradient-to-r from-brand-blue to-orange-400 rounded-2xl p-6 text-white relative overflow-hidden group cursor-pointer hover:shadow-xl transition-all">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-x-10 -translate-y-10 group-hover:scale-110 transition-transform"></div>
                    <div className="relative z-10">
                        <span className="bg-white/20 backdrop-blur-md text-xs px-2 py-1 rounded-md mb-3 inline-block">مكياج</span>
                        <h3 className="text-2xl font-bold mb-2">اشتري 2 واحصلي على 1 مجاناً</h3>
                        <p className="mb-4 text-white/80 text-sm">على جميع أرواج ماك وشانيل لفترة محدودة.</p>
                        <button className="bg-white text-brand-blue px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-50 transition-colors">
                            تسوقي العرض
                        </button>
                    </div>
                    <img src="https://images.unsplash.com/photo-1596462502278-27bfdd403ea6?auto=format&fit=crop&q=80&w=400" className="absolute -bottom-4 -left-4 w-32 h-32 object-cover rounded-full border-4 border-white/20 rotate-12 group-hover:rotate-0 transition-transform" />
                </div>
            </div>
        </div>
    );
};
