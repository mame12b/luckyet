import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuthStore } from "../store/auth";

// Phone codes for our target markets (GCC + Ethiopia + Eritrea)
// `country` is the ISO code we infer and send to the backend
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
  const nav = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [phoneCode, setPhoneCode] = useState(PHONE_CODES[0]); // default UAE
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",       // just the digits after the code
    password: "",
    promoCode: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate phone: just digits, 6-12 long
    const digits = form.phoneNumber.replace(/\D/g, "");
    if (digits.length < 6 || digits.length > 12) {
      setError("Phone number should be 6 to 12 digits, no spaces.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", {
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: `${phoneCode.code}${digits}`,        // full E.164
        password: form.password,
        country: phoneCode.country,                  // inferred from phone code
        language: "en",                              // default; user changes globally later
        promoCode: form.promoCode.trim().toUpperCase() || undefined,
      });
      setAuth(data.user, data.accessToken);
      nav("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface min-h-[80vh] flex items-start justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        <div className="bg-white border border-border rounded-2xl p-5 sm:p-7 shadow-card">
          <h1 className="text-2xl font-extrabold tracking-tight mb-1">Create account</h1>
          <p className="text-text-muted text-sm mb-5">Join LuckyET in under a minute</p>

          <form onSubmit={submit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold mb-1">Full name</label>
              <input
                type="text"
                value={form.fullName}
                onChange={update("fullName")}
                required
                minLength="2"
                placeholder="Asrat Belay"
                className="w-full bg-white border border-border focus:border-brand focus:ring-2 focus:ring-brand/10 outline-none rounded-md px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={update("email")}
                required
                placeholder="you@example.com"
                className="w-full bg-white border border-border focus:border-brand focus:ring-2 focus:ring-brand/10 outline-none rounded-md px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Phone number</label>
              <div className="flex gap-2">
                {/* Country code selector */}
                <select
                  value={phoneCode.code}
                  onChange={(e) => setPhoneCode(PHONE_CODES.find(c => c.code === e.target.value) || PHONE_CODES[0])}
                  className="bg-white border border-border focus:border-brand outline-none rounded-md px-2 py-2.5 text-sm font-mono w-28"
                >
                  {PHONE_CODES.map(c => (
                    <option key={c.country} value={c.code}>{c.flag} {c.code}</option>
                  ))}
                </select>
                {/* Digits */}
                <input
                  type="tel"
                  inputMode="numeric"
                  value={form.phoneNumber}
                  onChange={update("phoneNumber")}
                  required
                  placeholder="50 123 4567"
                  className="flex-1 bg-white border border-border focus:border-brand focus:ring-2 focus:ring-brand/10 outline-none rounded-md px-3 py-2.5 text-sm"
                />
              </div>
              <p className="text-[10px] text-text-faint mt-1">Selected: {phoneCode.flag} {phoneCode.label}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={update("password")}
                required
                minLength="8"
                placeholder="At least 8 characters"
                className="w-full bg-white border border-border focus:border-brand focus:ring-2 focus:ring-brand/10 outline-none rounded-md px-3 py-2.5 text-sm"
              />
              <p className="text-[10px] text-text-faint mt-1">Use upper, lower & a number</p>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Promo code <span className="text-text-faint font-normal">(optional)</span></label>
              <input
                type="text"
                value={form.promoCode}
                onChange={update("promoCode")}
                placeholder="HABESHA10"
                className="w-full bg-white border border-border focus:border-brand outline-none rounded-md px-3 py-2.5 text-sm font-mono uppercase"
              />
            </div>

            {error && <div className="bg-danger-light text-danger text-xs px-3 py-2 rounded-md">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand text-white font-bold py-3 rounded-lg hover:bg-brand-dark transition shadow-gold disabled:opacity-50 text-sm"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>

            <p className="text-[11px] text-text-faint text-center pt-1 leading-relaxed">
              By creating an account, you confirm you are 18+ and accept our Terms.
            </p>
          </form>
        </div>

        <p className="text-center text-sm text-text-muted mt-5">
          Already have an account? <Link to="/login" className="text-brand-dark font-semibold hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
