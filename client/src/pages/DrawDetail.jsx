
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuthStore } from "../store/auth";

const TIER_LABEL = {
  1: "Grand prize",
  2: "2nd prize",
  3: "3rd prize",
  4: "4th prize",
  5: "5th prize",
};
const TIER_COLOR = {
  1: "from-amber-400 to-amber-600",
  2: "from-slate-300 to-slate-500",
  3: "from-amber-600 to-amber-800",
  4: "from-burgundy to-burgundy-dark",
  5: "from-burgundy-dark to-burgundy",
};

export default function DrawDetail() {
  const { slug } = useParams();
  const nav = useNavigate();
  const { user } = useAuthStore();
  const [draw, setDraw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const country = user?.country || "AE";
    api.get(`/draws/slug/${slug}?country=${country}`)
      .then(({ data }) => setDraw(data.draw))
      .catch((err) => setError(err.response?.data?.message || "Failed to load draw"))
      .finally(() => setLoading(false));
  }, [slug, user]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="h-96 bg-surface border border-border rounded-xl animate-pulse"></div>
      </div>
    );
  }

  if (error || !draw) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-16 text-center">
        <div className="text-5xl mb-4">🎰</div>
        <h1 className="text-2xl font-bold mb-2">Draw not found</h1>
        <p className="text-text-muted mb-6">{error || "This draw doesn't exist or has been removed."}</p>
        <Link to="/draws" className="text-brand-dark font-semibold hover:underline">← Back to active draws</Link>
      </div>
    );
  }

  // Normalize prizes
  const prizes = draw.prizes?.length
    ? [...draw.prizes].sort((a, b) => a.tier - b.tier)
    : draw.prizeName
    ? [{ tier: 1, name: draw.prizeName, description: draw.prizeDescription, estimatedValueETB: draw.prizeEstimatedValueETB, imageUrl: draw.prizeImages?.[0] }]
    : [];

  const grandPrize = prizes[0];
  const otherPrizes = prizes.slice(1);
  const totalPrizeValue = prizes.reduce((sum, p) => sum + (p.estimatedValueETB || 0), 0);

  const remaining = draw.ticketPoolSize - draw.ticketsSold;
  const percent = (draw.ticketsSold / draw.ticketPoolSize) * 100;
  const soldOut = draw.status === "sold_out" || remaining <= 0;
  const isActive = draw.status === "active";

  const handleBuy = () => {
    if (!user) { nav(`/login?redirect=/draws/${slug}/buy`); return; }
    nav(`/draws/${slug}/buy`);
  };

  return (
    <div className="bg-surface min-h-[80vh]">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-10">
        <Link to="/draws" className="text-sm text-text-muted hover:text-burgundy mb-6 inline-flex items-center gap-1 font-semibold">
          ← All draws
        </Link>

        <div className="grid md:grid-cols-2 gap-8 md:gap-10">
          {/* Left: grand prize image + other prizes */}
          <div>
            <div className="aspect-square bg-gradient-to-br from-amber-50 to-burgundy-light rounded-2xl overflow-hidden shadow-card mb-4">
              {grandPrize?.imageUrl ? (
                <img src={grandPrize.imageUrl} alt={grandPrize.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-9xl opacity-30">🎁</div>
              )}
            </div>

            {/* Other prize tiers grid */}
            {otherPrizes.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {otherPrizes.map((p) => (
                  <div key={p.tier} className="bg-white border border-border rounded-lg p-3 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${TIER_COLOR[p.tier]} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                      {p.tier}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-text-muted uppercase tracking-wide">{TIER_LABEL[p.tier]}</div>
                      <div className="font-semibold text-sm truncate">{p.name}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: details */}
          <div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-xs font-semibold text-burgundy">{draw.title}</span>
              {isActive && (
                <span className="inline-flex items-center gap-1 text-xs text-success bg-success-light px-2 py-0.5 rounded-full font-semibold">
                  <span className="w-1 h-1 bg-success rounded-full"></span>
                  Active
                </span>
              )}
              {soldOut && (
                <span className="inline-flex items-center gap-1 text-xs text-warning bg-warning-light px-2 py-0.5 rounded-full font-semibold">
                  Sold out
                </span>
              )}
              {prizes.length > 1 && (
                <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                  {prizes.length} prizes
                </span>
              )}
            </div>

            <div className="text-[10px] text-text-muted uppercase tracking-widest mb-1">{TIER_LABEL[1]}</div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">{grandPrize?.name}</h1>

            {grandPrize?.description && (
              <p className="text-text-muted leading-relaxed mb-5">{grandPrize.description}</p>
            )}

            {/* Price card */}
            <div className="bg-white border border-border rounded-xl p-5 mb-4 shadow-soft">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-text-muted mb-1">Ticket price</div>
                  <div className="text-2xl font-extrabold text-burgundy">{draw.ticketPriceETB.toLocaleString()} <span className="text-sm font-normal text-text-muted">ETB</span></div>
                  {draw.priceDisplay && draw.priceDisplay.displayCurrency !== "ETB" && (
                    <div className="text-xs text-text-faint mt-0.5">≈ {draw.priceDisplay.displayAmount} {draw.priceDisplay.displayCurrency}</div>
                  )}
                </div>
                <div>
                  <div className="text-xs text-text-muted mb-1">Total prize pool</div>
                  <div className="text-2xl font-extrabold text-gradient-gold">{totalPrizeValue.toLocaleString()} <span className="text-sm font-normal text-text-muted">ETB</span></div>
                  <div className="text-xs text-text-faint mt-0.5">across {prizes.length} winner{prizes.length > 1 ? "s" : ""}</div>
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="bg-white border border-border rounded-xl p-5 mb-4 shadow-soft">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-text-muted">Tickets sold</span>
                <span className="font-bold">{draw.ticketsSold.toLocaleString()} / {draw.ticketPoolSize.toLocaleString()}</span>
              </div>
              <div className="w-full h-2.5 bg-surface-2 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-gradient-to-r from-brand to-brand-dark rounded-full" style={{ width: `${percent}%` }}></div>
              </div>
              <div className="text-xs text-text-muted">
                {remaining > 0 ? `${remaining.toLocaleString()} tickets remaining` : "Sold out"}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm mb-6">
              <div className="bg-white border border-border rounded-lg p-3">
                <div className="text-xs text-text-muted">Closes</div>
                <div className="font-bold">{new Date(draw.endDate).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</div>
              </div>
              {draw.drawDate && (
                <div className="bg-white border border-border rounded-lg p-3">
                  <div className="text-xs text-text-muted">Draw date</div>
                  <div className="font-bold">{new Date(draw.drawDate).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</div>
                </div>
              )}
            </div>

            <button
              onClick={handleBuy}
              disabled={!isActive || soldOut}
              className="w-full bg-brand text-white font-bold py-3.5 rounded-lg hover:bg-brand-dark transition shadow-gold disabled:bg-text-faint disabled:shadow-none disabled:cursor-not-allowed text-base"
            >
              {soldOut ? "Sold out" : !isActive ? "Not available" : "Buy a ticket →"}
            </button>

            {!user && isActive && !soldOut && (
              <p className="text-xs text-text-muted text-center mt-3">
                You'll be asked to sign in or create an account
              </p>
            )}
          </div>
        </div>

        {/* Prize tiers section (detailed) */}
        {prizes.length > 1 && (
          <section className="mt-12">
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight mb-5">All prize tiers</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {prizes.map((p) => (
                <div key={p.tier} className="bg-white border border-border rounded-xl overflow-hidden">
                  <div className={`h-32 bg-gradient-to-br ${TIER_COLOR[p.tier]} flex items-center justify-center relative`}>
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-5xl text-white opacity-50">{p.tier === 1 ? "🥇" : p.tier === 2 ? "🥈" : p.tier === 3 ? "🥉" : "🎁"}</span>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="text-[10px] text-text-muted uppercase tracking-widest mb-1">{TIER_LABEL[p.tier]}</div>
                    <h3 className="font-bold mb-1">{p.name}</h3>
                    {p.description && <p className="text-sm text-text-muted mb-2">{p.description}</p>}
                    <div className="text-sm font-bold text-burgundy">{p.estimatedValueETB?.toLocaleString()} ETB</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
