'use client';
import { useState } from 'react';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { adminCopy } from '@/lib/admin/copy';
import { orderingCopy } from '@/lib/ordering/copy';
import { formatMenuPrice } from '@/lib/format';
import { parisDate, previousDate } from '@/lib/admin/orders';
import { useOrders } from './useOrders';
import { DashboardToolbar } from './DashboardShell';
import ConnectionStatus from './ConnectionStatus';
import OrderDetails from './OrderDetails';
import { OrderStatusBadge, OrderTypeBadge } from './OrderParts';
import styles from './dashboard.module.css';
function Results({ query }: { query: string }) {
  const data = useOrders(query); const { language } = useLanguage(); const copy = adminCopy[language];
  const [selected, setSelected] = useState<string | null>(null);
  const order = data.orders.find(order => order.id === selected);
  const time = new Intl.DateTimeFormat(language, { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hour12: false });
  const date = new Intl.DateTimeFormat(language, { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit' });
  return <>
    <DashboardToolbar><ConnectionStatus connected={data.connected} stale={data.stale} checked={data.checked} /><span className={styles.quiet}>{copy.soundLiveOnly}</span><button className={styles.button} onClick={data.refresh}>{copy.refresh}</button></DashboardToolbar>
    {data.stale && <p role="alert" className={styles.warning}>{copy.stale}</p>}
    {data.loading ? <p role="status">{copy.loading}</p> : <div className={styles.historyResults}>
      {data.orders.length ? <table className={styles.historyTable} aria-label={copy.history}>
        <thead><tr><th scope="col">{copy.number}</th><th scope="col">{copy.time}</th><th scope="col">{copy.customer}</th><th scope="col">{copy.type}</th><th scope="col">{orderingCopy[language].total}</th><th scope="col">{copy.finalStatus}</th><th scope="col">{copy.details}</th></tr></thead>
        <tbody>{data.orders.map(order => <tr key={order.id}>
          <td><strong className={styles.historyNumber}>#{order.order_number}</strong></td>
          <td><time dateTime={order.created_at}><span className={styles.historyTime}>{time.format(new Date(order.created_at))}</span><span className={styles.historyDate}>{date.format(new Date(order.created_at))}</span></time></td>
          <td data-label={copy.customer}>{order.customer_name}</td><td data-label={copy.type}><OrderTypeBadge type={order.order_type} /></td>
          <td data-label={orderingCopy[language].total}><strong className={styles.total}>{formatMenuPrice(order.total, language)}</strong></td><td data-label={copy.finalStatus}><OrderStatusBadge status={order.order_status} /></td>
          <td><button className={styles.detailsButton} aria-label={`${copy.viewOrder} #${order.order_number}`} onClick={() => setSelected(order.id)}>{copy.details}</button></td>
        </tr>)}</tbody>
      </table> : <p className={styles.historyEmpty}>{copy.noHistory}</p>}
    </div>}
    {order && <OrderDetails order={order} close={() => setSelected(null)} />}
  </>;
}
export default function OrderHistory() {
  const { language } = useLanguage(); const copy = adminCopy[language];
  const [date, setDate] = useState(() => parisDate()), [number, setNumber] = useState('');
  const [query, setQuery] = useState(() => `?history=1&date=${parisDate()}`);
  function search(nextDate = date) { setDate(nextDate); setQuery(`?${new URLSearchParams({ history: '1', date: nextDate, number })}`); }
  return <main className={styles.history}>
    <div className={styles.historyHeading}><h1>{copy.history}</h1><p>{copy.historyNote}</p></div>
    <form className={styles.filters} onSubmit={event => { event.preventDefault(); search(); }}>
      <button type="button" className={styles.button} onClick={() => search(parisDate())}>{copy.today}</button><button type="button" className={styles.button} onClick={() => search(previousDate(parisDate()))}>{copy.yesterday}</button>
      <label>{copy.date}<input type="date" required={!number} value={date} onChange={e => setDate(e.target.value)} /></label>
      <label>{copy.number}<input type="text" inputMode="numeric" pattern="[1-9][0-9]{0,14}" maxLength={15} value={number} onChange={e => setNumber(e.target.value)} /></label>
      <button className={`${styles.button} ${styles.searchButton}`}>{copy.search}</button><button type="button" disabled={!number} className={styles.button} onClick={() => search('')}>{copy.allDates}</button>
    </form><Results key={query} query={query} />
  </main>;
}
