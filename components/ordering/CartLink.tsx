"use client";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "./CartProvider";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { orderingCopy } from "@/lib/ordering/copy";
export default function CartLink() {
  const { count } = useCart(); const { language } = useLanguage();
  return <Link href="/cart" aria-label={`${orderingCopy[language].cart} (${count})`} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-brand-500/40 px-3 py-2 text-sm text-brand-300"><ShoppingBag size={18} aria-hidden="true" /><span>{count}</span></Link>;
}
