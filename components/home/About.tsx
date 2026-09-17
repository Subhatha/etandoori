"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { restaurantCopy } from "@/lib/restaurant";
import { ArrowUpRight } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageProvider";

export default function About() {
  const { t, language } = useLanguage();
  const copy = restaurantCopy[language];

  return (
    <section id="about" className="bg-[#0c0a09] py-28 md:py-36">
      <div className="mx-auto w-full max-w-6xl px-8">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-20">
          <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.7 }} className="relative min-h-[30rem] overflow-hidden rounded-[2rem] border border-white/10 bg-[#15120f] md:min-h-[38rem]">
            <Image src="/etandoori/images/dishes/2.jpg" alt={t.dishes.items[1].name} fill sizes="(min-width: 1024px) 52vw, 100vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-6 p-7 md:p-10">
              <p className="max-w-[15rem] text-lg leading-7 text-white md:text-xl">{t.about.imageCopy}</p>
              <span className="shrink-0 rounded-full border border-white/20 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.24em] text-zinc-200 backdrop-blur">{copy.halal}</span>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.7, delay: 0.1 }}>
            <p className="text-sm uppercase tracking-[0.55em] text-brand-400">{t.about.eyebrow}</p>
            <h2 className="mt-6 max-w-xl text-5xl font-bold leading-[1.05] text-white md:text-6xl">{t.about.title}</h2>
            <p className="mt-8 max-w-lg text-lg leading-9 text-zinc-400">{copy.about}</p>

            <ul className="mt-10 flex flex-wrap gap-3 border-y border-white/10 py-7">
              {copy.services.map((service) => <li key={service} className="text-sm text-brand-300">{service}</li>)}
            </ul>

            <Link href="#reservation" className="group mt-10 inline-flex items-center gap-3 text-sm font-medium uppercase tracking-[0.24em] text-white transition hover:text-brand-300">
              {t.about.discover}
              <ArrowUpRight size={18} className="transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
