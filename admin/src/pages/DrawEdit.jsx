import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../lib/api";

const STATUS_CONFIG = {
  draft: { label: "Draft", class: "bg-surface-2 text-text-muted" },
  active: { label: "Active", class: "bg-success-light text-success" },
  sold_out: { label: "Sold out", class: "bg-warning-light text-warning" },
  closed: { label: "Closed", class: "bg-brand-light text-brand" },
  drawn: { label: "Drawn", class: "bg-brand-light text-brand" },
  cancelled: { label: "Cancelled", class: "bg-danger-light text-danger" },
};

// Allowed status transitions (mirror backend)
const TRANSITIONS = {
  draft: ["active", "cancelled"],
  active: ["closed", "cancelled"],
  sold_out: ["closed"],
  closed: [],
  drawn: [],
  cancelled: [],
};

export default function DrawEdit() {
  const { id } = useParams();
  const nav = useNavigate();
  const [draw, setDraw] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");
  const [actioning, setActioning] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    Promise.all([
      api.get(`/admin/draws`).then((r) => r.data.draws.find((x) => x._id === id)),
      api.get(`/admin/draws/${id}/tickets`).catch(() => ({ data: { tickets: [] } })),
    ])
      .then(([d, t]) => {
        setDraw(d);
        setTickets(t.data?.tickets || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const changeStatus = async (newStatus) => {
    if (!confirm(`Change status to "${newStatus}"?`)) return;
    setActioning(true);
    setError("");
    try {
      await api.patch(`/admin/draws/${id}/status`, { status: newStatus });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to change status");
    } finally {
      setActioning(false);
    }
  };

  if (loading) {
    return <div className="h-64 bg-white border border-border rounded-xl animate-pulse"></div>;
  }

  if (!draw) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold mb-2">Draw not found</h2>
        <Link to="/draws" className="text-brand hover:underline text-sm">← Back to draws</Link>
      </div>
    );
  }

  const status = STATUS_CONFIG[draw.status];
  const allowedTransitions = TRANSITIONS[draw.status] || [];
  const percent = draw.ticketPoolSize > 0 ? (draw.ticketsSold / draw.ticketPoolSize) * 100 : 0;

  return (
    <div>
      <header className="mb-6">
        <Link to="/draws" className="text-sm text-text-muted hover:text-text mb-2 inline-flex items-center gap-1">
          ← Draws
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-text-muted">{draw.slug}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.class}`}>{status.label}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-1">{draw.prizeName}</h1>
            <p className="text-sm text-text-muted">{draw.title}</p>
          </div>

          {/* Status actions */}
          {allowedTransitions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {allowedTransitions.map((s) => {
                const variant = s === "active" ? "bg-success text-white hover:bg-emerald-700"
                  : s === "cancelled" ? "bg-danger text-white hover:bg-red-700"
                  : "bg-brand text-white hover:bg-brand-dark";
                return (
                  <button
                    key={s}
                    onClick={() => changeStatus(s)}
                    disabled={actioning}
                    className={`text-sm font-medium px-3 py-1.5 rounded-md transition disabled:opacity-50 ${variant}`}
                  >
                    {s === "active" ? "▶ Activate" : s === "closed" ? "■ Close" : s === "cancelled" ? "✕ Cancel" : `→ ${s}`}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </header>

      {error && (
        <div className="bg-danger-light text-danger text-sm px-4 py-3 rounded-md mb-4">{error}</div>
      )}

      {/* Tabs */}
      <div className="border-b border-border mb-6">
        <div className="flex gap-1">
          {[
            { id: "details", label: "Details" },
            { id: "tickets", label: `Tickets (${tickets.length})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`text-sm font-medium px-4 py-2.5 border-b-2 transition ${
                activeTab === t.id
                  ? "border-brand text-brand"
                  : "border-transparent text-text-muted hover:text-text"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Details tab */}
      {activeTab === "details" && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white border border-border rounded-xl p-5">
              <h3 className="font-semibold mb-3 text-sm">Sales progress</h3>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-text-muted">Sold</span>
                <span className="font-semibold">{draw.ticketsSold.toLocaleString()} / {draw.ticketPoolSize.toLocaleString()}</span>
              </div>
              <div className="w-full h-2 bg-surface-2 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-brand rounded-full" style={{ width: `${percent}%` }}></div>
              </div>
              <div className="text-xs text-text-muted">
                {percent.toFixed(1)}% sold · {(draw.ticketPoolSize - draw.ticketsSold).toLocaleString()} remaining
              </div>
              <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-text-muted mb-0.5">Revenue collected</div>
                  <div className="font-semibold">{(draw.ticketsSold * draw.ticketPriceETB).toLocaleString()} ETB</div>
                </div>
                <div>
                  <div className="text-xs text-text-muted mb-0.5">Max revenue</div>
                  <div className="font-semibold">{(draw.ticketPoolSize * draw.ticketPriceETB).toLocaleString()} ETB</div>
                </div>
              </div>
            </div>

            {draw.description && (
              <div className="bg-white border border-border rounded-xl p-5">
                <h3 className="font-semibold mb-2 text-sm">Description</h3>
                <p className="text-sm text-text-muted leading-relaxed">{draw.description}</p>
              </div>
            )}

            {draw.prizeDescription && (
              <div className="bg-white border border-border rounded-xl p-5">
                <h3 className="font-semibold mb-2 text-sm">Prize details</h3>
                <p className="text-sm text-text-muted leading-relaxed">{draw.prizeDescription}</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-border rounded-xl p-5">
              <h3 className="font-semibold mb-3 text-sm">Schedule</h3>
              <div className="space-y-2 text-sm">
                <Row label="Starts" value={new Date(draw.startDate).toLocaleString()} />
                <Row label="Ends" value={new Date(draw.endDate).toLocaleString()} />
                {draw.drawDate && <Row label="Draw" value={new Date(draw.drawDate).toLocaleString()} />}
              </div>
            </div>
            <div className="bg-white border border-border rounded-xl p-5">
              <h3 className="font-semibold mb-3 text-sm">Pricing</h3>
              <div className="space-y-2 text-sm">
                <Row label="Ticket price" value={`${draw.ticketPriceETB.toLocaleString()} ETB`} />
                <Row label="Prize value" value={`${draw.prizeEstimatedValueETB.toLocaleString()} ETB`} />
                <Row label="Pool size" value={draw.ticketPoolSize.toLocaleString()} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tickets tab */}
      {activeTab === "tickets" && (
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          {tickets.length === 0 ? (
            <div className="p-10 text-center text-text-muted text-sm">
              No tickets issued yet. Tickets appear here after admin verifies payments.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-surface border-b border-border text-xs uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Ticket No.</th>
                  <th className="text-left px-5 py-3 font-medium">Owner</th>
                  <th className="text-left px-5 py-3 font-medium">Country</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-right px-5 py-3 font-medium">Issued</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tickets.map((t) => (
                  <tr key={t._id} className="hover:bg-surface">
                    <td className="px-5 py-3 font-mono text-sm font-semibold">{t.ticketNumber}</td>
                    <td className="px-5 py-3">{t.userId?.fullName || "—"}</td>
                    <td className="px-5 py-3 text-xs text-text-muted">{t.userId?.country || "—"}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs bg-success-light text-success font-medium px-2 py-0.5 rounded-full">
                        {t.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-text-muted">
                      {new Date(t.issuedAt || t.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-text-muted text-xs">{label}</span>
      <span className="font-medium text-right text-xs">{value}</span>
    </div>
  );
}