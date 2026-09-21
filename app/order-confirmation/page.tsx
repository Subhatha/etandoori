"use client";
import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useCart } from "@/components/ordering/CartProvider";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import OrderShell, { buttonClass } from "@/components/ordering/OrderShell";
import { orderingCopy, orderStatusCopy } from "@/lib/ordering/copy";
import { formatMenuPrice } from "@/lib/format";
import { parseSavedOrders, subscribeTracking, trackingSnapshot, type SavedOrder } from "@/lib/ordering/tracking-storage";
import { trackingCopy } from "@/lib/ordering/tracking-copy";
import { useOrderTracking } from "@/components/ordering/useOrderTracking";
import type { Receipt } from "@/lib/ordering/types";

function snapshot() { try { return sessionStorage.getItem("etandoori-receipt") ?? ""; } catch { return ""; } }
const subscribe = () => () => {};
function parseReceipt(raw: string): Receipt | null {
  try {
    const value = JSON.parse(raw);
    return value && typeof value.id === "string" && typeof value.order_number === "number" && Array.isArray(value.items)
      && value.items.every((item: Receipt["items"][number]) => typeof item.item_name === "string" && typeof item.total_price === "number") ? value : null;
  } catch { return null; }
}
function ReceiptView({ receipt, status }: { receipt: Receipt; status: React.ReactNode }) {
  const { language } = useLanguage(); const copy = orderingCopy[language];
  return <div className="mx-auto max-w-3xl space-y-8">
    <div><p className="text-brand-300">{copy.number} #{receipt.order_number}</p><h1 className="mt-3 text-4xl font-semibold">{copy.confirmation}</h1><p className="mt-4 text-zinc-400">{copy[receipt.order_type]} · {copy.status}: {orderStatusCopy[language][receipt.order_status as keyof typeof orderStatusCopy.en] ?? copy.new}</p></div>
    {status}
    <div className="space-y-5 rounded-2xl border border-white/10 bg-[#15120f] p-6">
      <ul className="space-y-4">{receipt.items.map((item, index) => <li key={index} className="border-b border-white/10 pb-4"><div className="flex justify-between gap-4"><span>{item.quantity} × {item.item_name}</span><span className="shrink-0 text-brand-300">{formatMenuPrice(item.total_price, language)}</span></div><p className="mt-1 text-sm text-zinc-400">{copy.unit}: {formatMenuPrice(item.unit_price, language)}</p>{item.notes && <p className="mt-2 text-sm text-zinc-400">{item.notes}</p>}</li>)}</ul>
      <dl className="space-y-3">{[[copy.subtotal, receipt.subtotal], [copy.deliveryFee, receipt.delivery_fee], [copy.total, receipt.total]].map(([label, value]) => <div key={label} className="flex justify-between gap-4"><dt>{label}</dt><dd className="font-semibold text-brand-300">{formatMenuPrice(Number(value), language)}</dd></div>)}</dl>
    </div>
    <section className="rounded-2xl border border-white/10 p-6"><h2 className="mb-3 text-xl">{copy.customer}</h2><p>{receipt.customer_name}</p><p>{receipt.customer_phone}</p>{receipt.customer_email && <p>{receipt.customer_email}</p>}{receipt.delivery_address && <p className="mt-3">{receipt.delivery_address}</p>}{receipt.customer_notes && <p className="mt-3 whitespace-pre-line text-sm text-zinc-400">{receipt.customer_notes}</p>}</section>
    <p className="text-sm leading-6 text-zinc-400">{copy.paymentNote}</p><Link href="/order-online" className={buttonClass}>{copy.browse}</Link>
  </div>;
}
function TrackedReceipt({ order, initial }: { order: SavedOrder; initial: Receipt | null }) {
  const data = useOrderTracking(order, initial); const { language } = useLanguage(); const copy = trackingCopy[language];
  const { storageError } = useCart();
  const steps = ['new', 'accepted', 'preparing', 'ready', 'completed'] as const;
  const state = data.receipt?.order_status ?? 'new';
  const index = steps.indexOf(state as typeof steps[number]);
  const message = state === 'ready' ? (data.receipt?.order_type === 'pickup' ? copy.readyPickup : copy.readyDelivery) : copy[state as keyof typeof copy];
  const status = <section className="space-y-4 rounded-2xl border border-brand-500/40 bg-[#19130f] p-5 sm:p-6" aria-label={orderingCopy[language].status}>
    <div aria-live="polite"><p className="text-2xl font-semibold text-brand-300">{orderStatusCopy[language][state as keyof typeof orderStatusCopy.en]}</p><p className="mt-2 text-zinc-200">{message}</p></div>
    {index >= 0 && <ol className="grid grid-cols-2 gap-2 sm:grid-cols-5">{steps.map((step, stepIndex) => <li key={step} aria-current={step === state ? 'step' : undefined} className={`rounded-lg border px-3 py-3 text-sm ${stepIndex <= index ? 'border-brand-500/50 text-brand-300' : 'border-white/10 text-zinc-400'}`}><span aria-hidden="true">{stepIndex < index ? '✓ ' : `${stepIndex + 1}. `}</span>{orderStatusCopy[language][step]}</li>)}</ol>}
    {data.error ? <p role="alert" className="text-sm text-orange-200">{copy[data.error]}</p> : <p className="text-sm text-zinc-400">{data.loading ? copy.loading : copy.live}</p>}
    {data.checked > 0 && <p className="text-xs text-zinc-400">{copy.updated}: {new Date(data.checked).toLocaleTimeString(language)}</p>}
    {data.error !== 'denied' && <button className={buttonClass} onClick={data.refresh}>{copy.refresh}</button>}
    <p className="text-sm text-zinc-400">{storageError ? copy.storage : copy.saved}</p>
  </section>;
  return data.receipt ? <ReceiptView receipt={data.receipt} status={status} /> : <div className="mx-auto max-w-3xl space-y-5"><h1 className="text-3xl font-semibold">{orderingCopy[language].number} #{order.orderNumber}</h1><p role={data.error ? 'alert' : 'status'}>{data.error ? copy[data.error] : copy.loading}</p>{data.error !== 'denied' && <button className={buttonClass} onClick={data.refresh}>{copy.refresh}</button>}</div>;
}
export default function ConfirmationPage() {
  const { receipt: current } = useCart(); const { language } = useLanguage(); const copy = orderingCopy[language]; const track = trackingCopy[language];
  const stored = useSyncExternalStore(subscribe, snapshot, () => '');
  const raw = useSyncExternalStore(subscribeTracking, trackingSnapshot, () => '');
  const saved = parseSavedOrders(raw); const [selected, setSelected] = useState('');
  const receipt = current ?? parseReceipt(stored);
  const currentAccess = receipt?.tracking ? { id: receipt.id, orderNumber: receipt.order_number, ...receipt.tracking } : null;
  const choice = saved.find(order => order.id === selected) ?? currentAccess ?? saved[0];
  return <OrderShell>
    {saved.length > 1 && <label className="mx-auto mb-8 block max-w-3xl text-sm text-zinc-300">{track.recent}<select className="mt-2 block min-h-12 w-full rounded-xl border border-white/20 bg-[#19130f] p-3" value={choice?.id ?? ''} onChange={event => setSelected(event.target.value)}>{saved.map(order => <option key={order.id} value={order.id}>#{order.orderNumber}</option>)}</select></label>}
    {choice ? <TrackedReceipt key={choice.token} order={choice} initial={receipt?.id === choice.id ? receipt : null} /> : receipt ? <ReceiptView receipt={receipt} status={<p className="text-sm text-zinc-400">{track.legacy}</p>} /> : <><h1 className="text-3xl">{track.empty}</h1><Link href="/order-online" className={`${buttonClass} mt-6`}>{copy.browse}</Link></>}
  </OrderShell>;
}
