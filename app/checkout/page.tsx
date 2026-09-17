"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useCart } from "@/components/ordering/CartProvider";
import { useCatalog } from "@/components/ordering/useCatalog";
import OrderShell, { buttonClass, fieldClass } from "@/components/ordering/OrderShell";
import { orderingCopy } from "@/lib/ordering/copy";
import { orderingApiPath } from "@/lib/ordering/paths";
import { cartSubtotal, toCents } from "@/lib/ordering/cart";
import { formatMenuPrice } from "@/lib/format";
import type { CheckoutConfig, Customer } from "@/lib/ordering/types";

export default function CheckoutPage() {
  const cart = useCart(), catalog = useCatalog(), router = useRouter();
  const { language } = useLanguage(); const copy = orderingCopy[language];
  const [customer, setCustomer] = useState<Customer>({ name: "", phone: "", email: "", orderType: "pickup", street: "", postalCode: "", city: "", deliveryZone: "", deliveryInstructions: "", notes: "" });
  const [config, setConfig] = useState<CheckoutConfig | null>(null);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const inFlight = useRef(false); const attempt = useRef<{ hash: string; id: string } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(orderingApiPath("ordering/config"), { cache: "no-store", signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error(); setConfig(await response.json()); })
      .catch(() => { if (!controller.signal.aborted) setError("unavailable"); });
    return () => controller.abort();
  }, []);
  const zone = config?.zones.find((entry) => entry.id === customer.deliveryZone);
  const subtotal = cartSubtotal(cart.lines, catalog.items);
  const fee = customer.orderType === "delivery" ? zone?.fee ?? 0 : 0;
  const minimumMet = customer.orderType === "pickup" || !!zone && subtotal >= zone.minimum;
  const ready = config && cart.lines.length > 0 && !catalog.loading && !catalog.error && minimumMet && cart.lines.every((line) => catalog.items.some((item) => item.id === line.id));
  const update = (key: keyof Customer, value: string) => setCustomer((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!ready || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    const submitted = cart.lines.map((line) => ({ ...line }));
    try {
      const payload = { language, customer, items: submitted };
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(payload)));
      const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
      if (!attempt.current) { try { attempt.current = JSON.parse(sessionStorage.getItem("etandoori-order-attempt") ?? "null"); } catch {} }
      if (attempt.current?.hash !== hash) attempt.current = { hash, id: crypto.randomUUID() };
      try { sessionStorage.setItem("etandoori-order-attempt", JSON.stringify(attempt.current)); } catch {}
      const response = await fetch(orderingApiPath("orders"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, requestId: attempt.current!.id }), signal: AbortSignal.timeout(30000) });
      const result = await response.json();
      if (!response.ok || !result.order?.id) {
        setError(result.error ?? "unavailable");
        if (result.error === "itemUnavailable") await catalog.refresh();
        return;
      }
      cart.complete(result.order, submitted);
      router.push("/order-confirmation");
    } catch { setError("unavailable"); }
    finally { inFlight.current = false; setBusy(false); }
  }
  const fields = [{ key: "name", label: copy.name, max: 100, required: true, type: "text", auto: "name" }, { key: "phone", label: copy.phone, max: 30, required: true, type: "tel", auto: "tel" }, { key: "email", label: copy.email, max: 254, required: false, type: "email", auto: "email" }] as const;
  return <OrderShell><h1 className="mb-8 text-4xl font-semibold">{copy.checkout}</h1>
    {!cart.lines.length ? <><p>{copy.empty}</p><Link href="/order-online" className={`${buttonClass} mt-5`}>{copy.browse}</Link></> : <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <fieldset disabled={busy} className="min-w-0 space-y-6">
        <legend className="mb-4 text-xl">{copy.customer}</legend>
        <div className="flex gap-5">{(["pickup", "delivery"] as const).map((type) => <label key={type} className="flex items-center gap-2 rounded-full border border-brand-500/40 px-5 py-3"><input type="radio" name="orderType" value={type} checked={customer.orderType === type} onChange={() => update("orderType", type)} className="accent-amber-600" />{copy[type]}</label>)}</div>
        {fields.map((field) => <label key={field.key} className="block text-sm text-zinc-300">{field.label}<input name={field.key} type={field.type} autoComplete={field.auto} required={field.required} maxLength={field.max} value={customer[field.key]} onChange={(event) => update(field.key, event.target.value)} className={fieldClass} /></label>)}
        {customer.orderType === "delivery" && <div className="space-y-5 rounded-2xl border border-white/10 p-5">
          <label className="block text-sm text-zinc-300">{copy.region}<select required value={customer.deliveryZone} onChange={(event) => update("deliveryZone", event.target.value)} className={fieldClass}><option value="">{copy.choose}</option>{config?.zones.map((entry) => <option value={entry.id} key={entry.id}>{entry.towns} — {copy.minimumLabel} {formatMenuPrice(entry.minimum, language)}</option>)}</select></label>
          {zone && <p className="text-sm text-brand-300">{copy.minimumLabel}: {formatMenuPrice(zone.minimum, language)} · {copy.deliveryFee}: {formatMenuPrice(zone.fee, language)}</p>}
          {([{ key: "street", label: copy.street, max: 200, auto: "street-address" }, { key: "postalCode", label: copy.postalCode, max: 5, auto: "postal-code" }, { key: "city", label: copy.city, max: 100, auto: "address-level2" }] as const).map((field) => <label key={field.key} className="block text-sm text-zinc-300">{field.label}<input required name={field.key} maxLength={field.max} autoComplete={field.auto} pattern={field.key === "postalCode" ? "[0-9]{5}" : undefined} value={customer[field.key]} onChange={(event) => update(field.key, event.target.value)} className={fieldClass} /></label>)}
          <label className="block text-sm text-zinc-300">{copy.instructions}<textarea maxLength={500} rows={2} value={customer.deliveryInstructions} onChange={(event) => update("deliveryInstructions", event.target.value)} className={fieldClass} /></label>
        </div>}
        <label className="block text-sm text-zinc-300">{copy.orderNotes}<textarea maxLength={1000} rows={3} value={customer.notes} onChange={(event) => update("notes", event.target.value)} className={fieldClass} /></label>
      </fieldset>
      <aside className="h-fit space-y-5 rounded-2xl border border-white/10 bg-[#15120f] p-6">
        <h2 className="text-xl">{copy.cart} ({cart.count})</h2>
        <ul className="space-y-3 text-sm text-zinc-300">{cart.lines.map((line) => { const item = catalog.items.find((entry) => entry.id === line.id); return <li key={line.id}>{line.quantity} × {item?.name[language] ?? copy.unavailableItem}{item?.variant && ` — ${item.variant[language]}`}</li>; })}</ul>
        <dl className="space-y-3 border-t border-white/10 pt-5">{[[copy.subtotal, subtotal], [copy.deliveryFee, fee], [copy.total, (toCents(subtotal) + toCents(fee)) / 100]].map(([label, amount]) => <div key={label} className="flex justify-between gap-4"><dt>{label}</dt><dd className="text-brand-300">{formatMenuPrice(Number(amount), language)}</dd></div>)}</dl>
        <p className="text-sm leading-6 text-zinc-400">{copy.paymentNote}</p>
        {!minimumMet && zone && <p role="status" className="text-sm text-brand-300">{copy.minimum}</p>}
        {(error || catalog.error) && <p role="alert" className="text-sm text-brand-300">{copy[(error || "unavailable") as keyof typeof copy] ?? copy.unavailable}</p>}
        <button type="submit" disabled={!ready || busy} className={`${buttonClass} w-full`}>{busy ? copy.sending : copy.place}</button>
        <Link href="/cart" className="block text-center text-sm text-brand-300">{copy.back}</Link>
      </aside>
    </form>}
  </OrderShell>;
}
