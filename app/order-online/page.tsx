"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useLanguage } from "@/components/i18n/LanguageProvider";

export default function OrderOnlinePage() {
  const { t } = useLanguage();

  return (
    <>
      <Navbar />
      <main className="flex min-h-[80vh] items-center justify-center px-5 pb-20 pt-40 sm:px-8">
        <div className="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-[#111111] px-6 py-16 text-center sm:px-12">
          <ShoppingBag aria-hidden="true" size={32} strokeWidth={1.5} className="mx-auto mb-8 text-purple-400" />
          <p className="text-xs uppercase tracking-[0.24em] text-purple-400">{t.nav.orderOnline}</p>
          <h1 className="mt-5 text-4xl font-light text-white sm:text-6xl">{t.order.title}</h1>
          <p className="mx-auto mt-6 max-w-md text-base leading-7 text-zinc-400">{t.order.copy}</p>
          <Link href="/" className="mt-10 inline-flex rounded-full border border-purple-600 px-7 py-3 text-sm text-white transition hover:bg-purple-700">
            {t.order.back}
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
