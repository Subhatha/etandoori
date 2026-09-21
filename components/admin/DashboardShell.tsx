'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { adminCopy } from '@/lib/admin/copy';
import type { Staff } from '@/lib/admin/orders';
import styles from './dashboard.module.css';

const ToolbarContext = createContext<HTMLElement | null>(null);
export function DashboardToolbar({ children }: { children: React.ReactNode }) {
  const target = useContext(ToolbarContext);
  return target ? createPortal(children, target) : null;
}
function RestaurantClock() {
  const [now, setNow] = useState<Date | null>(null);
  const { language } = useLanguage(); const copy = adminCopy[language];
  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);
  return <time className={styles.clock} dateTime={now?.toISOString()} title={copy.parisTime}>{now ? new Intl.DateTimeFormat(language, { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hour12: false }).format(now) : '—:—'}<small>{copy.parisTime}</small></time>;
}
export default function DashboardShell({ staff, signOut, children }: { staff: Staff; signOut: () => void; children: React.ReactNode }) {
  const { language, setLanguage } = useLanguage(); const copy = adminCopy[language];
  const history = usePathname().includes('/history');
  const [toolbar, setToolbar] = useState<HTMLElement | null>(null);
  return <ToolbarContext.Provider value={toolbar}><div className={styles.shell}>
    <header className={styles.topbar}>
      <div className={styles.brand}><strong>eTandoori</strong><span>{copy.title}</span></div>
      <RestaurantClock />
      <div ref={setToolbar} className={styles.toolbar} />
      <nav className={styles.navigation} aria-label={copy.title}>
        <select aria-label={copy.language} value={language} onChange={event => setLanguage(event.target.value as 'fr' | 'en' | 'de')} className={styles.language}><option value="fr">FR</option><option value="en">EN</option><option value="de">DE</option></select>
        <Link className={styles.button} href={history ? '/admin/orders' : '/admin/orders/history'}>{history ? copy.orders : copy.history}</Link>
        <button onClick={signOut} className={styles.button} title={staff.name}>{copy.logout}</button>
      </nav>
    </header>{children}
  </div></ToolbarContext.Provider>;
}
