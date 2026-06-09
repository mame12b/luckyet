import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import am from "./locales/am.json";
import ti from "./locales/ti.json";
import om from "./locales/om.json";

export const SUPPORTED_LANGS = [
  { code: "en", label: "English",       nativeLabel: "English",        flag: "🇬🇧" },
  { code: "am", label: "Amharic",       nativeLabel: "አማርኛ",          flag: "🇪🇹", beta: true },
  { code: "ti", label: "Tigrinya",      nativeLabel: "ትግርኛ",          flag: "🇪🇹", beta: true },
  { code: "om", label: "Afaan Oromifa", nativeLabel: "Afaan Oromifa",  flag: "🇪🇹", beta: true },
];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      am: { translation: am },
      ti: { translation: ti },
      om: { translation: om },
    },
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGS.map(l => l.code),
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      lookupLocalStorage: "luckyet:lang",
      caches: ["localStorage"],
    },
  });

// Update <html lang="..."> attribute whenever language changes
i18n.on("languageChanged", (lng) => {
  if (typeof document !== "undefined") {
    document.documentElement.lang = lng;
  }
});

export default i18n;
