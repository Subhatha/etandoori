'use client';
import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { adminCopy } from '@/lib/admin/copy';
import { useOrders } from './useOrders';
import OrderCard from './OrderCard';
import OrderSound from './OrderSound';
import { DashboardToolbar } from './DashboardShell';
import ConnectionStatus from './ConnectionStatus';
import styles from './dashboard.module.css';
export default function OrderBoard() {
  const { language } = useLanguage(); const copy = adminCopy[language]; const data = useOrders();
  const [acknowledged, setAcknowledged] = useState<Set<string>>(() => new Set()); const [now, setNow] = useState(0);
  const newOrders = useRef<HTMLDivElement>(null);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 10000); return () => clearInterval(timer); }, []);
  const pending = data.orders.filter(order => order.order_status === 'new' && !acknowledged.has(order.id)).map(order => order.id);
  const groups = [
    { id: 'new', title: copy.new, hint: copy.newHint, empty: copy.noNew, statuses: ['new'] },
    { id: 'preparing', title: copy.kitchen, hint: copy.preparingHint, empty: copy.noPreparing, statuses: ['accepted', 'preparing'] },
    { id: 'ready', title: copy.ready, hint: copy.readyHint, empty: copy.noReady, statuses: ['ready'] },
  ];
  function showNew() { newOrders.current?.scrollTo({ top: 0 }); newOrders.current?.focus({ preventScroll: false }); }
  return <main className={styles.board}>
    <DashboardToolbar><ConnectionStatus connected={data.connected} stale={data.stale} checked={data.checked} /><OrderSound pendingIds={pending} /><button className={styles.button} onClick={data.refresh}>{copy.refresh}</button></DashboardToolbar>
    <div className={styles.boardStrip}><h1>{copy.orders}</h1><div className={styles.alertSlot} aria-live="polite" aria-atomic="true">{pending.length > 0 ? <button className={styles.alertButton} onClick={showNew}><span>● {copy.alert}</span><strong>{pending.length}</strong></button> : <span className={styles.quiet}>✓ {copy.allCaughtUp}</span>}</div></div>
    {data.stale && <p role="alert" className={styles.warning}>{copy.stale}</p>}
    {data.loading ? <p role="status">{copy.loading}</p> : <div className={styles.columns}>{groups.map(group => {
      const orders = data.orders.filter(order => group.statuses.includes(order.order_status));
      return <section key={group.id} className={styles.column} data-tone={group.id} aria-labelledby={`column-${group.id}`}>
        <header className={styles.columnHeader}><div><h2 id={`column-${group.id}`}>{group.title}</h2><p>{group.hint}</p></div><span className={styles.count} aria-label={`${group.title}: ${orders.length}`}>{orders.length}</span></header>
        <div className={styles.ticketList} ref={group.id === 'new' ? newOrders : undefined} tabIndex={0} role="region" aria-label={group.title}>
          {orders.map(order => <OrderCard key={order.id} order={order} now={now || data.checked} highlighted={pending.includes(order.id)} acknowledge={() => setAcknowledged(current => new Set([...current, order.id]))} refresh={data.refresh} disabled={data.stale} />)}
          {!orders.length && <p className={styles.empty}><span aria-hidden="true">✓</span>{group.empty}</p>}
        </div>
      </section>;
    })}</div>}
  </main>;
}
