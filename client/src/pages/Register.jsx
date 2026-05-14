
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuthStore } from "../store/auth";

const COUNTRIES = [
  { code: "AE", name: "United Arab Emirates" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "KW", name: "Kuwait" },
  { code: "QA", name: "Qatar" },
  { code: "BH", name: "Bahrain" },
  { code: "OM", name: "Oman" },
  { code: "ET", name: "Ethiopia" },
  { code: "OTHER", name: "Other" },
];

export default function Register() {
  const nav = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({
    fullName: "", email: "", phone: "", password: "",
    country: "AE", language: "en", referredByCode: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = { ...form };
      if (!payload.referredByCode) delete payload.referredByCode;
      const { data } = await api.post("/auth/register", payload);
      setAuth(data.user, data.accessToken);
      nav("/draws");
    } catch (err) {
      setError(
        err.response?.data?.errors?.[0]?.message ||
        err.response?.data?.message ||
        "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const onChange = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-12 bg-surface">
      <div className="w-full max-w-md bg-white border border-border rounded-xl p-8 shadow-card">
        <h1 className="text-2xl font-bold tracking-tight mb-2">Create account</h1>
        <p className="text-text-muted text-sm mb-6">Join LuckyET in under a minute</p>

        <form onSubmit={submit} className="space-y-4">
          <Field label="Full name" value={form.fullName} onChange={onChange("fullName")} required />
          <Field label="Email" type="email" value={form.email} onChange={onChange("email")} required />
          <Field label="Phone (with country code)" placeholder="+971501234567" value={form.phone} onChange={onChange("phone")} required />
          <Field label="Password" type="password" hint="8+ characters with upper, lower, and number" value={form.password} onChange={onChange("password")} required />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text mb-1.5">Country</label>
              <select
                value={form.country}
                onChange={onChange("country")}
                className="w-full bg-white border border-border focus:border-brand focus:ring-2 focus:ring-brand/10 outline-none rounded-md px-3 py-2.5 text-sm"
              >
                {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text mb-1.5">Language</label>
              <select
                value={form.language}
                onChange={onChange("language")}
                className="w-full bg-white border border-border focus:border-brand focus:ring-2 focus:ring-brand/10 outline-none rounded-md px-3 py-2.5 text-sm"
              >
                <option value="en">English</option>
                <option value="am">አማርኛ</option>
                <option value="ti">ትግርኛ</option>
              </select>
            </div>
          </div>

          <Field
            label="Promo code (optional)"
            placeholder="HABESHA10"
            value={form.referredByCode}
            onChange={(e) => setForm({ ...form, referredByCode: e.target.value.toUpperCase() })}
          />

          {error && (
            <div className="bg-danger-light text-danger text-xs px-3 py-2 rounded-md">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand text-white font-medium py-2.5 rounded-md hover:bg-brand-dark transition disabled:opacity-50 text-sm"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>

          <p className="text-xs text-text-faint text-center">
            By creating an account, you confirm you are 18+ and accept our Terms.
          </p>
        </form>

        <p className="text-center text-sm text-text-muted mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-brand font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, hint, ...props }) {
  return (
    <div>
      <label className="block text-xs font-medium text-text mb-1.5">{label}</label>
      <input
        {...props}
        className="w-full bg-white border border-border focus:border-brand focus:ring-2 focus:ring-brand/10 outline-none rounded-md px-3.5 py-2.5 text-sm transition"
      />
      {hint && <p className="text-[11px] text-text-faint mt-1">{hint}</p>}
    </div>
  );
}
