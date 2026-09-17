"use client";

import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import type { MenuCategory } from "@/lib/menu";
import { formatMenuPrice } from "@/lib/format";
import { menuCopy } from "@/lib/menu-copy";

export default function CategorySection({ category, nested = false }: { category: MenuCategory; nested?: boolean }) {
  const { language } = useLanguage();
  const copy = menuCopy[language];
  const Heading = nested ? "h3" : "h2";
  const DishHeading = nested ? "h4" : "h3";

  return (
    <section id={`menu-${category.id}`} aria-labelledby={`heading-${category.id}`} className="scroll-mt-28">
      <div className="mb-6 border-b border-white/10 pb-5">
        <Heading id={`heading-${category.id}`} className="text-3xl font-semibold text-white">{category.name[language]}</Heading>
        {category.note && <p className="mt-3 text-sm leading-6 text-zinc-400">{category.note[language]}</p>}
      </div>
      {category.items.length > 0 && <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {category.items.map((dish) => (
          <article key={dish.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#15120f]">
            <div className="relative aspect-[16/9] border-b border-white/5 bg-gradient-to-br from-brand-950/30 to-zinc-900">
              {dish.image ? (
                <Image src={dish.image} alt={dish.name[language]} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-zinc-500">
                  <ImageIcon aria-hidden="true" size={28} strokeWidth={1.25} />
                  <span lang={language} className="text-xs tracking-wide">{copy.photo}</span>
                </div>
              )}
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <DishHeading className="text-lg font-semibold leading-6 text-white">{dish.name[language]}</DishHeading>
                {!dish.prices && <span className="shrink-0 text-sm font-medium leading-6 text-brand-300">{formatMenuPrice(dish.price, language)}</span>}
              </div>
              {dish.description[language] && <p className="mt-3 text-sm leading-6 text-zinc-400">{dish.description[language]}</p>}
              {dish.prices && (
                <dl className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm">
                  {dish.prices.map((option) => (
                    <div key={option.label.fr} className="flex justify-between gap-3">
                      <dt className="text-zinc-400">{option.label[language]}</dt>
                      <dd className="shrink-0 font-medium text-brand-300">{formatMenuPrice(option.price, language)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </article>
        ))}
      </div>}
      {category.subcategories && (
        <div className="mt-10 space-y-12">
          <nav aria-label={`${copy.navigation}: ${category.name[language]}`} className="flex flex-wrap gap-3">
            {category.subcategories.map((subcategory) => (
              <a key={subcategory.id} href={`#menu-${subcategory.id}`} className="rounded-full border border-brand-500/30 px-4 py-2 text-sm text-brand-300 transition hover:border-brand-400 hover:text-white">
                {subcategory.name[language]}
              </a>
            ))}
          </nav>
          {category.subcategories.map((subcategory) => (
            <CategorySection key={subcategory.id} category={subcategory} nested />
          ))}
        </div>
      )}
    </section>
  );
}
