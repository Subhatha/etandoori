"use client";
import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useCart } from "@/components/ordering/CartProvider";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import OrderShell, { buttonClass } from "@/components/ordering/OrderShell";
import { orderingCopy, orderStatusCopy } from "@/lib/ordering/copy";
import { formatMenuPrice } from "@/lib/format";
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
export default function ConfirmationPage() {
  const { receipt: current } = useCart(); const { language } = useLanguage(); const copy = orderingCopy[language];
  const stored = useSyncExternalStore(subscribe, snapshot, () => "");
  const receipt = current ?? parseReceipt(stored);
  return <OrderShell>{!receipt ? <><h1 className="text-3xl">{copy.noReceipt}</h1><Link href="/order-online" className={`${buttonClass} mt-6`}>{copy.browse}</Link></> : <div className="mx-auto max-w-3xl space-y-8">
    <div><p className="text-brand-300">{copy.number} #{receipt.order_number}</p><h1 className="mt-3 text-4xl font-semibold">{copy.confirmation}</h1><p className="mt-4 text-zinc-400">{copy[receipt.order_type]} · {copy.status}: {orderStatusCopy[language][receipt.order_status as keyof typeof orderStatusCopy.en] ?? copy.new}</p></div>
    <div className="space-y-5 rounded-2xl border border-white/10 bg-[#15120f] p-6">
      <ul className="space-y-4">{receipt.items.map((item, index) => <li key={index} className="border-b border-white/10 pb-4"><div className="flex justify-between gap-4"><span>{item.quantity} × {item.item_name}</span><span className="shrink-0 text-brand-300">{formatMenuPrice(item.total_price, language)}</span></div><p className="mt-1 text-sm text-zinc-400">{copy.unit}: {formatMenuPrice(item.unit_price, language)}</p>{item.notes && <p className="mt-2 text-sm text-zinc-400">{item.notes}</p>}</li>)}</ul>
      <dl className="space-y-3">{[[copy.subtotal, receipt.subtotal], [copy.deliveryFee, receipt.delivery_fee], [copy.total, receipt.total]].map(([label, value]) => <div key={label} className="flex justify-between gap-4"><dt>{label}</dt><dd className="font-semibold text-brand-300">{formatMenuPrice(Number(value), language)}</dd></div>)}</dl>
    </div>
    <section className="rounded-2xl border border-white/10 p-6"><h2 className="mb-3 text-xl">{copy.customer}</h2><p>{receipt.customer_name}</p><p>{receipt.customer_phone}</p>{receipt.customer_email && <p>{receipt.customer_email}</p>}{receipt.delivery_address && <p className="mt-3">{receipt.delivery_address}</p>}{receipt.customer_notes && <p className="mt-3 whitespace-pre-line text-sm text-zinc-400">{receipt.customer_notes}</p>}</section>
    <p className="text-sm leading-6 text-zinc-400">{copy.paymentNote}</p><Link href="/order-online" className={buttonClass}>{copy.browse}</Link>
  </div>}</OrderShell>;
}
