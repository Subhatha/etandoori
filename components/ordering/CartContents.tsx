"use client";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useCart } from "./CartProvider";
import { orderingCopy } from "@/lib/ordering/copy";
import { formatMenuPrice } from "@/lib/format";
import { toCents } from "@/lib/ordering/cart";
import type { CatalogItem } from "@/lib/ordering/types";
import { fieldClass } from "./OrderShell";

export default function CartContents({ items, disabled = false }: { items: CatalogItem[]; disabled?: boolean }) {
  const cart = useCart(); const { language } = useLanguage(); const copy = orderingCopy[language];
  return <div className="space-y-5">{cart.lines.map((line) => {
    const item = items.find((entry) => entry.id === line.id);
    return <article key={line.id} className="rounded-2xl border border-white/10 bg-[#15120f] p-5">
      <div className="flex gap-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-brand-950/30">{item?.image ? <Image src={item.image} alt={item.name[language]} fill sizes="80px" className="object-cover" /> : <ImageIcon aria-hidden="true" className="m-6 text-brand-400/40" />}</div>
        <div className="min-w-0 flex-1"><h2 className="text-lg font-semibold">{item?.name[language] ?? copy.unavailableItem}</h2>{item?.variant && <p className="mt-1 text-sm text-brand-300">{item.variant[language]}</p>}{item && <p className="mt-2 text-sm text-zinc-400">{copy.unit}: {formatMenuPrice(item.price, language)}</p>}</div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3"><button type="button" aria-label={`${copy.decrease}: ${item?.name[language] ?? copy.quantity}`} disabled={disabled || line.quantity <= 1} onClick={() => cart.quantity(line.id, line.quantity - 1)} className="h-10 w-10 rounded-full border border-white/15 disabled:opacity-30">−</button><span aria-label={copy.quantity}>{line.quantity}</span><button type="button" aria-label={`${copy.increase}: ${item?.name[language] ?? copy.quantity}`} disabled={disabled || line.quantity >= 20 || cart.count >= 100} onClick={() => cart.quantity(line.id, line.quantity + 1)} className="h-10 w-10 rounded-full border border-white/15 disabled:opacity-30">+</button></div>
        {item && <strong className="text-brand-300">{formatMenuPrice(toCents(item.price) * line.quantity / 100, language)}</strong>}
        <button type="button" disabled={disabled} onClick={() => cart.remove(line.id)} className="text-sm text-zinc-400 underline hover:text-white">{copy.remove}</button>
      </div>
      <label className="mt-4 block text-sm text-zinc-400">{copy.notes}<textarea className={fieldClass} rows={2} maxLength={300} disabled={disabled} value={line.notes} onChange={(event) => cart.notes(line.id, event.target.value)} /></label>
    </article>;
  })}</div>;
}
