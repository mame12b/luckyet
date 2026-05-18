
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";

export default function Results() {
  const [draws, setDraws] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/draws/results")
      .then(({ data }) => setDraws(data.draws))
      .catch((err) => setError(err.response?.data?.message || "Failed to load results"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-surface min-h-[80vh]">
      <div className="max-w-6xl mx-auto px-6 py-10 md:py-14">
        <header className="mb-10 text-center">
          <div className="text-xs font-bold text-burgundy uppercase tracking-widest mb-2">Results</div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2">Past Draws & Winners</h1>
          <p className="text-text-muted">Every result is quantum-verified. Click any draw to see the math.</p>
        </header>

        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-40 bg-white border border-border rounded-xl animate-pulse"></div>)}
          </div>
        )}

        {error && <div className="bg-danger-light text-danger px-4 py-3 rounded-md text-sm">{error}</div>}

        {!loading && draws.length === 0 && (
          <div className="bg-white border border-border rounded-xl p-12 text-center max-w-md mx-auto">
            <div className="text-5xl mb-4">🏆</div>
            <h3 className="font-bold text-lg mb-1">No completed draws yet</h3>
            <p className="text-text-muted text-sm">The first winners will appear here after our launch draw.</p>
          </div>
        )}

        <div className="space-y-4">
          {draws.map((d) => (
            <Link
              key={d._id}
              to={`/results/${d.slug}`}
              className="block bg-white border border-border rounded-xl overflow-hidden hover:border-brand hover:shadow-card transition group"
            >
              <div className="grid md:grid-cols-[200px_1fr_auto] gap-0">
                {/* Prize image */}
                <div className="h-40 md:h-auto bg-gradient-to-br from-amber-50 to-burgundy-light flex items-center justify-center text-6xl">
                  {d.prizeImages?.[0] ? (
                    <img src={d.prizeImages[0]} alt={d.prizeName} className="w-full h-full object-cover" />
                  ) : "🎁"}
                </div>

                {/* Info */}
                <div className="p-5">
                  <div className="text-xs text-burgundy font-semibold mb-1">{d.title}</div>
                  <h3 className="text-xl font-bold mb-3">{d.prizeName}</h3>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-text-muted">Winner</div>
                      <div className="font-semibold">{d.winnerUserId?.displayName || "—"}</div>
                      <div className="text-xs text-text-faint">{d.winnerUserId?.country}</div>
                    </div>
                    <div>
                      <div className="text-xs text-text-muted">Winning ticket</div>
                      <div className="font-mono font-semibold">{d.winnerTicketId?.ticketNumber}</div>
                    </div>
                    <div>
                      <div className="text-xs text-text-muted">Drawn</div>
                      <div className="font-semibold">{new Date(d.quantumProof?.drawnAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</div>
                      <div className="text-xs text-text-faint">{d.quantumProof?.totalTicketsAtDraw.toLocaleString()} tickets</div>
                    </div>
                  </div>
                </div>

                {/* Verify CTA */}
                <div className="flex md:flex-col items-center justify-center p-5 bg-surface border-t md:border-t-0 md:border-l border-border min-w-[120px]">
                  <span className="text-xs font-semibold text-burgundy uppercase tracking-wide mb-1">Verified</span>
                  <span className="text-2xl">⚛️</span>
                  <span className="text-xs text-brand-dark font-semibold mt-1 group-hover:underline">View proof →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
