import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../lib/api";

const PHONE_CODES = [
  { code: "+971", flag: "🇦🇪", label: "UAE" },
  { code: "+966", flag: "🇸🇦", label: "Saudi Arabia" },
  { code: "+965", flag: "🇰🇼", label: "Kuwait" },
  { code: "+974", flag: "🇶🇦", label: "Qatar" },
  { code: "+251", flag: "🇪🇹", label: "Ethiopia" },
  { code: "+291", flag: "🇪🇷", label: "Eritrea" },
  { code: "+1",   flag: "🇺🇸", label: "USA/Canada" },
  { code: "+44",  flag: "🇬🇧", label: "UK" },
];

export default function ForgotPassword() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [phoneCode, setPhoneCode] = useState(PHONE_CODES[0]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    const digits = phoneNumber.replace(/\D/g, "");
    if (digits.length < 6) {
      setError(t("auth.common.invalidPhone"));
      return;
    }

    const fullPhone = `${phoneCode.code}${digits}`;

    setLoading(true);
    try {
      const { data } = await api.post("/auth/request-password-reset", {
        phone: fullPhone,
      });
      // Backend always responds generically (no user-enumeration leak).
      // Move to step 2 regardless — the form there works whether or not
      // the phone has an account.
      setSent(true);
      // small delay so the success message reads, then move to code-entry page
      setTimeout(() => {
        nav("/reset-password", { state: { phone: fullPhone } });
      }, 1500);
    } catch (err) {
      // Only rate-limit (429) gets surfaced — everything else is generic
      if (err.response?.status === 429) {
        setError(err.response.data?.message || t("auth.forgot.rateLimited"));
      } else {
        // Don't reveal anything else — pretend it worked
        setSent(true);
        setTimeout(() => {
          nav("/reset-password", { state: { phone: fullPhone } });
        }, 1500);
      }
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="bg-surface min-h-[80vh] flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-white border border-border rounded-2xl p-6 shadow-card text-center">
            <div className="w-14 h-14 bg-green-100 text-green-700 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl">
              💬
            </div>
            <h1 className="text-xl font-extrabold mb-2">
              {t("auth.forgot.sentTitle", "Check WhatsApp")}
            </h1>
            <p className="text-sm text-text-muted">
              {t("auth.forgot.sentBody", "If an account exists with that phone, we've sent a 6-digit code on WhatsApp. It expires in 10 minutes.")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface min-h-[80vh] flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white border border-border rounded-2xl p-5 sm:p-7 shadow-card">
          <h1 className="text-2xl font-extrabold mb-1">
            {t("auth.forgot.title", "Forgot password?")}
          </h1>
          <p className="text-text-muted text-sm mb-5">
            {t("auth.forgot.subtitle", "Enter your phone — we'll send a one-time code to your WhatsApp so you can set a new password.")}
          </p>

          <form onSubmit={submit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold mb-1">
                {t("auth.common.phoneLabel", "Phone number")}
              </label>
              <div className="flex gap-2">
                <select
                  value={phoneCode.code}
                  onChange={(e) => setPhoneCode(PHONE_CODES.find(c => c.code === e.target.value) || PHONE_CODES[0])}
                  className="bg-white border border-border outline-none rounded-md px-2 py-2.5 text-sm font-mono"
                >
                  {PHONE_CODES.map(c => (
                    <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  placeholder={t("auth.common.phonePlaceholder", "50 123 4567")}
                  className="flex-1 bg-white border border-border focus:border-brand outline-none rounded-md px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            {error && (
              <div className="bg-danger-light text-danger text-xs px-3 py-2 rounded-md">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand text-white font-bold py-3 rounded-lg hover:bg-brand-dark transition shadow-gold disabled:opacity-50 text-sm"
            >
              {loading
                ? t("auth.forgot.sending", "Sending code…")
                : t("auth.forgot.sendCode", "Send reset code")}
            </button>

            <p className="text-[11px] text-text-muted text-center leading-relaxed pt-1">
              {t("auth.forgot.securityNote", "For your security: max 5 requests per hour, 5 wrong-code attempts before the code locks.")}
            </p>
          </form>
        </div>

        <div className="text-center text-sm text-text-muted mt-5 space-y-1">
          <p>
            {t("auth.forgot.haveCode", "Already have a code?")}{" "}
            <Link to="/reset-password" className="text-brand-dark font-semibold hover:underline">
              {t("auth.forgot.enterCode", "Enter it here")}
            </Link>
          </p>
          <p>
            {t("auth.forgot.remembered", "Remembered?")}{" "}
            <Link to="/login" className="text-brand-dark font-semibold hover:underline">
              {t("auth.forgot.login", "Log in")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}