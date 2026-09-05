import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Lock, Mail, Truck } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const DriverLoginPage: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const submit = async (event: React.FormEvent) => {
        event.preventDefault(); setLoading(true); setError('');
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        setLoading(false);
        if (loginError) { setError(loginError.message); return; }
        navigate('/dashboard', { replace: true });
    };
    return <main className="login-shell" dir="rtl"><form onSubmit={submit} className="login-card"><div className="login-brand"><div className="brand-icon"><Truck /></div><h1>بوابة مندوب تيبس</h1><p>إدارة مهام التوصيل الخاصة بك</p></div>{error && <div className="error"><AlertCircle size={17}/>{error}</div>}<label>البريد الإلكتروني<div className="input-wrap"><Mail size={18}/><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div></label><label>كلمة المرور<div className="input-wrap"><Lock size={18}/><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div></label><button disabled={loading} className="primary-button">{loading ? 'جارٍ التحقق...' : 'دخول المندوب'}</button><p className="help">يجب أن يكون الحساب مربوطاً بملف مندوب وصلاحية <b>driver</b>.</p></form></main>;
};
