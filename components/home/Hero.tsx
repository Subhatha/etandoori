"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageProvider";

export default function Hero() {
  const { t } = useLanguage();

  return (
    <section id="home" className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[#090909] pb-16 pt-36 sm:pb-20 sm:pt-40 lg:pb-24 lg:pt-44">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[850px] w-[850px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-700/10 blur-[220px]" />
        <div className="absolute left-0 top-0 h-[400px] w-[400px] rounded-full bg-purple-700/5 blur-[180px]" />
        <div className="absolute bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-purple-700/5 blur-[180px]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center px-5 text-center sm:px-8">
        <motion.p initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-6 text-xs uppercase leading-6 tracking-[0.3em] sm:mb-8 sm:text-sm sm:tracking-[0.55em] text-purple-400">
          {t.hero.eyebrow}
        </motion.p>
        <motion.h1 initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }} className="max-w-5xl text-4xl font-bold leading-[1.1] text-white sm:text-6xl md:text-7xl lg:text-8xl">
          {t.hero.title.split("\n").map((line, index) => <span key={index}>{index > 0 && <br />}{line}</span>)}
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }} className="mt-6 max-w-3xl text-base leading-7 sm:mt-8 sm:text-lg sm:leading-9 text-zinc-400">
          {t.hero.copy}
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }} className="mt-8 flex w-full flex-col items-stretch justify-center gap-4 sm:mt-10 sm:w-auto sm:flex-row sm:flex-wrap sm:gap-5">
          <Link href="#reservation" className="flex items-center justify-center rounded-full bg-purple-700 px-6 py-4 text-xs uppercase tracking-[0.2em] sm:px-9 sm:text-sm sm:tracking-[0.3em] text-white transition hover:bg-purple-600">
            {t.hero.reserve}
          </Link>
          <Link href="/menu" className="group flex items-center justify-center gap-3 rounded-full border border-white/15 px-6 py-4 text-xs uppercase tracking-[0.2em] sm:px-9 sm:text-sm sm:tracking-[0.3em] text-white transition hover:border-purple-600 hover:text-purple-400">
            {t.hero.explore}
            <ArrowRight size={18} className="transition duration-300 group-hover:translate-x-2" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
