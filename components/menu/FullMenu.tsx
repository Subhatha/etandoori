"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { menuCategories } from "@/lib/menu";
import { menuCopy } from "@/lib/menu-copy";
import CategorySection from "./CategorySection";

export default function FullMenu() {
  const { language } = useLanguage();
  const copy = menuCopy[language];

  return (
    <section id="menu" className="relative scroll-mt-20 bg-[#0c0a09] pb-24 pt-36 md:pb-32 md:pt-44">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <p className="text-sm uppercase tracking-[0.4em] text-brand-400">{copy.eyebrow}</p>
          <h1 className="mt-6 text-5xl font-bold leading-tight text-white md:text-7xl">{copy.title}</h1>
          <p className="mt-6 text-lg leading-8 text-zinc-400">{copy.copy}</p>
        </div>
        <nav aria-label={copy.navigation} className="mb-16 flex flex-wrap justify-center gap-2" lang={language}>
          {menuCategories.map((category) => (
            <a key={category.id} href={`#menu-${category.id}`} className="rounded-full border border-white/15 px-4 py-2 text-sm text-zinc-300 transition hover:border-brand-500 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-400">
              {category.name[language]}
            </a>
          ))}
        </nav>
        <div className="space-y-16" lang={language}>
          {menuCategories.map((category) => (
            <CategorySection key={category.id} category={category} />
          ))}
        </div>
      </div>
    </section>
  );
}
