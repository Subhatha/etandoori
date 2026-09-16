"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { restaurant, restaurantCopy } from "@/lib/restaurant";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageProvider";

const fieldClassName = "mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-purple-500";

export default function Reservation() {
  const { t, language } = useLanguage();

  return (
    <section id="reservation" className="bg-[#0d0d0d] py-28 md:py-36">
      <div className="mx-auto w-full max-w-6xl px-8">
        <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.7 }} className="grid overflow-hidden rounded-[2rem] border border-white/10 bg-[#111111] lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative min-h-[21rem] lg:min-h-full">
            <Image src="/etandoori/images/dishes/3.jpg" alt={t.dishes.items[2].name} fill sizes="(min-width: 1024px) 48vw, 100vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-black/40" />
            <p className="absolute bottom-7 left-7 max-w-xs text-2xl font-semibold leading-tight text-white md:bottom-10 md:left-10 md:text-3xl">{t.reservation.imageCopy}</p>
          </div>

          <div className="p-7 md:p-10 lg:p-12">
            <p className="text-sm uppercase tracking-[0.55em] text-purple-400">{t.reservation.eyebrow}</p>
            <h2 className="mt-5 text-4xl font-bold leading-[1.05] text-white md:text-5xl">{t.reservation.title}</h2>
            <p className="mt-5 max-w-lg text-base leading-8 text-zinc-400">{t.reservation.copy}</p>
            <a href={restaurant.phoneHref} className="mt-4 inline-block text-sm text-purple-300 hover:text-white">{restaurantCopy[language].call}: {restaurant.phone}</a>

            <form className="mt-9 grid gap-5" onSubmit={(event) => event.preventDefault()}>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="text-xs uppercase tracking-[0.2em] text-zinc-400">
                  {t.reservation.guests}
                  <select defaultValue="2" className={fieldClassName} aria-label={t.reservation.guests}>
                    {t.reservation.guestOptions.map((label, index) => <option key={label} value={index === 4 ? "5+" : String(index + 1)}>{label}</option>)}
                  </select>
                </label>
                <label className="text-xs uppercase tracking-[0.2em] text-zinc-400">
                  {t.reservation.date}
                  <input type="date" className={`${fieldClassName} [color-scheme:dark]`} aria-label={t.reservation.date} />
                </label>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="text-xs uppercase tracking-[0.2em] text-zinc-400">
                  {t.reservation.time}
                  <select defaultValue="19:00" className={fieldClassName} aria-label={t.reservation.time}>
                    <option value="18:00">18:00</option><option value="18:30">18:30</option><option value="19:00">19:00</option><option value="19:30">19:30</option><option value="20:00">20:00</option>
                  </select>
                </label>
                <label className="text-xs uppercase tracking-[0.2em] text-zinc-400">
                  {t.reservation.name}
                  <input type="text" placeholder={t.reservation.namePlaceholder} className={fieldClassName} autoComplete="name" />
                </label>
              </div>
              <label className="text-xs uppercase tracking-[0.2em] text-zinc-400">
                {t.reservation.email}
                <input type="email" placeholder={t.reservation.emailPlaceholder} className={fieldClassName} autoComplete="email" />
              </label>
              <button type="submit" className="group mt-2 inline-flex w-fit items-center gap-3 rounded-full bg-purple-700 px-7 py-4 text-xs font-medium uppercase tracking-[0.24em] text-white transition hover:bg-purple-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400">
                {t.reservation.submit}
                <ArrowRight size={16} className="transition duration-300 group-hover:translate-x-1" />
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
