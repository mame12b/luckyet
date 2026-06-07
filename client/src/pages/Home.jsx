import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import QRCard from "../components/QRCard";
import { capturePromoFromUrl, getStoredPromo, clearStoredPromo } from "../lib/promo";

const SLIDES = [
  {
    eyebrow: "🎰 Live now",
    title: "iPhone 15 Pro Max",
    accent: "+ 100,000 ETB",
    body: "5,000 tickets · Quantum-verified · Impossible to rig",
    cta: { label: "Buy a ticket", to: "/draws" },
    badge: { text: "Active", className: "bg-green-100 text-green-800" },
    bg: "from-amber-50 via-white to-burgundy-light",
  },
  {
    eyebrow: "🏆 Coming soon",
    title: "Suzuki Dzire 2026",
    accent: "Brand new car",
    body: "The next big draw. Get on the early list for first access.",
    cta: { label: "Get notified", to: "/register" },
    badge: { text: "Soon", className: "bg-amber-100 text-amber-800" },
    bg: "from-burgundy-light via-white to-amber-50",
  },
  {
    eyebrow: "🏠 Final draw",
    title: "House in Addis",
    accent: "Fully furnished",
    body: "3-bedroom apartment, full legal paperwork.",
    cta: { label: "Get notified", to: "/register" },
    badge: { text: "Upcoming", className: "bg-burgundy-light text-burgundy" },
    bg: "from-amber-50 via-white to-amber-100",
  },
];

const SLIDE_INTERVAL = 6000;

