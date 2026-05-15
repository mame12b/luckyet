
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuthStore } from "../store/auth";

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
        <h1 className="text-2xl font-bold mb-2">Draw not found</h1>
        <p className="text-text-muted mb-6">{error || "This draw doesn't exist or has been removed."}</p>
        <Link to="/draws" className="text-brand font-medium hover:underline">← Back to active draws</Link>
      </div>
    );
  }

  const remaining = draw.ticketPoolSize - draw.ticketsSold;
  const percentSold = (draw.ticketsSold / draw.ticketPoolSize) * 100;
  const soldOut = draw.status === "sold_out" || remaining <= 0;
  const isActive = draw.status === "active";

  const handleBuy = () => {
    if (!user) {
      nav(`/login?redirect=/draws/${slug}/buy`);
      return;
    }
    nav(`/draws/${slug}/buy`);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <Link to="/draws" className="text-sm text-text-muted hover:text-text mb-6 inline-flex items-center gap-1">
        ← Active draws
      </Link>

      <div className="grid md:grid-cols-2 gap-10">
        {/* Left: image */}
        <div>
          <div className="aspect-square bg-surface-2 rounded-xl overflow-hidden">
            {draw.prizeImages?.[0] ? (
              <img src={draw.prizeImages[0]} alt={draw.prizeName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-brand-light to-surface flex items-center justify-center">
                <span className="text-brand text-7xl">★</span>
              </div>
            )}
          </div>
          {draw.prizeImages?.length > 1 && (
            <div className="grid grid-cols-4 gap-2 mt-3">
              {draw.prizeImages.slice(1, 5).map((src, i) => (
                <div key={i} className="aspect-square bg-surface-2 rounded-md overflow-hidden">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: details */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-text-muted">{draw.title}</span>
            {isActive && (
              <span className="inline-flex items-center gap-1 text-xs text-success bg-success-light px-2 py-0.5 rounded-full font-medium">
                <span className="w-1 h-1 bg-success rounded-full"></span>
                Active
              </span>
            )}
            {soldOut && (
              <span className="inline-flex items-center gap-1 text-xs text-warning bg-warning-light px-2 py-0.5 rounded-full font-medium">
                Sold out
              </span>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">{draw.prizeName}</h1>

          {draw.prizeDescription && (
            <p className="text-text-muted leading-relaxed mb-6">{draw.prizeDescription}</p>
          )}

          {/* Price card */}
          <div className="bg-surface border border-border rounded-xl p-5 mb-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-text-muted mb-1">Ticket price</div>
                <div className="text-xl font-bold">{draw.ticketPriceETB.toLocaleString()} ETB</div>
                {draw.priceDisplay && draw.priceDisplay.displayCurrency !== "ETB" && (
                  <div className="text-xs text-text-faint">
                    ≈ {draw.priceDisplay.displayAmount} {draw.priceDisplay.displayCurrency}
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs text-text-muted mb-1">Prize value</div>
                <div className="text-xl font-bold">{draw.prizeEstimatedValueETB.toLocaleString()} ETB</div>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="bg-surface border border-border rounded-xl p-5 mb-5">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-text-muted">Tickets sold</span>
              <span className="font-semibold">{draw.ticketsSold.toLocaleString()} / {draw.ticketPoolSize.toLocaleString()}</span>
            </div>
            <div className="w-full h-2 bg-surface-2 rounded-full overflow-hidden">
              <div className="h-full bg-brand rounded-full" style={{ width: `${percentSold}%` }}></div>
            </div>
            <div className="text-xs text-text-muted mt-2">
              {remaining > 0 ? `${remaining.toLocaleString()} tickets remaining` : "Sold out"}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3 text-sm mb-6">
            <div>
              <div className="text-xs text-text-muted mb-1">Closes</div>
              <div className="font-medium">{new Date(draw.endDate).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</div>
            </div>
            {draw.drawDate && (
              <div>
                <div className="text-xs text-text-muted mb-1">Draw date</div>
                <div className="font-medium">{new Date(draw.drawDate).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</div>
              </div>
            )}
          </div>

          {/* CTA */}
          <button
            onClick={handleBuy}
            disabled={!isActive || soldOut}
            className="w-full bg-brand text-white font-medium py-3 rounded-md hover:bg-brand-dark transition disabled:bg-text-faint disabled:cursor-not-allowed"
          >
            {soldOut ? "Sold out" : !isActive ? "Not available" : "Buy a ticket"}
          </button>

          {!user && isActive && !soldOut && (
            <p className="text-xs text-text-muted text-center mt-3">
              You'll be asked to sign in or create an account
            </p>
          )}
        </div>
      </div>
    </div>
  );
}