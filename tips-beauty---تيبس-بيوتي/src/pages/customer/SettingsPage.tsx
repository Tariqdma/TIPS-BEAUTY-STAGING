import React, { useState, useEffect } from 'react';
import { Bell, Shield, Smartphone, Mail, Globe, Moon, User as UserIcon, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const SettingsPage: React.FC = () => {
    const { user, signOut } = useAuth();
    // Initial state from localStorage or defaults
    const [settings, setSettings] = useState(() => {
        try {
            const saved = localStorage.getItem('user_settings');
            return saved ? JSON.parse(saved) : {
                promotions: true,
                orderUpdates: true,
                securityAlerts: true,
                newsletter: false,
                darkMode: false,
                language: 'ar'
            };
        } catch {
            return {
                promotions: true,
                orderUpdates: true,
                securityAlerts: true,
                newsletter: false,
                darkMode: false,
                language: 'ar'
            };
        }
    });

    useEffect(() => {
        localStorage.setItem('user_settings', JSON.stringify(settings));
    }, [settings]);

    const toggle = (key: string) => {
        setSettings({ ...settings, [key]: !settings[key] });
    };

    return (
        <div className="max-w-2xl mx-auto p-4 md:p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800">الإعدادات</h1>
                <button
                    onClick={signOut}
                    className="flex items-center gap-2 text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl transition-colors font-bold text-sm"
                >
                    <LogOut className="w-4 h-4" />
                    تسجيل الخروج
                </button>
            </div>

            <div className="space-y-6">
                {/* Profile Section */}
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-brand-blue-soft overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue-soft rounded-full -mr-16 -mt-16 opacity-50"></div>
                    <div className="relative flex items-center gap-4">
                        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-brand-blue">
                            <UserIcon className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">
                                {user?.user_metadata?.full_name || 'مرحباً بك'}
                            </h2>
                            <p className="text-gray-500 text-sm">{user?.email}</p>
                        </div>
                    </div>
                </section>
                {/* Notifications */}
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-brand-blue">
                        <Bell className="w-6 h-6" />
                        الإشعارات
                    </h2>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-bold text-gray-800">العروض والخصومات</p>
                                <p className="text-sm text-gray-500">احصلي على تنبيهات بأحدث العروض الحصرية</p>
                            </div>
                            <button
                                onClick={() => toggle('promotions')}
                                className={`w-12 h-6 rounded-full transition-colors relative ${settings.promotions ? 'bg-brand-blue' : 'bg-gray-200'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${settings.promotions ? 'left-1 translate-x-0' : 'left-1/2 translate-x-1.5'}`}></div>
                            </button>
                        </div>
                        <hr className="border-gray-50" />
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-bold text-gray-800">تحديثات الطلبات</p>
                                <p className="text-sm text-gray-500">تنبيهات عند تغير حالة طلبك</p>
                            </div>
                            <button
                                onClick={() => toggle('orderUpdates')}
                                className={`w-12 h-6 rounded-full transition-colors relative ${settings.orderUpdates ? 'bg-brand-blue' : 'bg-gray-200'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${settings.orderUpdates ? 'left-1 translate-x-0' : 'left-1/2 translate-x-1.5'}`}></div>
                            </button>
                        </div>
                    </div>
                </section>

                {/* Account & App */}
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-700">
                        <Shield className="w-6 h-6" />
                        الخصوصية والتفضيلات
                    </h2>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Mail className="text-gray-400" />
                                <div>
                                    <p className="font-bold text-gray-800">النشرة البريدية</p>
                                </div>
                            </div>
                            <button
                                onClick={() => toggle('newsletter')}
                                className={`w-12 h-6 rounded-full transition-colors relative ${settings.newsletter ? 'bg-brand-blue' : 'bg-gray-200'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${settings.newsletter ? 'left-1 translate-x-0' : 'left-1/2 translate-x-1.5'}`}></div>
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};
