import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";

export default function Dashboard() {
  const [pending, setPending] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [draws, setDraws] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/admin/payments/pending"),
      api.get("/admin/payments"),
      api.get("/admin/draws"),
    ])
      .then(([pRes, aRes, dRes]) => {
        setPending(pRes.data.payments);
        setAllPayments(aRes.data.payments);
        setDraws(dRes.data.draws);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Stats
  const verifiedToday = allPayments.filter((p) => {
    if (p.status !== "verified") return false;
    const today = new Date();
    const v = new Date(p.verifiedAt);
    return v.toDateString() === today.toDateString();
  });
  const revenueToday = verifiedToday.reduce((sum, p) => sum + p.totalETB, 0);
  const totalRevenue = allPayments
    .filter((p) => p.status === "verified")
    .reduce((sum, p) => sum + p.totalETB, 0);
  const activeDraws = draws.filter((d) => d.status === "active");

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-20 bg-white border border-border rounded-xl animate-pulse"></div>
        <div className="grid md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-white border border-border rounded-xl animate-pulse"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Overview</h1>
        <p className="text-sm text-text-muted">Quick operational snapshot.</p>
      </header>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <Stat label="Pending payments" value={pending.length} accent={pending.length > 0 ? "warning" : "neutral"} hint={pending.length > 0 ? "Action required" : "All clear"} />
        <Stat label="Verified today" value={verifiedToday.length} accent="success" hint={`${revenueToday.toLocaleString()} ETB`} />
        <Stat label="Total revenue" value={`${totalRevenue.toLocaleString()} ETB`} accent="brand" hint={`${allPayments.filter((p) => p.status === "verified").length} verified payments`} />
        <Stat label="Active draws" value={activeDraws.length} accent="neutral" hint={`${draws.length} total`} />
      </div>

      {/* Pending payments preview */}
      <section className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Pending verifications</h2>
            <p className="text-xs text-text-muted">Payments waiting for your review.</p>
          </div>
          {pending.length > 0 && (
            <Link to="/payments/pending" className="text-sm text-brand font-medium hover:underline">
              View all {pending.length} →
            </Link>
          )}
        </div>

        {pending.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <div className="text-success text-2xl mb-2">✓</div>
            <p className="text-sm font-medium">All caught up</p>
            <p className="text-xs text-text-muted">No payments awaiting verification.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {pending.slice(0, 5).map((p) => (
              <Link
                key={p._id}
                to="/payments/pending"
                className="flex items-center justify-between px-5 py-3 hover:bg-surface transition"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-sm font-medium">{p.referenceCode}</span>
                    <span className="text-xs text-text-muted">{p.userId?.fullName}</span>
                  </div>
                  <div className="text-xs text-text-muted truncate">
                    {p.drawId?.prizeName} · {p.quantity} {p.quantity === 1 ? "ticket" : "tickets"} · {p.paymentMethod.replace(/_/g, " ")}
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-sm font-semibold">{p.totalETB.toLocaleString()} ETB</div>
                  <div className="text-xs text-text-faint">{new Date(p.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, accent, hint }) {
  const accentClass = {
    brand: "border-brand/30 bg-brand-light",
    warning: "border-warning/30 bg-warning-light",
    success: "border-success/30 bg-success-light",
    neutral: "border-border bg-white",
  }[accent];

  return (
    <div className={`border rounded-xl p-4 ${accentClass}`}>
      <div className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">{label}</div>
      <div className="text-xl font-bold mb-1">{value}</div>
      <div className="text-xs text-text-muted">{hint}</div>
    </div>
  );
}