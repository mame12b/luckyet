
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuthStore } from "../store/auth";

const STATUS_CONFIG = {
  pending_upload: { label: "Awaiting upload", class: "bg-warning-light text-warning" },
  awaiting_verification: { label: "Awaiting verification", class: "bg-warning-light text-warning" },
  verified: { label: "Verified", class: "bg-success-light text-success" },
  rejected: { label: "Rejected", class: "bg-danger-light text-danger" },
  expired: { label: "Expired", class: "bg-surface-2 text-text-muted" },
  refunded: { label: "Refunded", class: "bg-surface-2 text-text-muted" },
};

export default function MyPayments() {
  const { user } = useAuthStore();
  const nav = useNavigate();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) { nav("/login?redirect=/my-payments"); return; }

    api.get("/payments/mine")
      .then(({ data }) => setPayments(data.payments))
      .catch((err) => setError(err.response?.data?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [user, nav]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <header className="mb-8">
        <div className="text-xs font-medium text-brand uppercase tracking-wide mb-2">Your account</div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">My payments</h1>
        <p className="text-text-muted">All your purchase history and verification status.</p>
      </header>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-surface border border-border rounded-lg animate-pulse"></div>)}
        </div>
      )}

      {error && <div className="bg-danger-light text-danger px-4 py-3 rounded-md text-sm">{error}</div>}

      {!loading && payments.length === 0 && (
        <div className="bg-surface border border-border rounded-xl p-10 text-center">
          <h3 className="font-semibold mb-1">No payments yet</h3>
          <p className="text-text-muted text-sm mb-4">Your purchase history will appear here.</p>
          <Link to="/draws" className="inline-block bg-brand text-white font-medium px-4 py-2 rounded-md hover:bg-brand-dark transition text-sm">
            Browse active draws
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {payments.map((p) => {
          const status = STATUS_CONFIG[p.status] || { label: p.status, class: "bg-surface-2 text-text-muted" };
          return (
            <div key={p._id} className="bg-white border border-border rounded-lg p-4 hover:border-border-strong transition">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-medium">{p.referenceCode}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.class}`}>{status.label}</span>
                  </div>
                  <div className="text-sm text-text-muted">
                    {p.drawId?.prizeName} · {p.quantity} {p.quantity === 1 ? "ticket" : "tickets"} · {p.paymentMethod.replace(/_/g, " ")}
                  </div>
                  {p.status === "rejected" && p.rejectionReason && (
                    <div className="text-xs text-danger mt-1">Reason: {p.rejectionReason}</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm">{p.totalETB.toLocaleString()} ETB</div>
                  {p.displayCurrency && p.displayCurrency !== "ETB" && (
                    <div className="text-xs text-text-muted">≈ {p.displayAmount} {p.displayCurrency}</div>
                  )}
                  <div className="text-xs text-text-faint mt-1">{new Date(p.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
              {p.status === "pending_upload" && (
                <div className="mt-3 pt-3 border-t border-border">
                  <Link
                    to={`/draws/${p.drawId?.slug}/buy`}
                    className="text-xs text-brand font-medium hover:underline"
                  >
                    Complete this payment →
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
