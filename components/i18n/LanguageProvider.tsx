"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { languageOptions, translations, type Language, type Translation } from "@/lib/translations";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Translation;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const storageKey = "etandoori-language-v2";
const changeEvent = "etandoori-language-change";
const defaultLanguage: Language = "fr";

function readStoredLanguage(): Language {
  const savedLanguage = window.localStorage.getItem(storageKey);
  return savedLanguage === "en" || savedLanguage === "fr" || savedLanguage === "de"
    ? savedLanguage
    : defaultLanguage;
}

function subscribeToLanguage(callback: () => void) {
  const notify = () => callback();
  window.addEventListener("storage", notify);
  window.addEventListener(changeEvent, notify);

  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(changeEvent, notify);
  };
}

export default function LanguageProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const language = useSyncExternalStore(subscribeToLanguage, readStoredLanguage, () => defaultLanguage);

  const setLanguage = useCallback((nextLanguage: Language) => {
    window.localStorage.setItem(storageKey, nextLanguage);
    window.dispatchEvent(new Event(changeEvent));
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem(storageKey, language);
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage, t: translations[language] }), [language, setLanguage]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}

export { languageOptions };
