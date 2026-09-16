import type { Language } from "./translations";

const locales: Record<Language, string> = {
  fr: "fr-FR",
  en: "en-IE",
  de: "de-DE",
};

export function formatMenuPrice(price: number, language: Language): string {
  return new Intl.NumberFormat(locales[language], {
    style: "currency",
    currency: "EUR",
  }).format(price);
}
