import { useEffect, useState } from "react";
import api from "../lib/api";

const STATUS_CONFIG = {
  pending_upload: { label: "Awaiting upload", class: "bg-warning-light text-warning" },
  awaiting_verification: { label: "Awaiting verification", class: "bg-warning-light text-warning" },
  verified: { label: "Verified", class: "bg-success-light text-success" },
  rejected: { label: "Rejected", class: "bg-danger-light text-danger" },
  expired: { label: "Expired", class: "bg-surface-2 text-text-muted" },
  refunded: { label: "Refunded", class: "bg-surface-2 text-text-muted" },
};

const STATUSES = ["all", "awaiting_verification", "verified", "rejected", "pending_upload", "expired"];

export default function AllPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    setLoading(true);
    const params = filter === "all" ? {} : { params: { status: filter } };
    api.get("/admin/payments", params)
      .then(({ data }) => setPayments(data.payments))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight mb-1">All payments</h1>
        <p className="text-sm text-text-muted">Filter and browse the full payment history.</p>
      </header>

      <div className="flex flex-wrap gap-2 mb-5">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
              filter === s
                ? "bg-brand text-white border-brand"
                : "bg-white text-text-muted border-border hover:border-border-strong"
            }`}
          >
            {s === "all" ? "All" : STATUS_CONFIG[s]?.label || s}
          </button>
        ))}
      </div>

      <div className="bg-white border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-text-muted text-sm">Loading...</div>
        ) : payments.length === 0 ? (
          <div className="p-10 text-center text-text-muted text-sm">No payments matching this filter.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface border-b border-border text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th className="text-left px-5 py-3 font-medium">Reference</th>
                <th className="text-left px-5 py-3 font-medium">Player</th>
                <th className="text-left px-5 py-3 font-medium">Draw</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-right px-5 py-3 font-medium">Amount</th>
                <th className="text-right px-5 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.map((p) => {
                const status = STATUS_CONFIG[p.status] || { label: p.status, class: "bg-surface-2 text-text-muted" };
                return (
                  <tr key={p._id} className="hover:bg-surface">
                    <td className="px-5 py-3 font-mono text-xs">{p.referenceCode}</td>
                    <td className="px-5 py-3">{p.userId?.fullName || "—"}</td>
                    <td className="px-5 py-3 truncate max-w-[200px]">{p.drawId?.prizeName || "—"}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.class}`}>{status.label}</span>
                    </td>
                    <td className="px-5 py-3 text-right font-medium">{p.totalETB.toLocaleString()} ETB</td>
                    <td className="px-5 py-3 text-right text-xs text-text-muted">{new Date(p.createdAt).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}