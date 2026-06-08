import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGS } from "../i18n";
import { useAuthStore } from "../store/auth";
import api from "../lib/api";

export default function LanguageSwitcher({ compact = false, position = "right" }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  // Resolve the current language; ignore region suffixes (e.g. "en-US" → "en")
  const currentCode = (i18n.language || "en").split("-")[0];
  const current = SUPPORTED_LANGS.find(l => l.code === currentCode) || SUPPORTED_LANGS[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const changeLang = async (code) => {
    setOpen(false);
    if (code === currentCode) return;
    i18n.changeLanguage(code);

    if (user) {
      try {
        await api.patch("/auth/me/language", { language: code });
        if (setUser) setUser({ ...user, language: code });
      } catch (err) {
        // Soft fail — change still works locally
        console.warn("Could not save language to account:", err?.response?.data?.message || err.message);
      }
    }
  };

  const dropdownPosition = position === "left" ? "left-0" : "right-0";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={
          compact
            ? "flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-surface text-sm font-medium"
            : "flex items-center gap-2 px-3 py-2 rounded-md hover:bg-surface text-sm font-medium border border-border"
        }
        aria-label="Change language"
        aria-expanded={open}
      >
        <span className="text-base leading-none">{current.flag}</span>
        {compact ? (
          <span className="text-xs uppercase font-bold">{current.code}</span>
        ) : (
          <>
            <span>{current.nativeLabel}</span>
            <span className="text-xs opacity-60">▼</span>
          </>
        )}
      </button>

      {open && (
        <div className={`absolute ${dropdownPosition} mt-1 w-48 bg-white border border-border rounded-lg shadow-lg z-[60] overflow-hidden`}>
          {SUPPORTED_LANGS.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLang(lang.code)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition ${
                lang.code === current.code ? "bg-surface font-bold" : "hover:bg-surface"
              }`}
            >
              <span className="text-base leading-none">{lang.flag}</span>
              <span className="flex-1 truncate">{lang.nativeLabel}</span>
              {lang.beta && (
                <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold whitespace-nowrap">
                  Beta
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
