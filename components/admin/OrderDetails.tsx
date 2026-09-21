'use client';
import { useEffect, useId, useRef } from 'react';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { adminCopy } from '@/lib/admin/copy';
import type { AdminOrder } from '@/lib/admin/orders';
import { OrderCustomer, OrderItems, OrderNotes, OrderPayment, OrderStatusBadge, OrderTotals, OrderTypeBadge } from './OrderParts';
import styles from './dashboard.module.css';
export default function OrderDetails({ order, close }: { order: AdminOrder; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null); const title = useId();
  const { language } = useLanguage(); const copy = adminCopy[language];
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  const received = new Intl.DateTimeFormat(language, { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(order.created_at));
  return <dialog ref={dialog} onClose={close} className={styles.dialog} aria-labelledby={title}>
    <header className={styles.dialogHeader}><div><p>{copy.orderDetails}</p><h2 id={title}>#{order.order_number}</h2></div><button className={styles.button} onClick={() => dialog.current?.close()} autoFocus>{copy.close}</button></header>
    <div className={styles.dialogBody}><p className={styles.received}>{copy.receivedAt} {received} · {copy.parisTime}</p>
      <div className={styles.badges}><OrderTypeBadge type={order.order_type} /><OrderStatusBadge status={order.order_status} /><OrderPayment status={order.payment_status} /></div>
      <OrderItems order={order} prices /><OrderCustomer order={order} full /><OrderNotes order={order} /><OrderTotals order={order} />
    </div>
  </dialog>;
}
