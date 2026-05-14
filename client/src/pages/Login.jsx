
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuthStore } from "../store/auth";

export default function Login() {
  const nav = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ emailOrPhone: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", form);
      setAuth(data.user, data.accessToken);
      nav("/draws");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-12 bg-surface">
      <div className="w-full max-w-md bg-white border border-border rounded-xl p-8 shadow-card">
        <h1 className="text-2xl font-bold tracking-tight mb-2">Welcome back</h1>
        <p className="text-text-muted text-sm mb-6">Sign in to continue to LuckyET</p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text mb-1.5">Email or phone</label>
            <input
              type="text"
              value={form.emailOrPhone}
              onChange={(e) => setForm({ ...form, emailOrPhone: e.target.value })}
              required
              className="w-full bg-white border border-border focus:border-brand focus:ring-2 focus:ring-brand/10 outline-none rounded-md px-3.5 py-2.5 text-sm transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text mb-1.5">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              className="w-full bg-white border border-border focus:border-brand focus:ring-2 focus:ring-brand/10 outline-none rounded-md px-3.5 py-2.5 text-sm transition"
            />
          </div>

          {error && (
            <div className="bg-danger-light text-danger text-xs px-3 py-2 rounded-md">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand text-white font-medium py-2.5 rounded-md hover:bg-brand-dark transition disabled:opacity-50 text-sm"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-text-muted mt-6">
          New here?{" "}
          <Link to="/register" className="text-brand font-medium hover:underline">Create account</Link>
        </p>
      </div>
    </div>
  );
}
