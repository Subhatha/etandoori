'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { adminCopy } from '@/lib/admin/copy';
import { formatMenuPrice } from '@/lib/format';
import { transitions, type AdminOrder } from '@/lib/admin/orders';
import type { OrderStatus } from '@/lib/supabase/database.types';
import { adminRequest, AdminRequestError } from '@/lib/admin/client';
import { OrderAge, OrderCustomer, OrderItems, OrderNotes, OrderPayment, OrderStatusBadge, OrderTypeBadge } from './OrderParts';
import OrderDetails from './OrderDetails';
import styles from './dashboard.module.css';
export default function OrderCard({ order, now, highlighted = false, acknowledge, refresh, disabled = false }: { order: AdminOrder; now: number; highlighted?: boolean; acknowledge: () => void; refresh: () => void; disabled?: boolean }) {
  const { language } = useLanguage(); const copy = adminCopy[language];
  const [pending, setPending] = useState<OrderStatus | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [details, setDetails] = useState(false); const title = useId();
  const dialog = useRef<HTMLDialogElement>(null); const locked = useRef(false);
  const labels: Partial<Record<OrderStatus, string>> = { accepted: copy.accept, rejected: copy.reject, preparing: copy.prepare, ready: copy.finish, completed: copy.complete, cancelled: copy.cancel };
  useEffect(() => { if (pending) dialog.current?.showModal(); else dialog.current?.close(); }, [pending]);
  async function update(to: OrderStatus) {
    if (locked.current || disabled) return; locked.current = true; setBusy(true); setError(''); acknowledge();
    try { await adminRequest('orders', { method: 'PATCH', body: JSON.stringify({ id: order.id, from: order.order_status, to }) }); setPending(null); refresh(); }
    catch (error) { setError(error instanceof AdminRequestError && error.status === 409 ? copy.conflict : copy.unavailable); refresh(); }
    finally { locked.current = false; setBusy(false); }
  }
  const time = new Intl.DateTimeFormat(language, { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(order.created_at));
  const actions = transitions[order.order_status].filter(to => to !== 'cancelled');
  return <article className={`${styles.card} ${highlighted ? styles.highlight : ''}`} data-order-id={order.id}>
    <header className={styles.cardHeader}><div className={styles.orderIdentity}><h3>#{order.order_number}</h3><time className={styles.received} dateTime={order.created_at}>{copy.receivedAt} {time}</time></div><OrderAge order={order} now={now} /></header>
    <div className={styles.badges}><OrderTypeBadge type={order.order_type} /><OrderStatusBadge status={order.order_status} /></div>
    {highlighted && <div className={styles.newIndicator}><strong role="status">● {copy.alert}</strong><button className={styles.acknowledge} onClick={acknowledge}>{copy.acknowledge}</button></div>}
    <OrderItems order={order} /><OrderCustomer order={order} /><OrderNotes order={order} />
    <div className={styles.priceSummary}><OrderPayment status={order.payment_status} /><strong className={styles.total}>{formatMenuPrice(order.total, language)}</strong></div>
    <div className={styles.actions}>{actions.map(to => <button disabled={busy || disabled} key={to} data-status={to} className={to === 'rejected' ? styles.secondaryButton : styles.primaryButton} onClick={() => { if (to === 'rejected') setPending(to); else void update(to); }}>{labels[to]}</button>)}</div>
    <footer className={styles.cardFooter}><button className={styles.detailsButton} onClick={() => setDetails(true)} aria-label={`${copy.viewOrder} #${order.order_number}`}>{copy.details} <span aria-hidden="true">↗</span></button>{transitions[order.order_status].includes('cancelled') && <button disabled={busy || disabled} className={styles.detailsButton} onClick={() => setPending('cancelled')}>{copy.cancel}</button>}</footer>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {details && <OrderDetails order={order} close={() => setDetails(false)} />}
    <dialog ref={dialog} aria-labelledby={title} onCancel={event => { if (busy) event.preventDefault(); else setPending(null); }} className={`${styles.dialog} ${styles.confirmDialog}`}>
      <div className={styles.dialogHeader}><h2 id={title}>{pending && labels[pending]}</h2></div>
      <div className={styles.dialogBody}><p>{copy.confirm} <strong>#{order.order_number}</strong>?</p>
        <div className={styles.confirmActions}><button className={styles.button} disabled={busy} onClick={() => setPending(null)}>{copy.back}</button><button className={`${styles.button} ${styles.confirmButton}`} disabled={busy || disabled} onClick={() => pending && void update(pending)}>{copy.confirmButton}</button></div>{error && <p role="alert" className={styles.error}>{error}</p>}
      </div>
    </dialog>
  </article>;
}
