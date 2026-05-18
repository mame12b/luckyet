
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../lib/api";

export default function DrawProof() {
  const { slug } = useParams();
  const [draw, setDraw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    api.get(`/draws/results/${slug}`)
      .then(({ data }) => setDraw(data.draw))
      .catch((err) => setError(err.response?.data?.message || "Failed to load result"))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="max-w-4xl mx-auto px-6 py-12"><div className="h-96 bg-surface border border-border rounded-xl animate-pulse"></div></div>;

  if (error || !draw) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h1 className="text-2xl font-bold mb-2">Result not found</h1>
        <Link to="/results" className="text-brand-dark font-semibold hover:underline">← Back to results</Link>
      </div>
    );
  }

  const proof = draw.quantumProof;

  return (
    <div className="bg-surface min-h-[80vh]">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <Link to="/results" className="text-sm text-text-muted hover:text-burgundy mb-6 inline-flex items-center gap-1 font-semibold">
          ← All results
        </Link>

        {/* Winner banner */}
        <div className="relative bg-gradient-to-br from-burgundy via-burgundy-dark to-burgundy text-white rounded-2xl p-8 md:p-10 mb-8 overflow-hidden">
          <div className="bg-pattern absolute inset-0 opacity-20"></div>
          <div className="relative">
            <div className="inline-block bg-brand text-burgundy text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4">
              🏆 Winner
            </div>
            <div className="text-xs uppercase tracking-wider opacity-80 mb-1">{draw.title}</div>
            <h1 className="text-3xl md:text-4xl font-extrabold mb-5">{draw.prizeName}</h1>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <div className="text-xs uppercase tracking-wide opacity-70 mb-1">Winner</div>
                <div className="text-xl font-bold">{draw.winnerUserId?.displayName}</div>
                <div className="text-xs opacity-70">{draw.winnerUserId?.country}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide opacity-70 mb-1">Winning ticket</div>
                <div className="font-mono text-xl font-bold text-amber-300">{draw.winnerTicketId?.ticketNumber}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide opacity-70 mb-1">Drawn at</div>
                <div className="text-sm font-semibold">{new Date(proof.drawnAt).toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Proof section */}
        <div className="bg-white border border-border rounded-xl p-6 md:p-8 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">⚛️</span>
            <h2 className="text-xl font-bold">Verifiable Quantum Proof</h2>
          </div>
          <p className="text-text-muted text-sm mb-6">
            This draw used real quantum randomness from the <a href="https://qrng.anu.edu.au" target="_blank" rel="noopener noreferrer" className="text-brand-dark font-semibold hover:underline">Australian National University quantum lab</a>.
            Anyone can re-run the math below and confirm the same winner.
          </p>

          <div className="space-y-4">
            <ProofRow label="Algorithm" value={proof.algorithm} />
            <ProofRow label="Total tickets in draw" value={proof.totalTicketsAtDraw.toLocaleString()} />
            <ProofRow label="Selected index" value={proof.selectedIndex} hint="0-based, into the ticket list sorted by ticketNumber ascending" />
            <ProofRow label="Quantum seed (256 bits)" value={proof.seed} mono breakable />
            <ProofRow label="API response hash (SHA-256)" value={proof.apiResponseHash} mono breakable />
          </div>

          <div className="bg-surface border border-border rounded-md p-4 mt-6">
            <div className="font-semibold text-sm mb-2">How to verify yourself</div>
            <ol className="text-sm text-text-muted list-decimal list-inside space-y-1.5">
              <li>The seed above is 32 bytes (256 bits) of true randomness from ANU's quantum lab.</li>
              <li>Concatenate the bytes big-endian into a single integer.</li>
              <li>Compute <code className="bg-white px-1.5 py-0.5 rounded text-burgundy font-mono text-xs">integer mod totalTickets</code> — that's the index.</li>
              <li>Sort all tickets in this draw by <code className="bg-white px-1.5 py-0.5 rounded text-burgundy font-mono text-xs">ticketNumber</code> ascending, then pick the ticket at that index.</li>
              <li>Confirm it matches the winning ticket number above.</li>
            </ol>
          </div>

          {proof.algorithmDescription && (
            <div className="mt-4 text-xs text-text-muted bg-burgundy-light border border-burgundy/20 rounded-md p-3">
              <strong className="text-burgundy">Full algorithm:</strong> {proof.algorithmDescription}
            </div>
          )}
        </div>

        {/* Draw stats */}
        <div className="bg-white border border-border rounded-xl p-6">
          <h3 className="font-bold mb-3">Draw stats</h3>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <ProofRow label="Ticket price" value={`${draw.ticketPriceETB.toLocaleString()} ETB`} />
            <ProofRow label="Total tickets sold" value={draw.ticketsSold.toLocaleString()} />
            <ProofRow label="Prize value" value={`${draw.prizeEstimatedValueETB.toLocaleString()} ETB`} />
            <ProofRow label="Sales closed" value={new Date(draw.endDate).toLocaleDateString()} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProofRow({ label, value, hint, mono, breakable }) {
  return (
    <div>
      <div className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">{label}</div>
      <div className={`${mono ? "font-mono text-xs" : "text-sm"} font-semibold ${breakable ? "break-all" : ""}`}>{value}</div>
      {hint && <div className="text-xs text-text-faint mt-0.5">{hint}</div>}
    </div>
  );
}
