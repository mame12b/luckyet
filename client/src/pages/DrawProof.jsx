
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../lib/api";

const TIER_META = {
  1: { label: "Grand Prize", medal: "🥇" },
  2: { label: "2nd Prize", medal: "🥈" },
  3: { label: "3rd Prize", medal: "🥉" },
  4: { label: "4th Prize", medal: "🎁" },
  5: { label: "5th Prize", medal: "🎁" },
};

export default function DrawProof() {
  const { slug } = useParams();
  const [draw, setDraw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/draws/results/${slug}`)
      .then(({ data }) => setDraw(data.draw))
      .catch((err) => setError(err.response?.data?.message || "Failed to load result"))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="h-96 bg-surface border border-border rounded-xl animate-pulse"></div>
      </div>
    );
  }

  if (error || !draw) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h1 className="text-2xl font-bold mb-2">Result not found</h1>
        <p className="text-text-muted mb-6">{error || "This draw result doesn't exist."}</p>
        <Link to="/results" className="text-brand-dark font-semibold hover:underline">← Back to results</Link>
      </div>
    );
  }

  // Normalize — backend may send winners[] (new) or legacy single-winner shape
  const winners = Array.isArray(draw.winners) ? [...draw.winners].sort((a, b) => a.tier - b.tier) : [];
  const prizes = Array.isArray(draw.prizes) ? [...draw.prizes].sort((a, b) => a.tier - b.tier) : [];

  return (
    <div className="bg-surface min-h-[80vh]">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-10">
        <Link to="/results" className="text-sm text-text-muted hover:text-burgundy mb-6 inline-flex items-center gap-1 font-semibold">
          ← All results
        </Link>

        {/* Header */}
        <div className="relative bg-gradient-to-br from-burgundy via-burgundy-dark to-burgundy text-white rounded-2xl p-6 md:p-8 mb-6 overflow-hidden">
          <div className="bg-pattern absolute inset-0 opacity-20"></div>
          <div className="relative">
            <div className="inline-block bg-brand text-burgundy text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
              🏆 {winners.length > 1 ? `${winners.length} Winners` : "Winner"}
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold mb-1">{draw.title}</h1>
            <p className="text-sm opacity-70">
              Quantum-verified draw · {draw.ticketsSold?.toLocaleString()} tickets
            </p>
          </div>
        </div>

        {/* Winners + per-tier proof */}
        {winners.length === 0 ? (
          <div className="bg-white border border-border rounded-xl p-8 text-center text-text-muted">
            No winner data available for this draw.
          </div>
        ) : (
          <div className="space-y-5">
            {winners.map((w) => {
              const meta = TIER_META[w.tier] || TIER_META[1];
              const prize = prizes.find((p) => p.tier === w.tier);
              const proof = w.quantumProof || {};
              return (
                <div key={w.tier} className="bg-white border border-border rounded-xl overflow-hidden">
                  {/* Winner banner */}
                  <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-5 border-b border-amber-200">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="text-4xl">{meta.medal}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-amber-800 uppercase tracking-wider">{meta.label}</div>
                        <div className="font-bold text-lg">{prize?.name || "Prize"}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-text-muted">Winning ticket</div>
                        <div className="font-mono font-bold text-lg">{w.ticketNumber || "—"}</div>
                      </div>
                      <div className="text-right border-l border-amber-300 pl-4">
                        <div className="text-xs text-text-muted">Won by</div>
                        <div className="font-semibold">{w.displayName || "—"}</div>
                        <div className="text-xs text-text-muted">{w.country}</div>
                      </div>
                    </div>
                  </div>

                  {/* Proof for this tier */}
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">⚛️</span>
                      <h3 className="font-bold text-sm">Quantum proof — {meta.label}</h3>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3 mb-3">
                      <ProofRow label="Randomness source" value={proof.sourceLabel || proof.source || "—"} />
                      <ProofRow label="Algorithm" value={proof.algorithm || "—"} />
                      <ProofRow label="Tickets eligible at this pick" value={(proof.totalEligibleAtPick ?? proof.totalTicketsAtDraw)?.toLocaleString() || "—"} />
                      <ProofRow label="Selected index" value={proof.selectedIndex ?? "—"} />
                    </div>
                    {proof.seed && (
                      <ProofRow label="Quantum seed (256-bit)" value={proof.seed} mono breakable />
                    )}
                    {proof.apiResponseHash && (
                      <ProofRow label="API response hash (SHA-256)" value={proof.apiResponseHash} mono breakable />
                    )}
                    {proof.drawnAt && (
                      <ProofRow label="Drawn at" value={new Date(proof.drawnAt).toLocaleString()} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* How to verify */}
        <div className="bg-white border border-border rounded-xl p-5 mt-6">
          <h3 className="font-bold mb-2 text-sm">How to verify these results yourself</h3>
          <ol className="text-sm text-text-muted list-decimal list-inside space-y-1.5">
            <li>Each tier has its own quantum seed — 32 bytes of true randomness.</li>
            <li>Concatenate the seed bytes big-endian into one 256-bit integer.</li>
            <li>Compute <code className="bg-surface px-1.5 py-0.5 rounded text-burgundy font-mono text-xs">integer mod ticketsEligible</code> — that's the index.</li>
            <li>Sort eligible tickets by <code className="bg-surface px-1.5 py-0.5 rounded text-burgundy font-mono text-xs">ticketNumber</code> ascending; the ticket at that index is the winner.</li>
            <li>For multi-tier draws, each winning ticket is removed before the next tier is drawn.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function ProofRow({ label, value, mono, breakable }) {
  return (
    <div className="mb-1">
      <div className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-0.5">{label}</div>
      <div className={`${mono ? "font-mono text-xs" : "text-sm"} font-semibold ${breakable ? "break-all" : ""}`}>
        {value}
      </div>
    </div>
  );
}
