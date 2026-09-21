'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { adminRequest } from '@/lib/admin/client';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { adminCopy } from '@/lib/admin/copy';
import { control, inputClass } from '@/components/admin/StaffGate';
export default function LoginPage() {
  const { language, setLanguage } = useLanguage(); const copy = adminCopy[language]; const router = useRouter();
  const [busy, setBusy] = useState(false), [error, setError] = useState(false);
  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; setBusy(true); setError(false);
    const fields = new FormData(event.currentTarget);
    try {
      const client = getSupabaseBrowserClient();
      const { error } = await client.auth.signInWithPassword({ email: String(fields.get('email')).trim(), password: String(fields.get('password')) });
      if (error) throw error;
      try { await adminRequest('session'); } catch (error) { await client.auth.signOut({ scope: 'local' }); throw error; }
      router.replace('/admin/orders');
    } catch { setError(true); } finally { setBusy(false); }
  }
  return <main className="flex min-h-dvh items-center justify-center bg-[#100d0a] p-5 text-white"><form onSubmit={login} className="w-full max-w-md space-y-6 rounded-3xl border border-brand-500/30 bg-[#19130f] p-8">
    <p className="text-3xl font-bold text-brand-300">eTandoori</p><h1 className="text-2xl">{copy.login}</h1>
    <select aria-label={copy.language} className={`${control} bg-[#211b16]`} value={language} onChange={e => setLanguage(e.target.value as 'fr' | 'en' | 'de')}><option value="fr">Français</option><option value="en">English</option><option value="de">Deutsch</option></select>
    <label className="block">{copy.email}<input className={inputClass} name="email" type="email" autoComplete="username" required maxLength={254} disabled={busy} /></label>
    <label className="block">{copy.password}<input className={inputClass} name="password" type="password" autoComplete="current-password" required maxLength={256} disabled={busy} /></label>
    {error && <p role="alert" className="text-orange-300">{copy.denied}</p>}
    <button disabled={busy} className={`${control} w-full bg-brand-700`}>{busy ? copy.loading : copy.signIn}</button>
  </form></main>;
}
