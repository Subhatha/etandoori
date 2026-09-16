"use client";

import { Clock3, MapPin, Phone } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { formatMenuPrice } from "@/lib/format";
import { deliveryZones, restaurant, restaurantCopy, restaurantDirectionsUrl, restaurantMapUrl } from "@/lib/restaurant";

export default function Contact() {
  const { language, t } = useLanguage();
  const copy = restaurantCopy[language];
  const cardClass = "rounded-2xl border border-white/10 bg-[#111111] p-6 sm:p-8";

  return (
    <section id="contact" className="scroll-mt-24 bg-[#090909] py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-purple-400">{t.contact.eyebrow}</p>
          <h2 className="mt-5 text-4xl font-semibold leading-tight text-white md:text-5xl">{copy.title}</h2>
          <p className="mt-6 text-lg leading-8 text-zinc-400">{copy.intro}</p>
          <ul className="mt-6 flex flex-wrap justify-center gap-3">
            {[...copy.services, copy.halal].map((service) => <li key={service} className="rounded-full border border-purple-500/25 px-4 py-2 text-sm text-purple-300">{service}</li>)}
          </ul>
        </div>
        <div className="mt-12 grid gap-5 lg:grid-cols-[1fr_1fr_1.4fr]">
          <div className={cardClass}>
            <Phone aria-hidden="true" className="text-purple-400" size={22} />
            <h3 className="mt-5 text-xl font-semibold">{copy.phone}</h3>
            <a href={restaurant.phoneHref} className="mt-4 inline-block text-xl text-purple-300 hover:text-white">{restaurant.phone}</a>
            <p className="mt-3 text-sm leading-6 text-zinc-400">{copy.call}</p>
          </div>
          <div className={cardClass}>
            <MapPin aria-hidden="true" className="text-purple-400" size={22} />
            <h3 className="mt-5 text-xl font-semibold">{copy.address}</h3>
            <address className="mt-4 text-sm not-italic leading-7 text-zinc-300">{restaurant.street}<br />{restaurant.city}</address>
            <a href={restaurantDirectionsUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-sm text-purple-300 hover:text-white">{copy.directions} ↗</a>
          </div>
          <div className={cardClass}>
            <Clock3 aria-hidden="true" className="text-purple-400" size={22} />
            <h3 className="mt-5 text-xl font-semibold">{copy.hours}</h3>
            <dl className="mt-4 space-y-4 text-sm">
              <div><dt className="text-zinc-400">{copy.weekdays}</dt><dd className="mt-1">{restaurant.lunch} · {restaurant.dinner}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-zinc-400">{copy.tuesday}</dt><dd>{copy.closed}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-zinc-400">{copy.sunday}</dt><dd>{restaurant.dinner}</dd></div>
            </dl>
            <p className="mt-4 text-xs leading-5 text-zinc-500">{copy.sundayNote}</p>
          </div>
        </div>
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#111111]">
          <iframe title={copy.map} src={`${restaurantMapUrl}&hl=${language}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen className="block h-[340px] w-full border-0 md:h-[420px]" />
          <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:px-8">
            <p className="text-sm text-zinc-300">{restaurant.street} · {restaurant.city}</p>
            <a href={restaurantDirectionsUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-purple-300 hover:text-white">{copy.directions} ↗</a>
          </div>
        </div>
        <details className="mt-6 rounded-2xl border border-white/10 bg-[#111111] p-6 sm:p-8">
          <summary className="cursor-pointer text-xl font-semibold">{copy.delivery}</summary>
          <p className="mt-4 text-sm leading-6 text-zinc-400">{copy.deliveryNote}</p>
          <table className="mt-5 w-full text-left text-sm">
            <thead><tr className="border-b border-white/10 text-zinc-400"><th scope="col" className="pb-3 pr-4 font-medium">{copy.zone}</th><th scope="col" className="pb-3 text-right font-medium">{copy.minimum}</th></tr></thead>
            <tbody>{deliveryZones.map((zone) => <tr key={zone.towns} className="border-b border-white/5 last:border-0"><th scope="row" className="py-3 pr-4 font-normal text-zinc-300">{zone.towns}</th><td className="whitespace-nowrap py-3 text-right text-purple-300">{formatMenuPrice(zone.minimum, language)}</td></tr>)}</tbody>
          </table>
        </details>
      </div>
    </section>
  );
}
