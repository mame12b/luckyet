
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";

const MEDALS = { 1: "🥇", 2: "🥈", 3: "🥉", 4: "🎁", 5: "🎁" };

export default function Results() {
  const [draws, setDraws] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/draws/results")
      .then(({ data }) => setDraws(data.draws || []))
      .catch((err) => setError(err.response?.data?.message || "Failed to load results"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-surface min-h-[80vh]">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-14">
        <header className="mb-10 text-center">
          <div className="text-xs font-bold text-burgundy uppercase tracking-widest mb-2">Results</div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2">Past Draws & Winners</h1>
          <p className="text-text-muted">Every result is quantum-verified. Click any draw to see the math.</p>
        </header>

        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-44 bg-white border border-border rounded-xl animate-pulse"></div>)}
          </div>
        )}

        {error && <div className="bg-danger-light text-danger px-4 py-3 rounded-md text-sm">{error}</div>}

        {!loading && !error && draws.length === 0 && (
          <div className="bg-white border border-border rounded-xl p-12 text-center max-w-md mx-auto">
            <div className="text-5xl mb-4">🏆</div>
            <h3 className="font-bold text-lg mb-1">No completed draws yet</h3>
            <p className="text-text-muted text-sm">The first winners will appear here after our launch draw.</p>
          </div>
        )}

        <div className="space-y-4">
          {draws.map((d) => {
            const winners = Array.isArray(d.winners) ? [...d.winners].sort((a, b) => a.tier - b.tier) : [];
            const prizes = Array.isArray(d.prizes) ? [...d.prizes].sort((a, b) => a.tier - b.tier) : [];
            return (
              <Link
                key={d._id}
                to={`/results/${d.slug}`}
                className="block bg-white border border-border rounded-xl p-5 hover:border-brand hover:shadow-card transition group"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                  <div>
                    <div className="text-xs text-burgundy font-semibold mb-1">{d.title}</div>
                    <h3 className="text-lg font-bold">
                      {prizes[0]?.name || "Draw"}
                      {winners.length > 1 && (
                        <span className="ml-2 text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full align-middle">
                          {winners.length} winners
                        </span>
                      )}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-burgundy">
                    <span>⚛️ Verified</span>
                    <span className="group-hover:underline">View proof →</span>
                  </div>
                </div>

                {/* Winners row */}
                {winners.length === 0 ? (
                  <div className="text-sm text-text-muted">Winner data unavailable.</div>
                ) : (
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {winners.map((w) => {
                      const prize = prizes.find((p) => p.tier === w.tier);
                      return (
                        <div key={w.tier} className="bg-surface border border-border rounded-lg p-3 flex items-center gap-3">
                          <div className="text-2xl">{MEDALS[w.tier] || "🎁"}</div>
                          <div className="min-w-0">
                            <div className="text-[10px] text-text-muted uppercase tracking-wide truncate">{prize?.name || `Tier ${w.tier}`}</div>
                            <div className="font-semibold text-sm truncate">{w.displayName || "—"}</div>
                            <div className="font-mono text-xs text-text-faint">{w.ticketNumber}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
