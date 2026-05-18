import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../lib/api";

const STATUS_CONFIG = {
  draft: { label: "Draft", class: "bg-surface-2 text-text-muted" },
  active: { label: "Active", class: "bg-success-light text-success" },
  sold_out: { label: "Sold out", class: "bg-warning-light text-warning" },
  closed: { label: "Closed", class: "bg-brand-light text-brand" },
  drawing: { label: "Broadcasting", class: "bg-amber-100 text-amber-800" },
  drawn: { label: "Drawn", class: "bg-brand-light text-brand" },
  cancelled: { label: "Cancelled", class: "bg-danger-light text-danger" },
};

const TRANSITIONS = {
  draft: ["active", "cancelled"],
  active: ["closed", "cancelled"],
  sold_out: ["closed"],
  closed: [],
  drawing: [],
  drawn: [],
  cancelled: [],
};

// Build the player-app URL from the current admin URL (swaps port 5174 → 5173 in dev)
const playerUrl = (path = "") => {
  const env = import.meta.env.VITE_PLAYER_URL;
  if (env) return `${env}${path}`;
  return `${window.location.origin.replace(/:\d+$/, ":5173")}${path}`;
};

export default function DrawEdit() {
  const { id } = useParams();
  const [draw, setDraw] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");
  const [actioning, setActioning] = useState(false);
  const [error, setError] = useState("");
  const [showRunDrawModal, setShowRunDrawModal] = useState(false);
  const [drawResult, setDrawResult] = useState(null);
  const [copied, setCopied] = useState(false);

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

  useEffect(() => {
    load();
  }, [id]);

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

  const runDraw = async () => {
    setActioning(true);
    setError("");
    try {
      const { data } = await api.post(`/admin/draws/${id}/start-broadcast`);
      setDrawResult(data);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Draw failed. Check ANU quantum service status.");
      setShowRunDrawModal(false);
    } finally {
      setActioning(false);
    }
  };

  const copyLiveUrl = () => {
    if (!drawResult?.liveUrl) return;
    navigator.clipboard.writeText(playerUrl(drawResult.liveUrl));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <div className="h-64 bg-white border border-border rounded-xl animate-pulse"></div>;
  }

  if (!draw) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold mb-2">Draw not found</h2>
        <Link to="/draws" className="text-brand hover:underline text-sm">
          ← Back to draws
        </Link>
      </div>
    );
  }

  const status = STATUS_CONFIG[draw.status] || { label: draw.status, class: "bg-surface-2 text-text-muted" };
  const allowedTransitions = TRANSITIONS[draw.status] || [];
  const percent = draw.ticketPoolSize > 0 ? (draw.ticketsSold / draw.ticketPoolSize) * 100 : 0;
  const canRunDraw = (draw.status === "closed" || draw.status === "sold_out") && draw.ticketsSold > 0;
  const isBroadcasting = draw.status === "drawing";
  const isDrawn = draw.status === "drawn";

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

          <div className="flex flex-wrap gap-2">
            {allowedTransitions.map((s) => {
              const variant =
                s === "active"
                  ? "bg-success text-white hover:bg-emerald-700"
                  : s === "cancelled"
                  ? "bg-danger text-white hover:bg-red-700"
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

            {canRunDraw && (
              <button
                onClick={() => setShowRunDrawModal(true)}
                className="text-sm font-bold px-4 py-1.5 rounded-md bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 transition shadow-md"
              >
                📡 Start broadcast
              </button>
            )}

            {isBroadcasting && (
              
             <a href={playerUrl(`/draws/${draw.slug}/live`)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-bold px-4 py-1.5 rounded-md text-white transition shadow-md inline-flex items-center gap-2"
                style={{ backgroundColor: "#8b1e3f" }}
              >
                <span className="w-1.5 h-1.5 bg-amber-300 rounded-full animate-pulse"></span>
                View live broadcast
              </a>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div className="bg-danger-light text-danger text-sm px-4 py-3 rounded-md mb-4">{error}</div>
      )}

      {/* Quantum draw banner if drawn */}
      {isDrawn && draw.quantumProof && (
        <div className="bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-300 rounded-xl p-5 mb-6">
          <div className="flex items-start gap-4">
            <div className="text-3xl">🏆</div>
            <div className="flex-1">
              <div className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Winner selected</div>
              <div className="font-bold text-lg mb-1">
                Ticket <span className="font-mono">{draw.winnerTicketId?.ticketNumber || "—"}</span>
              </div>
              <div className="text-sm text-text-muted mb-2">
                Won by {draw.winnerUserId?.fullName || "—"} · {draw.winnerUserId?.country}
              </div>
              <div className="text-xs text-text-muted">
                Drawn {new Date(draw.quantumProof.drawnAt).toLocaleString()} · Index {draw.quantumProof.selectedIndex} of{" "}
                {draw.quantumProof.totalTicketsAtDraw} tickets
              </div>
              
              <a href={playerUrl(`/results/${draw.slug}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 text-xs font-semibold text-amber-800 hover:underline"
              >
                View public proof page →
              </a>
            </div>
          </div>
        </div>
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
                activeTab === t.id ? "border-brand text-brand" : "border-transparent text-text-muted hover:text-text"
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
                <span className="font-semibold">
                  {draw.ticketsSold.toLocaleString()} / {draw.ticketPoolSize.toLocaleString()}
                </span>
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
            <div className="p-10 text-center text-text-muted text-sm">No tickets issued yet.</div>
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
                {tickets.map((t) => {
                  const isWinner = t.status === "won";
                  return (
                    <tr key={t._id} className={`hover:bg-surface ${isWinner ? "bg-amber-50" : ""}`}>
                      <td className="px-5 py-3 font-mono text-sm font-semibold">
                        {isWinner && "🏆 "}
                        {t.ticketNumber}
                      </td>
                      <td className="px-5 py-3">{t.userId?.fullName || "—"}</td>
                      <td className="px-5 py-3 text-xs text-text-muted">{t.userId?.country || "—"}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            t.status === "won"
                              ? "bg-amber-200 text-amber-900"
                              : t.status === "active"
                              ? "bg-success-light text-success"
                              : "bg-surface-2 text-text-muted"
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-xs text-text-muted">
                        {new Date(t.issuedAt || t.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Run Draw Modal */}
      {showRunDrawModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-border rounded-xl max-w-md w-full overflow-hidden shadow-card">
            {!drawResult ? (
              <>
                <div className="p-6">
                  <div className="text-4xl mb-3">📡</div>
                  <h2 className="text-xl font-bold mb-2">Start live broadcast?</h2>
                  <p className="text-sm text-text-muted mb-4">Clicking start will:</p>
                  <ul className="text-sm text-text-muted space-y-1.5 list-disc list-inside mb-4">
                    <li>Fetch true randomness from ANU Quantum Lab</li>
                    <li>
                      Select one winner out of <strong className="text-text">{draw.ticketsSold.toLocaleString()}</strong> tickets
                    </li>
                    <li>
                      Begin a 20-second public animation at{" "}
                      <code className="text-xs bg-surface px-1.5 py-0.5 rounded font-mono">/draws/{draw.slug}/live</code>
                    </li>
                    <li>Publish the verifiable proof when the animation ends</li>
                  </ul>
                  <div className="bg-brand-light border border-brand/30 rounded-md p-3 text-xs text-brand-dark mb-3">
                    <strong>💡 Tip for streamers:</strong> Open the live URL on your streaming device <em>before</em> clicking start,
                    so your audience sees the animation in real time.
                  </div>
                  <div className="bg-warning-light border border-warning/30 rounded-md p-3 text-xs text-warning">
                    <strong>⚠ This is irreversible.</strong> Once started, the winner is locked and the draw cannot be re-run.
                  </div>
                </div>
                <div className="px-6 py-4 bg-surface border-t border-border flex justify-end gap-2">
                  <button
                    onClick={() => setShowRunDrawModal(false)}
                    disabled={actioning}
                    className="text-sm px-4 py-2 text-text-muted hover:text-text rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={runDraw}
                    disabled={actioning}
                    className="text-sm font-bold px-5 py-2 rounded-md bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 transition disabled:opacity-50"
                  >
                    {actioning ? "Starting…" : "📡 Start broadcast"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="p-6 bg-gradient-to-br from-amber-50 to-amber-100">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="text-4xl">📡</div>
                    <div>
                      <h2 className="text-xl font-bold mb-1">Broadcast is live</h2>
                      <p className="text-xs text-text-muted">
                        The 20-second animation is now playing publicly. Share the URL with your streamer.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 space-y-3 mb-4 border border-amber-200">
                    <div>
                      <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Live broadcast URL</div>
                      <div className="font-mono text-xs bg-surface border border-border p-2 rounded break-all select-all">
                        {playerUrl(drawResult.liveUrl)}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                      <div>
                        <div className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Duration</div>
                        <div className="text-sm font-semibold">{drawResult.durationMs / 1000} seconds</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Started</div>
                        <div className="text-sm font-semibold">{new Date(drawResult.startedAt).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mb-3">
                    
                 <a href={playerUrl(drawResult.liveUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center text-sm font-bold text-white px-4 py-2.5 rounded-md hover:opacity-90 transition"
                      style={{ backgroundColor: "#8b1e3f" }}
                    >
                      Open broadcast →
                    </a>
                    <button
                      onClick={copyLiveUrl}
                      className="text-sm font-medium bg-white border border-border px-4 py-2.5 rounded-md hover:bg-surface transition min-w-[90px]"
                    >
                      {copied ? "✓ Copied" : "📋 Copy"}
                    </button>
                  </div>

                  <div className="text-xs text-text-muted bg-amber-50 border border-amber-300 rounded p-2.5">
                    📋 Once the animation ends, notify the winner via SMS/email to begin KYC and prize delivery.
                  </div>
                </div>
                <div className="px-6 py-4 bg-surface border-t border-border flex justify-end">
                  <button
                    onClick={() => {
                      setShowRunDrawModal(false);
                      setDrawResult(null);
                    }}
                    className="text-sm font-bold bg-brand text-white px-5 py-2 rounded-md hover:bg-brand-dark transition"
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
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