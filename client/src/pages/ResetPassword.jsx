import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

export default function ResetPassword() {
  const nav = useNavigate();
  const [phoneCode, setPhoneCode] = useState(PHONE_CODES[0]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const digits = phoneNumber.replace(/\D/g, "");
    if (digits.length < 6) { setError("Enter a valid phone number"); return; }
    if (!/^\d{6}$/.test(resetCode)) { setError("Reset code must be 6 digits"); return; }
    if (!/^\d{6}$/.test(newPin)) { setError("New password must be 6 digits"); return; }
    if (newPin !== confirmPin) { setError("Passwords don't match"); return; }

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
      setError(err.response?.data?.message || "Reset failed");
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
            <h1 className="text-xl font-extrabold mb-2">Password updated</h1>
            <p className="text-sm text-text-muted">Redirecting you to login...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface min-h-[80vh] flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white border border-border rounded-2xl p-5 sm:p-7 shadow-card">
          <h1 className="text-2xl font-extrabold mb-1">Set new password</h1>
          <p className="text-text-muted text-sm mb-5">
            Enter the 6-digit code we sent you, then choose your new password.
          </p>

          <form onSubmit={submit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold mb-1">Your phone number</label>
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
                  placeholder="50 123 4567"
                  className="flex-1 bg-white border border-border focus:border-brand outline-none rounded-md px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Reset code from support (6 digits)</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength="6"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                placeholder="123456"
                className="w-full bg-white border border-border focus:border-brand outline-none rounded-md px-3 py-3 text-xl font-mono tracking-[0.3em] text-center"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Choose new password (6 digits)</label>
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
              <label className="block text-xs font-semibold mb-1">Confirm new password</label>
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

            {error && <div className="bg-danger-light text-danger text-xs px-3 py-2 rounded-md">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand text-white font-bold py-3 rounded-lg hover:bg-brand-dark transition shadow-gold disabled:opacity-50 text-sm"
            >
              {loading ? "Updating..." : "Update password"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-text-muted mt-5">
          Need a code? <Link to="/forgot-password" className="text-brand-dark font-semibold hover:underline">Request a password reset</Link>
        </p>
      </div>
    </div>
  );
}
