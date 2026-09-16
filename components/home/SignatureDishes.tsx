"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Pause, Play, Utensils } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { menuCategories, type MenuCategory } from "@/lib/menu";
import { formatMenuPrice } from "@/lib/format";
import { featuredDishCopy } from "@/lib/menu-copy";

function collectItems(categories: MenuCategory[]): MenuCategory["items"] {
  return categories.flatMap((category) => [
    ...category.items,
    ...collectItems(category.subcategories ?? []),
  ]);
}

const SLIDE_INTERVAL_MS = 5000;

const allItems = collectItems(menuCategories);
const featuredIds = ["poulet-3", "biryani-2", "legumes-3", "agneau-2"];
const featuredDishes = featuredIds.map((id) => allItems.find((item) => item.id === id)!);

const controlClass = "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 text-white transition hover:border-purple-400 hover:bg-purple-500/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-purple-400";

export default function SignatureDishes() {
  const { language, t } = useLanguage();
  const copy = featuredDishCopy[language];
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const reducedMotion = useReducedMotion();
  const autoPlaying = !paused && !hovered && !focused && reducedMotion === false;
  const dish = featuredDishes[active];

  useEffect(() => {
    if (!autoPlaying) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setActive((current) => (current + 1) % featuredDishes.length);
    }, SLIDE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [autoPlaying]);

  function selectSlide(index: number) {
    setActive((index + featuredDishes.length) % featuredDishes.length);
    setPaused(true);
  }

  return (
    <section id="featured-dishes" aria-labelledby="featured-heading" className="bg-[#090909] py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-purple-400">{t.dishes.eyebrow}</p>
            <h2 id="featured-heading" className="mt-4 text-4xl font-semibold leading-tight text-white md:text-5xl">{t.dishes.title}</h2>
          </div>
          <Link href="/menu" className="inline-flex items-center gap-3 self-start rounded-full border border-purple-500/50 px-6 py-3 text-sm text-white transition hover:bg-purple-700 md:self-auto">
            {copy.menu}<ArrowRight aria-hidden="true" size={17} />
          </Link>
        </div>
        <div
          role="region"
          aria-roledescription={copy.carousel}
          aria-label={t.dishes.eyebrow}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocusCapture={() => setFocused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
          }}
          className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#111111]"
        >
          <div className="grid md:grid-cols-2" aria-live={autoPlaying ? "off" : "polite"} aria-atomic="true">
            <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-purple-950/50 via-[#16121c] to-[#0d0d0d] md:aspect-auto md:min-h-[380px]">
              {dish.image ? (
                <Image key={dish.id} src={dish.image} alt={dish.name[language]} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
                  <div aria-hidden="true" className="flex h-40 w-40 items-center justify-center rounded-full border border-purple-400/15 bg-purple-400/[0.03] ring-1 ring-purple-400/10 ring-offset-[18px] ring-offset-transparent sm:h-48 sm:w-48">
                    <Utensils size={40} strokeWidth={1} className="text-purple-300/50" />
                  </div>
                  <span className="mt-3 text-xs tracking-[0.15em] text-zinc-500">{copy.photo}</span>
                </div>
              )}
            </div>
            <div className="flex min-h-[330px] flex-col justify-center p-7 sm:p-10 lg:p-12">
              <motion.div key={dish.id} initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
                <p className="text-xs uppercase tracking-[0.25em] text-purple-400">{copy.slide} {String(active + 1).padStart(2, "0")} / {String(featuredDishes.length).padStart(2, "0")}</p>
                <h3 className="mt-5 text-3xl font-semibold leading-tight text-white lg:text-4xl">{dish.name[language]}</h3>
                <p className="mt-5 min-h-[6rem] text-base leading-7 text-zinc-400">{dish.description[language]}</p>
                <p className="mt-6 text-xl font-medium text-purple-300">{formatMenuPrice(dish.price, language)}</p>
              </motion.div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 px-6 py-4 sm:px-10">
            <div className="flex items-center gap-1">
              {featuredDishes.map((item, index) => (
                <button key={item.id} type="button" aria-label={`${copy.slide} ${index + 1}: ${item.name[language]}`} aria-current={index === active ? "true" : undefined} onClick={() => selectSlide(index)} className="flex h-11 w-9 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-purple-400">
                  <span className={`h-1 rounded-full transition-all motion-reduce:transition-none ${index === active ? "w-7 bg-purple-400" : "w-3 bg-zinc-600"}`} />
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {!reducedMotion && <button type="button" onClick={() => setPaused((value) => !value)} aria-label={paused ? copy.play : copy.pause} className={controlClass}>{paused ? <Play aria-hidden="true" size={16} /> : <Pause aria-hidden="true" size={16} />}</button>}
              <button type="button" onClick={() => selectSlide(active - 1)} aria-label={copy.previous} className={controlClass}><ArrowLeft aria-hidden="true" size={18} /></button>
              <button type="button" onClick={() => selectSlide(active + 1)} aria-label={copy.next} className={controlClass}><ArrowRight aria-hidden="true" size={18} /></button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
