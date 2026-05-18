
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
    <div className="bg-surface min-h-[60vh]">
      <div className="max-w-7xl mx-auto px-6 py-10 md:py-14">
        <header className="mb-8 text-center">
          <div className="text-xs font-bold text-burgundy uppercase tracking-widest mb-2">Lotteries</div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2">Active Draws</h1>
          <p className="text-text-muted">Good luck! 🍀 Pick a draw and grab your ticket before it sells out.</p>
        </header>

        {loading && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-border rounded-xl h-96 animate-pulse"></div>
            ))}
          </div>
        )}

        {error && <div className="bg-danger-light text-danger px-4 py-3 rounded-md text-sm">{error}</div>}

        {!loading && draws.length === 0 && (
          <div className="bg-white border border-border rounded-xl p-12 text-center max-w-md mx-auto">
            <div className="text-5xl mb-4">🎰</div>
            <h3 className="font-bold text-lg mb-1">No active draws right now</h3>
            <p className="text-text-muted text-sm">Check back soon — new draws launch regularly.</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {draws.map((d) => {
            const percent = (d.ticketsSold / d.ticketPoolSize) * 100;
            return (
              <article key={d._id} className="group bg-white border border-border rounded-xl overflow-hidden hover:border-brand hover:shadow-card transition">
                {/* Prize image */}
                <div className="h-48 bg-gradient-to-br from-amber-50 to-burgundy-light relative overflow-hidden">
                  {d.prizeImages?.[0] ? (
                    <img src={d.prizeImages[0]} alt={d.prizeName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-7xl opacity-30">
                      🎁
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center gap-1 text-xs text-success bg-white/90 backdrop-blur px-2.5 py-1 rounded-full font-semibold shadow-soft">
                      <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse"></span>
                      Active
                    </span>
                  </div>
                </div>

                <div className="p-5">
                  <div className="text-xs text-burgundy font-semibold mb-1">{d.title}</div>
                  <h3 className="text-lg font-bold mb-3 leading-tight">{d.prizeName}</h3>

                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-text-muted mb-1.5">
                      <span>{d.ticketsSold.toLocaleString()} sold</span>
                      <span className="font-semibold">{(d.ticketPoolSize - d.ticketsSold).toLocaleString()} left</span>
                    </div>
                    <div className="w-full h-2 bg-surface-2 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-brand to-brand-dark rounded-full" style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>

                  <div className="flex items-end justify-between mb-4">
                    <div>
                      <div className="text-xs text-text-muted">Ticket price</div>
                      <div className="text-xl font-extrabold text-burgundy">{d.ticketPriceETB.toLocaleString()} <span className="text-xs font-normal text-text-muted">ETB</span></div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-text-muted">Closes</div>
                      <div className="text-sm font-bold">{new Date(d.endDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
                    </div>
                  </div>

                  <Link to={`/draws/${d.slug}`} className="block w-full bg-brand text-white text-center font-bold py-3 rounded-lg hover:bg-brand-dark transition shadow-gold text-sm">
                    Buy a ticket →
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
