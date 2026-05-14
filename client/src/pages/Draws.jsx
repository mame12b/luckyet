
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";

export default function Draws() {
  const [draws, setDraws] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/draws")
      .then(({ data }) => setDraws(data.draws))
      .catch((err) => setError(err.response?.data?.message || "Failed to load draws"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
      <header className="mb-10">
        <div className="text-xs font-medium text-brand uppercase tracking-wide mb-2">Browse</div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">Active draws</h1>
        <p className="text-text-muted">Pick a draw and grab your ticket before it sells out.</p>
      </header>

      {loading && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface border border-border rounded-xl p-6 h-72 animate-pulse"></div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-danger-light text-danger px-4 py-3 rounded-md text-sm">{error}</div>
      )}

      {!loading && draws.length === 0 && (
        <div className="bg-surface border border-border rounded-xl p-12 text-center">
          <div className="w-12 h-12 bg-brand-light rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-brand text-xl">✦</span>
          </div>
          <h3 className="font-semibold mb-1">No active draws right now</h3>
          <p className="text-text-muted text-sm">Check back soon — new draws launch regularly.</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {draws.map((d) => (
          <article key={d._id} className="bg-white border border-border rounded-xl overflow-hidden hover:border-border-strong hover:shadow-card transition">
            {d.prizeImages?.[0] ? (
              <div className="h-44 bg-surface-2">
                <img src={d.prizeImages[0]} alt={d.prizeName} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="h-44 bg-gradient-to-br from-brand-light to-surface flex items-center justify-center">
                <span className="text-brand text-4xl">★</span>
              </div>
            )}
            <div className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-text-muted">{d.title}</span>
                <span className="inline-flex items-center gap-1 text-xs text-success bg-success-light px-2 py-0.5 rounded-full font-medium">
                  <span className="w-1 h-1 bg-success rounded-full"></span>
                  Active
                </span>
              </div>
              <h3 className="text-lg font-semibold mb-3 leading-tight">{d.prizeName}</h3>

              <div className="space-y-3 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Ticket price</span>
                  <span className="font-medium">{d.ticketPriceETB} ETB</span>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-text-muted mb-1.5">
                    <span>{d.ticketsSold} sold</span>
                    <span>{d.ticketPoolSize - d.ticketsSold} remaining</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
                    <div className="h-full bg-brand rounded-full" style={{ width: `${(d.ticketsSold / d.ticketPoolSize) * 100}%` }}></div>
                  </div>
                </div>
              </div>

              <Link to={`/draws/${d.slug}`} className="block w-full bg-brand text-white text-center font-medium py-2.5 rounded-md hover:bg-brand-dark transition text-sm">
                Buy a ticket
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
