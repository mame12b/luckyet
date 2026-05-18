import { useEffect, useState } from "react";
import api from "../lib/api";
import { useAuthStore } from "../store/auth";

export default function Settings() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "super_admin";

  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/settings")
      .then(({ data }) => setSettings(data.settings))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateField = (path, value) => {
    setSettings((prev) => {
      const next = { ...prev };
      const keys = path.split(".");
      let cur = next;
      for (let i = 0; i < keys.length - 1; i++) {
        cur[keys[i]] = { ...cur[keys[i]] };
        cur = cur[keys[i]];
      }
      cur[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const updateAccount = (idx, field, value) => {
    setSettings((prev) => {
      const accounts = [...prev.paymentAccounts];
      accounts[idx] = { ...accounts[idx], [field]: value };
      return { ...prev, paymentAccounts: accounts };
    });
  };

  const save = async (sectionPayload, successMsg) => {
    if (!isSuperAdmin) return;
    setSaving(true);
    setError("");
    setSavedMsg("");
    try {
      const { data } = await api.patch("/settings", sectionPayload);
      setSettings(data.settings);
      setSavedMsg(successMsg);
      setTimeout(() => setSavedMsg(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-64 bg-white border border-border rounded-xl animate-pulse"></div>;
  if (!settings) return <div className="text-text-muted">Settings unavailable.</div>;

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Settings</h1>
        <p className="text-sm text-text-muted">
          {isSuperAdmin ? "Configure payment accounts, exchange rates, and platform behavior." : "Read-only view. Super admin access required to edit."}
        </p>
      </header>

      {savedMsg && (
        <div className="bg-success-light text-success text-sm px-4 py-2 rounded-md mb-4">{savedMsg}</div>
      )}
      {error && (
        <div className="bg-danger-light text-danger text-sm px-4 py-3 rounded-md mb-4">{error}</div>
      )}

      <div className="space-y-6">
        {/* Payment accounts */}
        <Card title="Payment accounts" subtitle="Where players send their transfers. Shown country-by-country.">
          <div className="space-y-4">
            {settings.paymentAccounts.map((acc, idx) => (
              <div key={acc._id || idx} className="border border-border rounded-md p-4 bg-surface">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div className="text-xs font-medium text-text-muted uppercase tracking-wide">{acc.method.replace(/_/g, " ")}</div>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={acc.isActive}
                      onChange={(e) => updateAccount(idx, "isActive", e.target.checked)}
                      disabled={!isSuperAdmin}
                      className="accent-brand"
                    />
                    Active
                  </label>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <Field label="Label" value={acc.label} onChange={(e) => updateAccount(idx, "label", e.target.value)} disabled={!isSuperAdmin} />
                  <Field label="Account name" value={acc.accountName} onChange={(e) => updateAccount(idx, "accountName", e.target.value)} disabled={!isSuperAdmin} />
                  <Field label="Account number" value={acc.accountNumber} onChange={(e) => updateAccount(idx, "accountNumber", e.target.value)} disabled={!isSuperAdmin} mono />
                  <Field label="Countries (comma-separated, blank = all)" value={(acc.forCountries || []).join(", ")} onChange={(e) => updateAccount(idx, "forCountries", e.target.value.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean))} disabled={!isSuperAdmin} />
                </div>
                <Textarea label="Instructions (optional)" value={acc.instructions || ""} onChange={(e) => updateAccount(idx, "instructions", e.target.value)} disabled={!isSuperAdmin} rows="2" />
              </div>
            ))}
          </div>
          {isSuperAdmin && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => save({ paymentAccounts: settings.paymentAccounts }, "Payment accounts saved")}
                disabled={saving}
                className="text-sm bg-brand text-white font-medium px-4 py-2 rounded-md hover:bg-brand-dark transition disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save payment accounts"}
              </button>
            </div>
          )}
        </Card>

        {/* Exchange rates */}
        <Card title="Exchange rates" subtitle={`ETB per 1 unit of foreign currency. Last updated: ${new Date(settings.exchangeRatesUpdatedAt).toLocaleString()}`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(settings.exchangeRates).map(([currency, rate]) => (
              <Field
                key={currency}
                label={`${currency} → ETB`}
                type="number"
                step="0.01"
                value={rate}
                onChange={(e) => updateField(`exchangeRates.${currency}`, Number(e.target.value))}
                disabled={!isSuperAdmin}
              />
            ))}
          </div>
          {isSuperAdmin && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => save({ exchangeRates: settings.exchangeRates }, "Exchange rates saved")}
                disabled={saving}
                className="text-sm bg-brand text-white font-medium px-4 py-2 rounded-md hover:bg-brand-dark transition disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save exchange rates"}
              </button>
            </div>
          )}
        </Card>

        {/* Platform config */}
        <Card title="Platform" subtitle="Operational defaults.">
          <div className="grid md:grid-cols-3 gap-4">
            <Field
              label="Default streamer commission (%)"
              type="number"
              min="0"
              max="30"
              value={settings.defaultStreamerCommissionPercent}
              onChange={(e) => updateField("defaultStreamerCommissionPercent", Number(e.target.value))}
              disabled={!isSuperAdmin}
            />
            <Field
              label="Payment expiry (hours)"
              type="number"
              min="1"
              max="168"
              value={settings.paymentExpiryHours}
              onChange={(e) => updateField("paymentExpiryHours", Number(e.target.value))}
              disabled={!isSuperAdmin}
            />
            <Field
              label="Max tickets per purchase"
              type="number"
              min="1"
              max="500"
              value={settings.maxTicketsPerPurchase}
              onChange={(e) => updateField("maxTicketsPerPurchase", Number(e.target.value))}
              disabled={!isSuperAdmin}
            />
          </div>
          <div className="grid md:grid-cols-3 gap-4 mt-4">
            <Field label="Support email" value={settings.supportEmail} onChange={(e) => updateField("supportEmail", e.target.value)} disabled={!isSuperAdmin} />
            <Field label="Support WhatsApp" value={settings.supportWhatsApp} onChange={(e) => updateField("supportWhatsApp", e.target.value)} disabled={!isSuperAdmin} />
            <Field label="Support Telegram" value={settings.supportTelegram} onChange={(e) => updateField("supportTelegram", e.target.value)} disabled={!isSuperAdmin} />
          </div>
          {isSuperAdmin && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => save({
                  defaultStreamerCommissionPercent: settings.defaultStreamerCommissionPercent,
                  paymentExpiryHours: settings.paymentExpiryHours,
                  maxTicketsPerPurchase: settings.maxTicketsPerPurchase,
                  supportEmail: settings.supportEmail,
                  supportWhatsApp: settings.supportWhatsApp,
                  supportTelegram: settings.supportTelegram,
                }, "Platform settings saved")}
                disabled={saving}
                className="text-sm bg-brand text-white font-medium px-4 py-2 rounded-md hover:bg-brand-dark transition disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save platform settings"}
              </button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Card({ title, subtitle, children }) {
  return (
    <section className="bg-white border border-border rounded-xl p-5">
      <div className="mb-4">
        <h2 className="font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, mono, ...props }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-text-muted mb-1">{label}</label>
      <input
        {...props}
        className={`w-full bg-white border border-border focus:border-brand focus:ring-2 focus:ring-brand/10 outline-none rounded-md px-3 py-2 text-sm ${mono ? "font-mono" : ""} disabled:bg-surface disabled:text-text-muted`}
      />
    </div>
  );
}

function Textarea({ label, ...props }) {
  return (
    <div className="mt-3">
      <label className="block text-[11px] font-medium text-text-muted mb-1">{label}</label>
      <textarea
        {...props}
        className="w-full bg-white border border-border focus:border-brand focus:ring-2 focus:ring-brand/10 outline-none rounded-md px-3 py-2 text-sm resize-none disabled:bg-surface disabled:text-text-muted"
      />
    </div>
  );
}