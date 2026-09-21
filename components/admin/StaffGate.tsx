'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { adminRequest, AdminRequestError } from '@/lib/admin/client';
import DashboardShell from './DashboardShell';
import type { Staff } from '@/lib/admin/orders';
import { adminCopy } from '@/lib/admin/copy';
import { useLanguage } from '@/components/i18n/LanguageProvider';
export const control = 'min-h-12 rounded-xl border border-white/20 px-4 py-3 font-semibold disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-brand-400';
export const inputClass = 'mt-2 block min-h-12 w-full rounded-xl border border-white/20 bg-[#211b16] px-4 py-3 text-white';
const StaffContext = createContext<Staff | null>(null);
export function useStaff() { return useContext(StaffContext); }
export default function StaffGate({ children }: { children: React.ReactNode }) {
  const [staff, setStaff] = useState<Staff | null>(null), [failed, setFailed] = useState(false);
  const router = useRouter(); const { language } = useLanguage(); const copy = adminCopy[language];
  useEffect(() => {
    let alive = true, generation = 0;
    const check = async () => {
      const current = ++generation;
      try { const result = await adminRequest('session'); if (alive && current === generation) { setStaff(result.staff); setFailed(false); } }
      catch (error) {
        if (!alive || current !== generation) return;
        setFailed(true);
        if (error instanceof AdminRequestError && [401, 403].includes(error.status)) { setStaff(null); router.replace('/admin/login'); }
      }
    };
    void check();
    let unsubscribe = () => {};
    try {
      const { data } = getSupabaseBrowserClient().auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') { generation++; setStaff(null); router.replace('/admin/login'); }
        else { queueMicrotask(() => { if (alive) void check(); }); }
      }); unsubscribe = () => data.subscription.unsubscribe();
    } catch { /* Initial check displays a recoverable configuration error. */ }
    const timer = setInterval(check, 30000);
    window.addEventListener('focus', check);
    return () => { alive = false; generation++; clearInterval(timer); window.removeEventListener('focus', check); unsubscribe(); };
  }, [router]);
  async function signOut() { setStaff(null); try { await getSupabaseBrowserClient().auth.signOut({ scope: 'local' }); } finally { router.replace('/admin/login'); } }
  if (!staff) return <main className="p-10 text-lg"><p role="status">{failed ? copy.unavailable : copy.loading}</p>{failed && <Link className={control} href="/admin/login">{copy.login}</Link>}</main>;
  return <StaffContext.Provider value={staff}><DashboardShell staff={staff} signOut={() => void signOut()}>{children}</DashboardShell></StaffContext.Provider>;
}
