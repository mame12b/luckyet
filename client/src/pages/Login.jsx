import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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

export default function Login() {
  const nav = useNavigate();
  const [search] = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [phoneCode, setPhoneCode] = useState(PHONE_CODES[0]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(null);
  const [lockedUntil, setLockedUntil] = useState(null);

  const pinRefs = useRef([]);

  // Handle PIN input — auto-advance on type, auto-backspace
  const onPinChange = (idx, val) => {
    const digit = val.replace(/\D/g, "").slice(-1); // take last digit only
    if (!digit) return;
    const next = [...pin];
    next[idx] = digit;
    setPin(next);
    if (idx < 5) pinRefs.current[idx + 1]?.focus();
  };

  const onPinKeyDown = (idx, e) => {
    if (e.key === "Backspace") {
      if (pin[idx]) {
        // Clear current
        const next = [...pin];
        next[idx] = "";
        setPin(next);
      } else if (idx > 0) {
        // Move to previous and clear it
        pinRefs.current[idx - 1]?.focus();
        const next = [...pin];
        next[idx - 1] = "";
        setPin(next);
      }
    } else if (e.key === "ArrowLeft" && idx > 0) {
      pinRefs.current[idx - 1]?.focus();
    } else if (e.key === "ArrowRight" && idx < 5) {
      pinRefs.current[idx + 1]?.focus();
    }
  };

  const onPinPaste = (e) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 6) {
      e.preventDefault();
      setPin(text.split(""));
      pinRefs.current[5]?.focus();
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const digits = phoneNumber.replace(/\D/g, "");
    if (digits.length < 6) { setError("Enter a valid phone number"); return; }
    const pinValue = pin.join("");
    if (pinValue.length !== 6) { setError("Enter your 6-digit PIN"); return; }

    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", {
        phone: `${phoneCode.code}${digits}`,
        pin: pinValue,
      });
      setAuth(data.user, data.accessToken);
      const redirect = search.get("redirect") || "/dashboard";
      nav(redirect);
    } catch (err) {
      const resp = err.response?.data;
      setError(resp?.message || "Login failed");
      if (resp?.remainingAttempts !== undefined) setRemainingAttempts(resp.remainingAttempts);
      if (resp?.lockedUntil) setLockedUntil(new Date(resp.lockedUntil));
      // Clear PIN inputs on failure
      setPin(["", "", "", "", "", ""]);
      pinRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface min-h-[80vh] flex items-start justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        <div className="bg-white border border-border rounded-2xl p-5 sm:p-7 shadow-card">
          <h1 className="text-2xl font-extrabold tracking-tight mb-1">Welcome back</h1>
          <p className="text-text-muted text-sm mb-5">Log in with your phone and PIN</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Phone number</label>
              <div className="flex gap-2">
                <select
                  value={phoneCode.code}
                  onChange={(e) => setPhoneCode(PHONE_CODES.find(c => c.code === e.target.value) || PHONE_CODES[0])}
                  className="bg-white border border-border focus:border-brand outline-none rounded-md px-2 py-2.5 text-sm font-mono w-28"
                >
                  {PHONE_CODES.map(c => (
                    <option key={c.country} value={c.code}>{c.flag} {c.code}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  placeholder="50 123 4567"
                  className="flex-1 bg-white border border-border focus:border-brand focus:ring-2 focus:ring-brand/10 outline-none rounded-md px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2">6-digit PIN</label>
              <div className="flex gap-2 justify-between">
                {pin.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (pinRefs.current[idx] = el)}
                    type="password"
                    inputMode="numeric"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => onPinChange(idx, e.target.value)}
                    onKeyDown={(e) => onPinKeyDown(idx, e)}
                    onPaste={idx === 0 ? onPinPaste : undefined}
                    className="w-12 h-14 text-center text-2xl font-bold bg-white border-2 border-border focus:border-brand focus:ring-2 focus:ring-brand/10 outline-none rounded-lg"
                    autoComplete="one-time-code"
                  />
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-danger-light text-danger text-xs px-3 py-2 rounded-md">
                {error}
                {remainingAttempts !== null && remainingAttempts <= 2 && remainingAttempts > 0 && (
                  <div className="mt-1 font-semibold">⚠️ {remainingAttempts} attempt{remainingAttempts === 1 ? "" : "s"} remaining before account is locked</div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || pin.join("").length !== 6}
              className="w-full bg-brand text-white font-bold py-3 rounded-lg hover:bg-brand-dark transition shadow-gold disabled:opacity-50 text-sm"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-text-muted mt-5">
          New to LuckyET? <Link to="/register" className="text-brand-dark font-semibold hover:underline">Create account</Link>
        </p>
      </div>
    </div>
  );
}
