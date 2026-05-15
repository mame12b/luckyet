

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuthStore } from "../store/auth";

const STATUS_CONFIG = {
  active: { label: "Active", class: "bg-success-light text-success" },
  won: { label: "Won 🎉", class: "bg-warning-light text-warning" },
  lost: { label: "Lost", class: "bg-surface-2 text-text-muted" },
  voided: { label: "Voided", class: "bg-danger-light text-danger" },
};

export default function MyTickets() {
  const { user } = useAuthStore();
  const nav = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) { nav("/login?redirect=/my-tickets"); return; }
    api.get("/users/me/tickets")
      .then(({ data }) => setTickets(data.tickets))
      .catch((err) => setError(err.response?.data?.message || "Failed to load tickets"))
      .finally(() => setLoading(false));
  }, [user, nav]);

  // Group tickets by draw for nicer display
  const grouped = tickets.reduce((acc, t) => {
    const drawId = t.drawId?._id || "unknown";
    if (!acc[drawId]) {
      acc[drawId] = {
        draw: t.drawId,
        tickets: [],
      };
    }
    acc[drawId].tickets.push(t);
    return acc;
  }, {});

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <header className="mb-8">
        <div className="text-xs font-medium text-brand uppercase tracking-wide mb-2">Your account</div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">My tickets</h1>
        <p className="text-text-muted">All your tickets and their quantum-verified numbers.</p>
      </header>

      {loading && (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-32 bg-surface border border-border rounded-lg animate-pulse"></div>)}
        </div>
      )}

      {error && <div className="bg-danger-light text-danger px-4 py-3 rounded-md text-sm">{error}</div>}

      {!loading && tickets.length === 0 && (
        <div className="bg-surface border border-border rounded-xl p-10 text-center">
          <div className="w-12 h-12 bg-brand-light rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-brand text-xl">✦</span>
          </div>
          <h3 className="font-semibold mb-1">No tickets yet</h3>
          <p className="text-text-muted text-sm mb-4">Buy your first ticket to get started.</p>
          <Link to="/draws" className="inline-block bg-brand text-white font-medium px-4 py-2 rounded-md hover:bg-brand-dark transition text-sm">
            Browse active draws
          </Link>
        </div>
      )}

      <div className="space-y-6">
        {Object.values(grouped).map(({ draw, tickets: drawTickets }) => (
          <div key={draw?._id || "unknown"} className="bg-white border border-border rounded-xl overflow-hidden">
            {/* Draw header */}
            <div className="bg-surface border-b border-border px-5 py-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs text-text-muted mb-0.5">{draw?.title || "Unknown draw"}</div>
                <div className="font-semibold">{draw?.prizeName || "—"}</div>
              </div>
              <div className="text-right text-xs text-text-muted">
                <div>{drawTickets.length} {drawTickets.length === 1 ? "ticket" : "tickets"} in this draw</div>
                {draw?.drawDate && (
                  <div>Draw: {new Date(draw.drawDate).toLocaleDateString()}</div>
                )}
              </div>
            </div>

            {/* Ticket grid */}
            <div className="p-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {drawTickets.map((t) => {
                const status = STATUS_CONFIG[t.status] || STATUS_CONFIG.active;
                return (
                  <div key={t._id} className="border border-border rounded-lg p-4 hover:border-brand transition">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-[10px] text-text-muted uppercase tracking-wider">Ticket No.</div>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${status.class}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="font-mono text-lg font-bold tracking-wider mb-2 break-all">
                      {t.ticketNumber}
                    </div>
                    <div className="text-[10px] text-text-faint flex items-center gap-1">
                      <span className="w-1 h-1 bg-brand rounded-full"></span>
                      Quantum-verified
                    </div>
                    <div className="mt-2 pt-2 border-t border-border text-[10px] text-text-faint">
                      Issued {new Date(t.issuedAt || t.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