export default function Home() {
  const [slide, setSlide] = useState(0);
  const [featured, setFeatured] = useState(null);
  const [promo, setPromo] = useState(null);

  // Auto-rotate slides
  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), SLIDE_INTERVAL);
    return () => clearInterval(t);
  }, []);

  // Load the featured (active) draw for countdown
  useEffect(() => {
    api.get("/draws").then(({ data }) => {
      const active = (data.draws || []).find((d) => d.status === "active");
      if (active) setFeatured(active);
    }).catch(() => {});
  }, []);

  const current = SLIDES[slide];

  // Capture promo code from QR scan (?promo=ABELA10), validate it,
  // then keep showing a banner until the user completes a purchase or dismisses it.
  // Capture promo code from QR scan (?promo=ABELA10) OR from previous visit
  useEffect(() => {
    const code = capturePromoFromUrl() || getStoredPromo();
    if (!code) return;
    api.get(`/streamers/validate/${code}`)
      .then(({ data }) => {
        if (data.valid) setPromo(data);
        else clearStoredPromo();
      })
      .catch(() => clearStoredPromo());
  }, []);

  const dismissPromo = () => {
    clearStoredPromo();
    setPromo(null);
  };


  return (
    <div className="bg-bg">

            {/* Promo banner — visible when a buyer arrived via promoter's QR */}
      {promo && (
        <div className="bg-burgundy text-white py-3 px-4 animate-slideIn">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm flex items-center gap-2 min-w-0 flex-1">
              <span className="text-base">🎁</span>
              <span className="min-w-0">
                Shopping with <span className="font-mono font-bold tracking-wider">{promo.promoCode}</span> —
                your friend <strong>{promo.streamerName}</strong> earns commission on your tickets.
              </span>
            </div>
            <button
              onClick={dismissPromo}
              className="text-white/70 hover:text-white text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap"
              aria-label="Remove promo code"
            >
              Remove
            </button>
          </div>
        </div>
      )}
      {/* ===== HERO ===== */}
      <section className={`relative overflow-hidden bg-gradient-to-br ${current.bg} transition-all duration-1000`}>
        {/* Subtle dot pattern */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'radial-gradient(#8b1e3f 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}></div>

        {/* Floating gold orbs (decoration) */}
        <div className="absolute top-12 right-12 w-32 h-32 bg-amber-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-8 w-40 h-40 bg-burgundy/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20 relative">
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left: copy */}
            <div className="animate-slideIn" key={slide}>
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur border border-amber-400/40 px-3 py-1.5 rounded-full mb-5 shadow-sm">
                <span className="text-xs font-bold text-burgundy">{current.eyebrow}</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05] mb-2">
                Win a {current.title}
              </h1>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-5 bg-gradient-to-r from-amber-500 to-amber-700 bg-clip-text text-transparent">
                {current.accent}
              </div>

              <p className="text-text-muted text-base sm:text-lg leading-relaxed mb-6 max-w-lg">
                {current.body}
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap gap-3">
                <Link
                  to={current.cta.to}
                  className="inline-flex items-center gap-2 bg-burgundy text-white font-bold px-6 py-3.5 rounded-lg hover:bg-burgundy-dark transition shadow-lg shadow-burgundy/20 active:scale-95"
                >
                  {current.cta.label} →
                </Link>
                <Link
                  to="/how-it-works"
                  className="inline-flex items-center gap-2 bg-white border-2 border-border text-text font-bold px-6 py-3.5 rounded-lg hover:border-burgundy transition active:scale-95"
                >
                  How it works
                </Link>
              </div>

              {/* Trust row */}
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-6 text-xs text-text-muted">
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>ANU Quantum Lab partner</span>
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>Verifiable draws</span>
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-burgundy rounded-full"></span>18+ only</span>
              </div>
            </div>

            {/* Right: featured prize card with countdown */}
            <div className="relative">
              {featured ? (
                <FeaturedDrawCard draw={featured} />
              ) : (
                <div className="bg-white border-2 border-amber-400/40 rounded-2xl p-6 sm:p-7 shadow-2xl">
                  <div className="text-center py-8">
                    <div className="text-5xl mb-3">🎟️</div>
                    <h3 className="font-bold text-lg mb-1">No active draw right now</h3>
                    <p className="text-text-muted text-sm">Check back soon for the next one.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Slide indicators */}
          <div className="flex justify-center gap-1.5 mt-8">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                className={`h-1.5 rounded-full transition-all ${i === slide ? "w-8 bg-burgundy" : "w-1.5 bg-burgundy/20 hover:bg-burgundy/40"}`}
                aria-label={`Slide ${i + 1}`}
              ></button>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Recent Winners placeholder ===== */}
      <section className="bg-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <div className="text-xs font-bold text-burgundy uppercase tracking-widest mb-1">Recent Winners</div>
            <h2 className="text-2xl sm:text-3xl font-extrabold">Real people. Real prizes.</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { name: "Coming soon", prize: "First winner reveal", date: "" },
              { name: "Coming soon", prize: "Stay tuned", date: "" },
              { name: "Coming soon", prize: "Tickets selling fast", date: "" },
            ].map((w, i) => (
              <div key={i} className="bg-surface border border-border rounded-xl p-5 text-center">
                <div className="text-4xl mb-2">🏆</div>
                <div className="font-bold">{w.name}</div>
                <div className="text-sm text-text-muted">{w.prize}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== QR + How to play ===== */}
      <section className="bg-surface py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="text-xs font-bold text-burgundy uppercase tracking-widest mb-1">Scan & play</div>
              <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">Take LuckyET with you</h2>
              <p className="text-text-muted text-base mb-5 leading-relaxed">
                Scan this QR code from any device to open LuckyET. Share it with friends and family — they can buy tickets and check results instantly.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/draws" className="bg-burgundy text-white font-bold px-5 py-2.5 rounded-lg hover:bg-burgundy-dark transition text-sm">
                  Browse draws →
                </Link>
                <Link to="/how-it-works" className="bg-white border border-border font-semibold px-5 py-2.5 rounded-lg hover:bg-surface transition text-sm">
                  Learn more
                </Link>
              </div>
            </div>
            <div className="flex justify-center md:justify-end">
              <QRCard
                title="Scan to play"
                subtitle="Opens LuckyET on your phone"
                size={160}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ============================================================
   Featured draw card with live countdown
============================================================ */

function FeaturedDrawCard({ draw }) {
  const [timeLeft, setTimeLeft] = useState(() => computeTimeLeft(draw.drawDate));

  useEffect(() => {
    const t = setInterval(() => setTimeLeft(computeTimeLeft(draw.drawDate)), 1000);
    return () => clearInterval(t);
  }, [draw.drawDate]);

  const prize = draw.prizes?.[0] || { name: draw.prizeName };
  const soldPct = draw.ticketsSold / draw.ticketPoolSize * 100;

  return (
    <div className="bg-white border-2 border-amber-400/60 rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-400/20 to-transparent rounded-bl-full"></div>

      <div className="flex items-start justify-between mb-4 relative">
        <div className="text-[10px] font-bold uppercase tracking-widest text-burgundy bg-burgundy-light px-2 py-1 rounded">
          Live now
        </div>
        <div className="text-[10px] text-text-muted">{draw.title}</div>
      </div>

      <div className="text-xs font-semibold text-text-muted mb-1">Current jackpot</div>
      <div className="text-2xl sm:text-3xl font-extrabold leading-tight mb-1">{prize.name}</div>
      {draw.prizes?.length > 1 && (
        <div className="text-xs text-text-muted mb-3">+ {draw.prizes.length - 1} more {draw.prizes.length === 2 ? "prize" : "prizes"}</div>
      )}

      {/* Countdown */}
      <div className="bg-gradient-to-br from-burgundy to-burgundy-dark text-white rounded-xl p-4 my-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-amber-300 mb-2 text-center">
          {timeLeft.expired ? "Draw closed" : "Draw closes in"}
        </div>
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          <CountUnit value={timeLeft.days} label="D" />
          <CountUnit value={timeLeft.hours} label="H" />
          <CountUnit value={timeLeft.minutes} label="M" />
          <CountUnit value={timeLeft.seconds} label="S" />
        </div>
      </div>

      {/* Sold progress */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-text-muted">Tickets sold</span>
          <span className="font-semibold">{draw.ticketsSold.toLocaleString()} / {draw.ticketPoolSize.toLocaleString()}</span>
        </div>
        <div className="h-2 bg-surface rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-700"
            style={{ width: `${Math.min(100, soldPct)}%` }}
          ></div>
        </div>
      </div>

      <Link
        to={`/draws/${draw.slug}/buy`}
        className="block w-full text-center bg-brand text-white font-bold py-3 rounded-lg hover:bg-brand-dark transition shadow-gold active:scale-95"
      >
        Buy ticket — {draw.ticketPriceETB.toLocaleString()} ETB
      </Link>
    </div>
  );
}

function CountUnit({ value, label }) {
  return (
    <div className="bg-white/10 backdrop-blur rounded-md py-2 text-center">
      <div className="text-xl sm:text-2xl font-extrabold font-mono">{String(value).padStart(2, "0")}</div>
      <div className="text-[9px] uppercase tracking-wider opacity-70">{label}</div>
    </div>
  );
}

function computeTimeLeft(drawDate) {
  const now = new Date().getTime();
  const target = new Date(drawDate).getTime();
  const diff = target - now;
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    expired: false,
  };
}
