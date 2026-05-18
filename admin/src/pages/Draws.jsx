import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";

const STATUS_CONFIG = {
  draft: { label: "Draft", class: "bg-surface-2 text-text-muted" },
  active: { label: "Active", class: "bg-success-light text-success" },
  sold_out: { label: "Sold out", class: "bg-warning-light text-warning" },
  closed: { label: "Closed", class: "bg-brand-light text-brand" },
  drawn: { label: "Drawn", class: "bg-brand-light text-brand" },
  cancelled: { label: "Cancelled", class: "bg-danger-light text-danger" },
};

const FILTERS = ["all", "draft", "active", "sold_out", "closed", "drawn", "cancelled"];

export default function Draws() {
  const [draws, setDraws] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    setLoading(true);
    const params = filter === "all" ? {} : { params: { status: filter } };
    api.get("/admin/draws", params)
      .then(({ data }) => setDraws(data.draws))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div>
      <header className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Draws</h1>
          <p className="text-sm text-text-muted">Manage lottery draws and their lifecycle.</p>
        </div>
        <Link
          to="/draws/new"
          className="text-sm bg-brand text-white font-medium px-4 py-2 rounded-md hover:bg-brand-dark transition"
        >
          + New draw
        </Link>
      </header>

      <div className="flex flex-wrap gap-2 mb-5">
        {FILTERS.map((s) => (
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

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-white border border-border rounded-lg animate-pulse"></div>)}
        </div>
      )}

      {!loading && draws.length === 0 && (
        <div className="bg-white border border-border rounded-xl p-12 text-center">
          <div className="w-12 h-12 bg-brand-light rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-brand text-xl">★</span>
          </div>
          <h3 className="font-semibold mb-1">No draws yet</h3>
          <p className="text-text-muted text-sm mb-4">Create your first draw to start selling tickets.</p>
          <Link to="/draws/new" className="inline-block bg-brand text-white font-medium px-4 py-2 rounded-md hover:bg-brand-dark transition text-sm">
            Create new draw
          </Link>
        </div>
      )}

      <div className="space-y-2">
        {draws.map((d) => {
          const status = STATUS_CONFIG[d.status] || { label: d.status, class: "bg-surface-2" };
          const percent = d.ticketPoolSize > 0 ? (d.ticketsSold / d.ticketPoolSize) * 100 : 0;
          return (
            <Link
              key={d._id}
              to={`/draws/${d._id}`}
              className="block bg-white border border-border rounded-lg p-4 hover:border-brand hover:shadow-soft transition"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-mono text-text-muted">{d.slug}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.class}`}>{status.label}</span>
                  </div>
                  <div className="font-semibold mb-1">{d.prizeName}</div>
                  <div className="text-xs text-text-muted">{d.title}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{d.ticketPriceETB.toLocaleString()} ETB</div>
                  <div className="text-xs text-text-muted">{d.ticketsSold} / {d.ticketPoolSize} sold</div>
                </div>
              </div>
              <div className="mt-3">
                <div className="w-full h-1 bg-surface-2 rounded-full overflow-hidden">
                  <div className="h-full bg-brand rounded-full" style={{ width: `${percent}%` }}></div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}