import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuthStore, isAdmin } from "../store/auth";

const PHONE_CODES = [
  { code: "+971", flag: "🇦🇪" },
  { code: "+966", flag: "🇸🇦" },
  { code: "+251", flag: "🇪🇹" },
  { code: "+1",   flag: "🇺🇸" },
];

export default function Login() {
  const nav = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [phoneCode, setPhoneCode] = useState(PHONE_CODES[0]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const pinRefs = useRef([]);

  const onPinChange = (idx, val) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    if (!digit) return;
    const next = [...pin];
    next[idx] = digit;
    setPin(next);
    if (idx < 5) pinRefs.current[idx + 1]?.focus();
  };

  const onPinKeyDown = (idx, e) => {
    if (e.key === "Backspace") {
      if (pin[idx]) {
        const next = [...pin];
        next[idx] = "";
        setPin(next);
      } else if (idx > 0) {
        pinRefs.current[idx - 1]?.focus();
        const next = [...pin];
        next[idx - 1] = "";
        setPin(next);
      }
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const digits = phoneNumber.replace(/\D/g, "");
    const pinValue = pin.join("");

    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", {
        phone: `${phoneCode.code}${digits}`,
        pin: pinValue,
      });
      if (!isAdmin(data.user)) {
        setError("This account does not have admin access.");
        return;
      }
      setAuth(data.user, data.accessToken);
      nav("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
      setPin(["", "", "", "", "", ""]);
      pinRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-surface">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 font-semibold text-lg tracking-tight mb-1">
            <div className="w-8 h-8 bg-brand rounded-md flex items-center justify-center text-white font-bold">L</div>
            <span>LuckyET</span>
          </div>
          <div className="text-xs text-text-muted uppercase tracking-wide">Admin Console</div>
        </div>

        <div className="bg-white border border-border rounded-xl p-6 shadow-card">
          <h1 className="text-xl font-bold mb-1">Sign in</h1>
          <p className="text-text-muted text-sm mb-5">Admin and super admin only</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5">Phone</label>
              <div className="flex gap-2">
                <select
                  value={phoneCode.code}
                  onChange={(e) => setPhoneCode(PHONE_CODES.find(c => c.code === e.target.value) || PHONE_CODES[0])}
                  className="bg-white border border-border focus:border-brand outline-none rounded-md px-2 py-2.5 text-sm font-mono"
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
                  placeholder="500000000"
                  className="flex-1 bg-white border border-border focus:border-brand outline-none rounded-md px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2">Password (6 digits)</label>
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
                    className="w-11 h-12 text-center text-xl font-bold bg-white border-2 border-border focus:border-brand outline-none rounded-md"
                    autoComplete="one-time-code"
                  />
                ))}
              </div>
            </div>

            {error && <div className="bg-danger-light text-danger text-xs px-3 py-2 rounded-md">{error}</div>}

            <button
              type="submit"
              disabled={loading || pin.join("").length !== 6}
              className="w-full bg-brand text-white font-medium py-2.5 rounded-md hover:bg-brand-dark transition disabled:opacity-50 text-sm"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-text-faint mt-6">
          Restricted area. All actions are logged.
        </p>
      </div>
    </div>
  );
}
