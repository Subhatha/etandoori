"use client";
import Link from "next/link";
import { useCart } from "@/components/ordering/CartProvider";
import { useCatalog } from "@/components/ordering/useCatalog";
import CartContents from "@/components/ordering/CartContents";
import OrderShell, { buttonClass } from "@/components/ordering/OrderShell";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { orderingCopy } from "@/lib/ordering/copy";
import { cartSubtotal } from "@/lib/ordering/cart";
import { formatMenuPrice } from "@/lib/format";

export default function CartPage() {
  const cart = useCart(), catalog = useCatalog(); const { language } = useLanguage(); const copy = orderingCopy[language];
  const ready = !catalog.loading && !catalog.error && cart.lines.every((line) => catalog.items.some((item) => item.id === line.id));
  return <OrderShell><h1 className="mb-8 text-4xl font-semibold">{copy.cart} ({cart.count})</h1>
    {cart.storageError && <p role="status" className="mb-5 text-brand-300">{copy.storage}</p>}
    {!cart.lines.length ? <><p>{copy.empty}</p><Link href="/order-online" className={`${buttonClass} mt-6`}>{copy.browse}</Link></> : <>
      {catalog.loading && <p role="status">{copy.loading}</p>}
      {catalog.error && <p role="alert" className="mb-5 text-brand-300">{copy.unavailable}</p>}
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]"><CartContents items={catalog.items} /><aside className="h-fit rounded-2xl border border-white/10 bg-[#15120f] p-6">
        <p className="flex justify-between gap-4 text-lg"><span>{copy.subtotal}</span><strong className="text-brand-300">{formatMenuPrice(cartSubtotal(cart.lines, catalog.items), language)}</strong></p>
        <p className="mt-4 text-sm leading-6 text-zinc-400">{copy.pricesNote}</p>
        {ready ? <Link href="/checkout" className={`${buttonClass} mt-6 w-full`}>{copy.checkout}</Link> : <p className="mt-5 text-sm text-brand-300">{copy.itemUnavailable}</p>}
        <button className="mt-5 block text-sm text-brand-300 underline" onClick={() => void catalog.refresh()}>{copy.refresh}</button>
        <button className="mt-5 block text-sm text-zinc-400 underline" onClick={cart.clear}>{copy.clear}</button>
      </aside></div>
    </>}
  </OrderShell>;
}
