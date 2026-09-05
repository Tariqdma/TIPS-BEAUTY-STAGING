import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type DriverProfile = { id: string; name: string; phone: string; status: 'active' | 'busy' | 'offline'; warehouse_id: string | null };
type AuthValue = { session: Session | null; user: User | null; driver: DriverProfile | null; isDriver: boolean; loading: boolean; refreshDriver: () => Promise<void>; signOut: () => Promise<void> };

const DriverAuthContext = createContext<AuthValue | undefined>(undefined);

export const DriverAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [driver, setDriver] = useState<DriverProfile | null>(null);
    const [isDriver, setIsDriver] = useState(false);
    const [loading, setLoading] = useState(true);

    const loadDriver = async (userId?: string) => {
        const id = userId || user?.id;
        if (!id) { setDriver(null); setIsDriver(false); setLoading(false); return; }
        setLoading(true);
        const [profileResponse, driverResponse] = await Promise.all([
            supabase.from('profiles').select('role').eq('id', id).maybeSingle(),
            supabase.from('drivers').select('id,name,phone,status,warehouse_id').eq('user_id', id).maybeSingle(),
        ]);
        const valid = profileResponse.data?.role === 'driver' && !!driverResponse.data;
        setDriver(valid ? driverResponse.data as DriverProfile : null);
        setIsDriver(valid);
        setLoading(false);
    };

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session: current } }) => {
            setSession(current); setUser(current?.user ?? null); void loadDriver(current?.user.id);
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, current) => {
            setSession(current); setUser(current?.user ?? null); void loadDriver(current?.user.id);
        });
        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => { await supabase.auth.signOut(); setDriver(null); setIsDriver(false); };
    return <DriverAuthContext.Provider value={{ session, user, driver, isDriver, loading, refreshDriver: () => loadDriver(), signOut }}>{children}</DriverAuthContext.Provider>;
};

export const useDriverAuth = () => {
    const context = useContext(DriverAuthContext);
    if (!context) throw new Error('useDriverAuth must be used within DriverAuthProvider');
    return context;
};
