"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { languageOptions, useLanguage } from "@/components/i18n/LanguageProvider";
import Logo from "../ui/Logo";

const languageCodes = ["fr", "en", "de"] as const;

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const links = [
    { name: t.nav.home, href: "/#home" },
    { name: t.nav.menu, href: "/menu" },
    { name: t.nav.about, href: "/#about" },
    { name: t.nav.contact, href: "/#contact" },
  ];

  const languageSwitcher = () => (
    <label className="relative flex items-center text-xs font-medium uppercase tracking-[0.2em] text-zinc-300 transition hover:text-white">
      <span className="sr-only">{t.nav.languageSwitcher}</span>
      <select
        aria-label={t.nav.languageSwitcher}
        title={languageOptions[language]}
        value={language}
        onChange={(event) => {
          setLanguage(event.target.value as keyof typeof languageOptions);
          setIsMenuOpen(false);
        }}
        className="appearance-none bg-transparent py-2 pl-1 pr-6 outline-none"
      >
        {languageCodes.map((code) => (
          <option key={code} value={code} className="bg-zinc-950 text-white">
            {code.toUpperCase()}
          </option>
        ))}
      </select>
      <ChevronDown size={15} className="pointer-events-none absolute right-0" />
    </label>
  );

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#090909]/90 backdrop-blur-xl">
      <div className="relative mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-5 sm:px-8 xl:grid xl:grid-cols-[auto_minmax(0,1fr)_auto]">
        <div className="shrink-0"><Logo /></div>

        <nav className="hidden justify-self-center xl:flex xl:items-center xl:justify-center xl:gap-5 2xl:gap-8" aria-label={t.nav.mainNavigation}>
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="whitespace-nowrap text-xs uppercase tracking-[0.18em] text-zinc-300 transition hover:text-white">
              {link.name}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center justify-self-end xl:flex xl:gap-4">
          {languageSwitcher()}
          <Link href="/order-online" className="whitespace-nowrap rounded-full border border-purple-600 px-5 py-3 text-xs uppercase tracking-[0.18em] text-white transition hover:bg-purple-700">
            {t.nav.orderOnline}
          </Link>
        </div>

        <button
          type="button"
          aria-label={isMenuOpen ? t.nav.closeMenu : t.nav.openMenu}
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((open) => !open)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white transition hover:border-purple-500 xl:hidden"
        >
          {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        {isMenuOpen && (
          <div className="absolute inset-x-0 top-full border-b border-white/10 bg-[#090909]/98 px-5 py-7 shadow-2xl shadow-black/30 sm:px-8 xl:hidden">
            <nav className="flex flex-col items-start gap-5" aria-label={t.nav.mobileNavigation}>
              {links.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setIsMenuOpen(false)} className="text-sm uppercase tracking-[0.24em] text-zinc-300 transition hover:text-white">
                  {link.name}
                </Link>
              ))}
              <div className="pt-1">{languageSwitcher()}</div>
              <Link href="/order-online" onClick={() => setIsMenuOpen(false)} className="mt-2 rounded-full border border-purple-600 px-6 py-3 text-sm uppercase tracking-[0.2em] text-white transition hover:bg-purple-700">
                {t.nav.orderOnline}
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
