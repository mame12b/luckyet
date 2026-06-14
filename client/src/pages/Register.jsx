import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../lib/api";
import { useAuthStore } from "../store/auth";

const PHONE_CODES = [
  { code: "+971", country: "AE", flag: "🇦🇪", label: "UAE" },
  { code: "+966", country: "SA", flag: "🇸🇦", label: "Saudi Arabia" },
  { code: "+965", country: "KW", flag: "🇰🇼", label: "Kuwait" },
  { code: "+974", country: "QA", flag: "🇶🇦", label: "Qatar" },
  { code: "+973", country: "BH", flag: "🇧🇭", label: "Bahrain" },
  { code: "+968", country: "OM", flag: "🇴🇲", label: "Oman" },
  { code: "+251", country: "ET", flag: "🇪🇹", label: "Ethiopia" },
  { code: "+291", country: "ER", flag: "🇪🇷", label: "Eritrea" },
  { code: "+1",   country: "US", flag: "🇺🇸", label: "USA/Canada" },
  { code: "+44",  country: "GB", flag: "🇬🇧", label: "UK" },
];

export default function Register() {
  const { t, i18n } = useTranslation();
  const nav = useNavigate();
  const [search] = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [phoneCode, setPhoneCode] = useState(PHONE_CODES[0]);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    pin: "",
    promoCode: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const updatePin = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
    setForm({ ...form, pin: digits });
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    const phoneDigits = form.phoneNumber.replace(/\D/g, "");
    if (phoneDigits.length < 6 || phoneDigits.length > 12) {
      setError(t("auth.register.errorPhoneLength"));
      return;
    }
    if (!/^\d{6}$/.test(form.pin)) {
      setError(t("auth.register.errorPasswordFormat"));
      return;
    }

    setLoading(true);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: `${phoneCode.code}${phoneDigits}`,
        pin: form.pin,
        country: phoneCode.country,
        language: (i18n.language || "en").split("-")[0],
      };
      if (form.promoCode.trim()) {
        payload.promoCode = form.promoCode.trim().toUpperCase();
      }

      const { data } = await api.post("/auth/register", payload);
      setAuth(data.user, data.accessToken);
      const redirect = search.get("redirect");
      nav(redirect || "/");
    } catch (err) {
      // Backend errors stay in English per design decision
      const msg = err.response?.data?.message
        || err.response?.data?.errors?.[0]?.message
        || err.message
        || t("auth.register.registrationFailed");
      setError(msg);
      console.error("Registration error:", err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  return (
    // KEY MOBILE FIXES:
    // - px-3 sm:px-6   : tighter horizontal padding on phones (saves 8px each side)
    // - max-w-none on mobile, max-w-md from sm: up — form fills phone width, caps on tablet+
    // - p-4 sm:p-7     : tighter internal card padding on phones
    <div className="bg-surface min-h-[80vh] flex items-start justify-center px-3 sm:px-6 py-6 sm:py-12">
      <div className="w-full max-w-none sm:max-w-md">
        <div className="bg-white border border-border rounded-2xl p-4 sm:p-7 shadow-card">
          <h1 className="text-2xl font-extrabold tracking-tight mb-1">{t("auth.register.title")}</h1>
          <p className="text-text-muted text-sm mb-5">{t("auth.register.subtitle")}</p>

          <form onSubmit={submit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold mb-1">{t("auth.register.fullName")}</label>
              <input
                type="text"
                value={form.fullName}
                onChange={update("fullName")}
                required
                minLength="2"
                placeholder={t("auth.register.fullNamePlaceholder")}
                autoComplete="name"
                className="w-full bg-white border border-border focus:border-brand focus:ring-2 focus:ring-brand/10 outline-none rounded-md px-3 py-3 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">{t("auth.register.email")}</label>
              <input
                type="email"
                value={form.email}
                onChange={update("email")}
                required
                placeholder={t("auth.register.emailPlaceholder")}
                autoComplete="email"
                inputMode="email"
                className="w-full bg-white border border-border focus:border-brand focus:ring-2 focus:ring-brand/10 outline-none rounded-md px-3 py-3 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">{t("auth.common.phoneNumber")}</label>
              <div className="flex gap-2">
                <select
                  value={phoneCode.code}
                  onChange={(e) => setPhoneCode(PHONE_CODES.find(c => c.code === e.target.value) || PHONE_CODES[0])}
                  className="bg-white border border-border focus:border-brand outline-none rounded-md px-2 py-3 text-sm font-mono w-[88px] flex-shrink-0"
                >
                  {PHONE_CODES.map(c => (
                    <option key={c.country} value={c.code}>{c.flag} {c.code}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={form.phoneNumber}
                  onChange={update("phoneNumber")}
                  required
                  placeholder={t("auth.common.phonePlaceholder")}
                  autoComplete="tel-national"
                  className="flex-1 min-w-0 bg-white border border-border focus:border-brand focus:ring-2 focus:ring-brand/10 outline-none rounded-md px-3 py-3 text-sm"
                />
              </div>
              <p className="text-[10px] text-text-faint mt-1">
                {t("auth.common.selectedCountry", { flag: phoneCode.flag, label: phoneCode.label })}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">{t("auth.register.choosePassword")}</label>
              <input
                type="password"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength="6"
                value={form.pin}
                onChange={updatePin}
                required
                placeholder="● ● ● ● ● ●"
                autoComplete="new-password"
                className="w-full bg-white border border-border focus:border-brand outline-none rounded-md px-3 py-3 text-lg tracking-[0.4em] text-center font-mono"
              />
              <p className="text-[10px] text-text-faint mt-1">
                {t("auth.register.passwordHint")} <span className="text-text-muted">· {form.pin.length}/6</span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                {t("auth.register.promoCodeOptional")} <span className="text-text-faint font-normal">{t("auth.register.optional")}</span>
              </label>
              <input
                type="text"
                value={form.promoCode}
                onChange={update("promoCode")}
                placeholder={t("auth.register.promoPlaceholder")}
                autoComplete="off"
                className="w-full bg-white border border-border focus:border-brand outline-none rounded-md px-3 py-3 text-sm font-mono uppercase"
              />
            </div>

            {error && <div className="bg-danger-light text-danger text-xs px-3 py-2 rounded-md">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand text-white font-bold py-3.5 rounded-lg hover:bg-brand-dark transition shadow-gold disabled:opacity-50 text-base"
            >
              {loading ? t("auth.register.creating") : t("auth.register.createButton")}
            </button>

            <p className="text-[11px] text-text-faint text-center pt-1 leading-relaxed">
              {t("auth.register.termsNotice")}
            </p>
          </form>
        </div>

        <p className="text-center text-sm text-text-muted mt-5">
          {t("auth.register.alreadyHaveAccount")} <Link to="/login" className="text-brand-dark font-semibold hover:underline">{t("auth.register.logIn")}</Link>
        </p>
      </div>
    </div>
  );
}