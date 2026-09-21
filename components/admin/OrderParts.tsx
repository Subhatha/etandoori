'use client';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { adminCopy, paymentCopy } from '@/lib/admin/copy';
import { orderingCopy, orderStatusCopy } from '@/lib/ordering/copy';
import { formatMenuPrice } from '@/lib/format';
import type { AdminOrder } from '@/lib/admin/orders';
import { orderAge } from '@/lib/admin/presentation';
import styles from './dashboard.module.css';

export function OrderTypeBadge({ type }: { type: AdminOrder['order_type'] }) {
  const { language } = useLanguage();
  return <span className={styles.typeBadge} data-type={type}>{orderingCopy[language][type]}</span>;
}
export function OrderStatusBadge({ status }: { status: AdminOrder['order_status'] }) {
  const { language } = useLanguage();
  return <span className={styles.statusBadge} data-status={status}>{orderStatusCopy[language][status]}</span>;
}
export function OrderAge({ order, now }: { order: AdminOrder; now: number }) {
  const { language } = useLanguage(); const copy = adminCopy[language]; const age = orderAge(order.created_at, now);
  return <span className={styles.age} data-urgency={age.urgency} aria-label={`${age.minutes} ${copy.elapsed}`}><span>{age.minutes} <span>{copy.minutes}</span></span>{age.urgency !== 'normal' && <small>{age.urgency === 'late' ? copy.longWait : copy.waiting}</small>}</span>;
}
export function OrderPayment({ status }: { status: AdminOrder['payment_status'] }) {
  const { language } = useLanguage();
  return <span className={styles.payment} data-payment={status}><span aria-hidden="true">{status === 'paid' ? '✓' : '○'}</span>{paymentCopy[language][status]}</span>;
}
export function OrderItems({ order, prices = false }: { order: AdminOrder; prices?: boolean }) {
  const { language } = useLanguage(); const copy = adminCopy[language];
  return <ul className={styles.items} aria-label={copy.items}>{order.items.map(item => <li key={item.id}>
    <p className={styles.itemLine}><span className={styles.quantity}>{item.quantity} ×</span><span className={styles.itemName}>{item.item_name}</span></p>
    {item.notes && <p className={styles.itemNote}><span aria-hidden="true">⚠</span><span>{item.notes}</span></p>}
    {prices && <p className={styles.itemPrice}>{formatMenuPrice(item.unit_price, language)} × {item.quantity} · {formatMenuPrice(item.total_price ?? Math.round(item.unit_price * 100) * item.quantity / 100, language)}</p>}
  </li>)}</ul>;
}
export function OrderCustomer({ order, full = false }: { order: AdminOrder; full?: boolean }) {
  const { language } = useLanguage(); const copy = adminCopy[language];
  return <section className={styles.customer} aria-label={copy.customer}>
    <p className={styles.customerName}>{order.customer_name}</p>
    <a className={styles.phone} href={`tel:${order.customer_phone.replace(/[^+\d]/g, '')}`}>{order.customer_phone}</a>
    {order.delivery_address && <p className={styles.address}>{order.delivery_address}</p>}
    {full && order.customer_email && <p className={styles.email}>{order.customer_email}</p>}
  </section>;
}
export function OrderNotes({ order }: { order: AdminOrder }) {
  const { language } = useLanguage(); const copy = adminCopy[language];
  return order.customer_notes ? <div className={styles.orderNote}><strong>{copy.notes}</strong><p>{order.customer_notes}</p></div> : null;
}
export function OrderTotals({ order }: { order: AdminOrder }) {
  const { language } = useLanguage(); const copy = orderingCopy[language];
  return <dl className={styles.totals}>{[[copy.subtotal, order.subtotal], [copy.deliveryFee, order.delivery_fee], [copy.total, order.total]].map(([label, amount]) => <div key={label}><dt>{label}</dt><dd>{formatMenuPrice(Number(amount), language)}</dd></div>)}</dl>;
}
