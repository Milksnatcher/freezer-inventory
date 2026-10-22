import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

type Ctx = { session: Session | null; householdId: string | null; loading: boolean; refresh: () => Promise<void> };
const C = createContext<Ctx>({ session: null, householdId: null, loading: true, refresh: async () => {} });
export const useApp = () => useContext(C);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadHousehold = async (s: Session | null) => {
    if (!s) { setHouseholdId(null); return; }
    const { data } = await supabase.from('household_members').select('household_id').eq('user_id', s.user.id).maybeSingle();
    setHouseholdId(data?.household_id ?? null);
  };
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => { setSession(data.session); await loadHousehold(data.session); setLoading(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); loadHousehold(s); });
    return () => sub.subscription.unsubscribe();
  }, []);
  return <C.Provider value={{ session, householdId, loading, refresh: () => loadHousehold(session) }}>{children}</C.Provider>;
}
