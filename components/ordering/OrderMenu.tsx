"use client";
import RecentOrderLink from "./RecentOrderLink";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { menuCategories, type MenuCategory } from "@/lib/menu";
import type { CatalogItem } from "@/lib/ordering/types";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { orderingCopy } from "@/lib/ordering/copy";
import { formatMenuPrice } from "@/lib/format";
import { useCart } from "./CartProvider";
import { useCatalog } from "./useCatalog";
import OrderShell, { buttonClass, fieldClass } from "./OrderShell";

function OrderCard({ options }: { options: CatalogItem[] }) {
  const { language } = useLanguage(); const copy = orderingCopy[language]; const cart = useCart();
  const [selected, setSelected] = useState(options[0].id);
  const item = options.find((option) => option.id === selected) ?? options[0];
  const inCart = cart.lines.find((line) => line.id === item.id)?.quantity ?? 0;
  const blocked = inCart >= 20 || cart.count >= 100 || (!inCart && cart.lines.length >= 50);
  return <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#15120f]">
    <div className="relative aspect-[16/9] bg-gradient-to-br from-brand-950/30 to-zinc-900">
      {item.image ? <Image src={item.image} alt={item.name[language]} fill sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="object-cover" /> : <ImageIcon className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-brand-400/40" size={32} aria-hidden="true" />}
    </div>
    <div className="space-y-4 p-5">
      <h3 className="text-xl font-semibold">{item.name[language]}</h3>
      <p className="text-sm leading-6 text-zinc-400">{item.description[language]}</p>
      {item.variant && <label className="block text-sm text-zinc-300">{copy.serving}<select value={item.id} onChange={(event) => setSelected(event.target.value)} className={fieldClass}>{options.map((option) => <option key={option.id} value={option.id}>{option.variant?.[language]} — {formatMenuPrice(option.price, language)}</option>)}</select></label>}
      <div className="flex flex-wrap items-center justify-between gap-3"><span className="font-medium text-brand-300">{formatMenuPrice(item.price, language)}</span><button className={buttonClass} disabled={blocked} onClick={() => cart.add(item.id)}>{copy.add}{inCart > 0 && ` (${inCart})`}</button></div>
      {blocked && <p className="text-xs text-brand-300">{copy.cartLimit}</p>}
    </div>
  </article>;
}
function OrderingCategory({ category, items }: { category: MenuCategory; items: CatalogItem[] }) {
  const { language } = useLanguage();
  const hasItems = (entry: MenuCategory): boolean => entry.items.some((item) => items.some((row) => row.localId === item.id)) || !!entry.subcategories?.some(hasItems);
  if (!hasItems(category)) return null;
  return <section id={`order-${category.id}`} className="scroll-mt-28 space-y-6">
    <h2 className="border-b border-white/10 pb-4 text-3xl font-semibold">{category.name[language]}</h2>
    {category.note && <p className="text-sm text-zinc-400">{category.note[language]}</p>}
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{category.items.map((item) => {
      const options = items.filter((row) => row.localId === item.id);
      return options.length ? <OrderCard key={item.id} options={options} /> : null;
    })}</div>
    {category.subcategories?.map((child) => <OrderingCategory key={child.id} category={child} items={items} />)}
  </section>;
}
export default function OrderMenu() {
  const { language } = useLanguage(); const copy = orderingCopy[language]; const catalog = useCatalog(); const { count } = useCart();
  return <OrderShell>
    <div className="mb-10 flex flex-wrap items-center justify-between gap-5"><h1 className="text-4xl font-semibold md:text-5xl">{copy.order}</h1><div className="flex flex-wrap gap-3"><RecentOrderLink /><Link href="/cart" className={buttonClass}>{copy.cart} ({count})</Link></div></div>
    {catalog.loading ? <p role="status">{copy.loading}</p> : catalog.error || !catalog.items.length ? <div role="alert"><p>{copy.unavailable}</p><button className={`${buttonClass} mt-4`} onClick={() => void catalog.refresh()}>{copy.retry}</button></div> : <>
      <nav className="mb-12 flex flex-wrap gap-2" aria-label={copy.browse}>{menuCategories.map((category) => <a key={category.id} href={`#order-${category.id}`} className="rounded-full border border-white/15 px-4 py-2 text-sm text-brand-300">{category.name[language]}</a>)}</nav>
      <div className="space-y-12">{menuCategories.map((category) => <OrderingCategory key={category.id} category={category} items={catalog.items} />)}</div>
    </>}
  </OrderShell>;
}
