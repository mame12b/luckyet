
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
};

export default function Dashboard() {
  const { user } = useAuthStore();
  const nav = useNavigate();
  const [payments, setPayments] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { nav("/login?redirect=/dashboard"); return; }

    Promise.all([
      api.get("/payments/mine"),
      api.get("/users/me/tickets"),
    ])
      .then(([pRes, tRes]) => {
        setPayments(pRes.data.payments);
        setTickets(tRes.data.tickets);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, nav]);

  const verifiedPayments = payments.filter((p) => p.status === "verified");
  const pending = payments.filter((p) =>
    ["pending_upload", "awaiting_verification"].includes(p.status)
  );
  const totalSpent = verifiedPayments.reduce((sum, p) => sum + p.totalETB, 0);
  const activeTickets = tickets.filter((t) => t.status === "active");

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="h-32 bg-surface border border-border rounded-xl animate-pulse mb-6"></div>
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-surface border border-border rounded-xl animate-pulse"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Welcome */}
      <div className="mb-8">
        <div className="text-xs font-medium text-brand uppercase tracking-wide mb-2">Dashboard</div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-1">
          Welcome back, {user?.fullName?.split(" ")[0]}
        </h1>
        <p className="text-text-muted">Here's a quick view of your LuckyET activity.</p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Active tickets" value={activeTickets.length} hint="Quantum-verified entries" accent="brand" />
        <StatCard label="Pending payments" value={pending.length} hint="Need your action or verification" accent="warning" />
        <StatCard label="Total spent" value={`${totalSpent.toLocaleString()} ETB`} hint={`${verifiedPayments.length} verified payments`} accent="text" />
      </div>

      {/* Pending payments */}
      {pending.length > 0 && (
        <Section
          title="Needs your attention"
          subtitle={`${pending.length} ${pending.length === 1 ? "payment is" : "payments are"} waiting`}
        >
          <div className="space-y-3">
            {pending.map((p) => {
              const status = STATUS_CONFIG[p.status];
              return (
                <div key={p._id} className="bg-white border border-border rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-medium">{p.referenceCode}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.class}`}>{status.label}</span>
                    </div>
                    <div className="text-sm text-text-muted">
                      {p.drawId?.prizeName} · {p.quantity} {p.quantity === 1 ? "ticket" : "tickets"} · {p.totalETB.toLocaleString()} ETB
                    </div>
                  </div>
                  {p.status === "pending_upload" && p.drawId?.slug && (
                    <Link to={`/draws/${p.drawId.slug}/buy`} className="text-xs font-medium bg-brand text-white px-3 py-1.5 rounded-md hover:bg-brand-dark transition">
                      Complete payment →
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Active tickets — NOW SHOWING NUMBERS */}
      <Section
        title="Your active tickets"
        subtitle={activeTickets.length === 0 ? "Buy your first ticket to get started" : `${activeTickets.length} ${activeTickets.length === 1 ? "ticket" : "tickets"} ready for the draw`}
        action={
          activeTickets.length > 3 && (
            <Link to="/my-tickets" className="text-sm text-brand font-medium hover:underline">
              View all →
            </Link>
          )
        }
      >
        {activeTickets.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl p-10 text-center">
            <div className="w-12 h-12 bg-brand-light rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-brand text-xl">✦</span>
            </div>
            <h3 className="font-semibold mb-1">No active tickets yet</h3>
            <p className="text-text-muted text-sm mb-4">Browse active draws and buy your first ticket.</p>
            <Link to="/draws" className="inline-block bg-brand text-white font-medium px-4 py-2 rounded-md hover:bg-brand-dark transition text-sm">
              Browse active draws
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeTickets.slice(0, 6).map((t) => (
              <div key={t._id} className="bg-white border border-border rounded-lg p-4 hover:border-brand transition">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-text-muted uppercase tracking-wider">Ticket No.</span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-success-light text-success">Active</span>
                </div>
                <div className="font-mono text-lg font-bold tracking-wider mb-2 break-all">{t.ticketNumber}</div>
                <div className="text-xs text-text-muted truncate">{t.drawId?.prizeName}</div>
                <div className="text-[10px] text-text-faint mt-2 flex items-center gap-1">
                  <span className="w-1 h-1 bg-brand rounded-full"></span>
                  Quantum-verified
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Recent payments */}
      <Section
        title="Recent payments"
        action={
          <Link to="/my-payments" className="text-sm text-brand font-medium hover:underline">
            View all →
          </Link>
        }
      >
        {payments.length === 0 ? (
          <p className="text-text-muted text-sm bg-surface border border-border rounded-lg p-6 text-center">
            No payment history yet.
          </p>
        ) : (
          <div className="space-y-2">
            {payments.slice(0, 5).map((p) => {
              const status = STATUS_CONFIG[p.status] || { label: p.status, class: "bg-surface-2 text-text-muted" };
              return (
                <div key={p._id} className="bg-white border border-border rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs font-medium text-text-muted">{p.referenceCode}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.class}`}>{status.label}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{p.totalETB.toLocaleString()} ETB</div>
                    <div className="text-xs text-text-faint">{new Date(p.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

function StatCard({ label, value, hint, accent }) {
  const accentClass = {
    brand: "border-brand/30 bg-brand-light",
    warning: "border-warning/30 bg-warning-light",
    text: "border-border bg-surface",
  }[accent];

  return (
    <div className={`border rounded-xl p-5 ${accentClass}`}>
      <div className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">{label}</div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-xs text-text-muted">{hint}</div>
    </div>
  );
}

function Section({ title, subtitle, action, children }) {
  return (
    <section className="mb-8">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {subtitle && <p className="text-sm text-text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
