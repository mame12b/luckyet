import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuthStore, isAdmin } from "../store/auth";

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
      if (!isAdmin(data.user)) {
        setError("This account does not have admin access.");
        return;
      }
      setAuth(data.user, data.accessToken);
      nav("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-surface">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 font-semibold text-lg tracking-tight mb-1">
            <div className="w-8 h-8 bg-brand rounded-md flex items-center justify-center text-white text-base font-bold">L</div>
            <span>LuckyET</span>
          </div>
          <div className="text-xs text-text-muted uppercase tracking-wide">Admin console</div>
        </div>

        <div className="bg-white border border-border rounded-xl p-7 shadow-card">
          <h1 className="text-xl font-bold tracking-tight mb-1">Sign in</h1>
          <p className="text-text-muted text-sm mb-5">Admin and super admin only.</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5">Email or phone</label>
              <input
                type="text"
                value={form.emailOrPhone}
                onChange={(e) => setForm({ ...form, emailOrPhone: e.target.value })}
                required
                className="w-full bg-white border border-border focus:border-brand focus:ring-2 focus:ring-brand/10 outline-none rounded-md px-3.5 py-2.5 text-sm transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">Password</label>
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
        </div>

        <p className="text-center text-xs text-text-faint mt-6">
          Restricted area. All actions are logged.
        </p>
      </div>
    </div>
  );
}