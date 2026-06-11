import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
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

// Try to split a stored full phone like "+97150123456" back into code + number
function splitPhone(fullPhone) {
  if (!fullPhone) return null;
  const match = PHONE_CODES.find(c => fullPhone.startsWith(c.code));
  if (!match) return null;
  return { code: match, rest: fullPhone.slice(match.code.length) };
}

export default function ResetPassword() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const location = useLocation();

  // Prefill phone if we arrived from ForgotPassword (via location.state.phone)
  const prefilled = splitPhone(location.state?.phone);

  const [phoneCode, setPhoneCode] = useState(prefilled?.code || PHONE_CODES[0]);
  const [phoneNumber, setPhoneNumber] = useState(prefilled?.rest || "");
  const [resetCode, setResetCode] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [remainingAttempts, setRemainingAttempts] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const digits = phoneNumber.replace(/\D/g, "");
    if (digits.length < 6) { setError(t("auth.common.invalidPhone")); return; }
    if (!/^\d{6}$/.test(resetCode)) { setError(t("auth.reset.errorCode")); return; }
    if (!/^\d{6}$/.test(newPin)) { setError(t("auth.reset.errorNewPassword")); return; }
    if (newPin !== confirmPin) { setError(t("auth.reset.errorMismatch")); return; }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        phone: `${phoneCode.code}${digits}`,
        resetCode,
        newPin,
      });
      setSuccess(true);
      setTimeout(() => nav("/login"), 2500);
    } catch (err) {
      const data = err.response?.data || {};
      setError(data.message || t("auth.reset.resetFailed"));
      // Surface attempts-remaining if backend included it
      if (typeof data.remainingAttempts === "number") {
        setRemainingAttempts(data.remainingAttempts);
      }
      // If TOO_MANY_ATTEMPTS, suggest requesting a new code
      if (data.code === "TOO_MANY_ATTEMPTS") {
        setRemainingAttempts(0);
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-surface min-h-[80vh] flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-white border border-border rounded-2xl p-6 shadow-card text-center">
            <div className="w-14 h-14 bg-green-100 text-green-700 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl">✓</div>
            <h1 className="text-xl font-extrabold mb-2">{t("auth.reset.successTitle")}</h1>
            <p className="text-sm text-text-muted">{t("auth.reset.successBody")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface min-h-[80vh] flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white border border-border rounded-2xl p-5 sm:p-7 shadow-card">
          <h1 className="text-2xl font-extrabold mb-1">{t("auth.reset.title")}</h1>
          <p className="text-text-muted text-sm mb-5">
            {t("auth.reset.subtitle", "Enter the 6-digit code we sent to your WhatsApp and choose a new password.")}
          </p>

          <form onSubmit={submit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold mb-1">{t("auth.reset.phoneLabel")}</label>
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
                  placeholder={t("auth.common.phonePlaceholder")}
                  className="flex-1 bg-white border border-border focus:border-brand outline-none rounded-md px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">{t("auth.reset.codeLabel")}</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength="6"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                placeholder={t("auth.reset.codePlaceholder")}
                className="w-full bg-white border border-border focus:border-brand outline-none rounded-md px-3 py-3 text-xl font-mono tracking-[0.3em] text-center"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">{t("auth.reset.newPasswordLabel")}</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength="6"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                placeholder="● ● ● ● ● ●"
                className="w-full bg-white border border-border focus:border-brand outline-none rounded-md px-3 py-3 text-xl tracking-[0.3em] text-center font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">{t("auth.reset.confirmPasswordLabel")}</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength="6"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                placeholder="● ● ● ● ● ●"
                className="w-full bg-white border border-border focus:border-brand outline-none rounded-md px-3 py-3 text-xl tracking-[0.3em] text-center font-mono"
              />
            </div>

            {error && (
              <div className="bg-danger-light text-danger text-xs px-3 py-2 rounded-md">
                {error}
                {remainingAttempts === 0 && (
                  <div className="mt-2">
                    <Link to="/forgot-password" className="text-brand-dark font-bold underline">
                      {t("auth.reset.requestNewCode", "Request a new code")} →
                    </Link>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand text-white font-bold py-3 rounded-lg hover:bg-brand-dark transition shadow-gold disabled:opacity-50 text-sm"
            >
              {loading ? t("auth.reset.updating") : t("auth.reset.updateButton")}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-text-muted mt-5">
          {t("auth.reset.needCodeQuestion")}{" "}
          <Link to="/forgot-password" className="text-brand-dark font-semibold hover:underline">
            {t("auth.reset.requestReset")}
          </Link>
        </p>
      </div>
    </div>
  );
}