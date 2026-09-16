"use client";

import Link from "next/link";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { restaurant, restaurantCopy, restaurantDirectionsUrl } from "@/lib/restaurant";
import Logo from "../ui/Logo";

export default function Footer() {
  const { t, language } = useLanguage();
  const copy = restaurantCopy[language];
  const links = [
    { label: t.footer.home, href: "/#home" },
    { label: t.footer.menu, href: "/menu" },
    { label: t.footer.story, href: "/#about" },
    { label: t.footer.reservations, href: "/#reservation" },
  ];

  return (
    <footer className="border-t border-white/10 bg-[#090909] py-12">
      <div className="mx-auto w-full max-w-6xl px-8">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Logo />
            <p className="mt-5 max-w-sm text-sm leading-6 text-zinc-500">{t.footer.description}</p>
            <address className="mt-4 text-sm not-italic leading-7 text-zinc-400">
              <a href={restaurantDirectionsUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white">{restaurant.street}<br />{restaurant.city}</a><br />
              <a href={restaurant.phoneHref} className="text-purple-300 hover:text-white">{restaurant.phone}</a>
            </address>
            <a href={restaurant.website} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-xs text-zinc-400 hover:text-white">{copy.website}: esushi.fr ↗</a>
          </div>
          <nav aria-label={t.footer.navigation} className="flex flex-wrap gap-x-7 gap-y-4">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="text-xs uppercase tracking-[0.22em] text-zinc-400 transition hover:text-white">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-10 border-t border-white/10 pt-6 text-xs uppercase tracking-[0.18em] text-zinc-600">
          © {new Date().getFullYear()} eTandoori. {t.footer.copyright}
        </div>
      </div>
    </footer>
  );
}
