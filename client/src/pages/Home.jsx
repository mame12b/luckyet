import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../lib/api";
import QRCard from "../components/QRCard";
import { capturePromoFromUrl, getStoredPromo, clearStoredPromo } from "../lib/promo";

// ─── constants ────────────────────────────────────────────────────────────────
const SLIDE_INTERVAL = 5000;

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmtETB(n) {
  if (!n && n !== 0) return "—";
  return Number(n).toLocaleString("en-ET") + " ETB";
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

// ─── main component ───────────────────────────────────────────────────────────
export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // data
  const [draws, setDraws] = useState([]);
  const [loading, setLoading] = useState(true);
  const [featured, setFeatured] = useState(null);
  const [promo, setPromo] = useState(null);

  // prize carousel
  const [activeSlide, setActiveSlide] = useState(0);
  const timerRef = useRef(null);

  // sticky bottom CTA visibility
  const [showStickyCTA, setShowStickyCTA] = useState(false);

  // ── fetch draws ───────────────────────────────────────────────────────────
  useEffect(() => {
    api.get("/draws").then(({ data }) => {
      const all = data.draws || data || [];
      setDraws(Array.isArray(all) ? all : []);
      const active = all.find((d) => d.status === "active");
      if (active) setFeatured(active);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // ── promo capture ─────────────────────────────────────────────────────────
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

  // ── hero draw + prizes (each prize is one slide) ──────────────────────────
  const heroDraw = useMemo(
    () => featured || draws.find((d) => d.status === "active") || null,
    [featured, draws]
  );
  const heroPrizes = useMemo(() => heroDraw?.prizes || [], [heroDraw]);

  // ── auto-advance carousel through PRIZES ──────────────────────────────────
  const advance = useCallback(() => {
    setActiveSlide((prev) => (prev + 1) % Math.max(heroPrizes.length, 1));
  }, [heroPrizes.length]);

  useEffect(() => {
    if (heroPrizes.length <= 1) return;
    timerRef.current = setInterval(advance, SLIDE_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [advance, heroPrizes.length]);

  // Reset slide index if prize list shrinks
  useEffect(() => {
    if (activeSlide >= heroPrizes.length && heroPrizes.length > 0) {
      setActiveSlide(0);
    }
  }, [activeSlide, heroPrizes.length]);

  const goToSlide = (i) => {
    clearInterval(timerRef.current);
    setActiveSlide(i);
    timerRef.current = setInterval(advance, SLIDE_INTERVAL);
  };

  // ── scroll listener for sticky bottom CTA ─────────────────────────────────
  useEffect(() => {
    const onScroll = () => {
      setShowStickyCTA(window.scrollY > window.innerHeight * 0.7);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const dismissPromo = () => {
    clearStoredPromo();
    setPromo(null);
  };

  // ── rank label helper ─────────────────────────────────────────────────────
  const rankLabel = (idx) => {
    const map = ["firstPrize", "secondPrize", "thirdPrize", "fourthPrize"];
    const fallbacks = ["First Prize", "Second Prize", "Third Prize", "Fourth Prize"];
    return t(`home.hero.${map[idx] || "prize"}`, fallbacks[idx] || `Prize #${idx + 1}`);
  };

  const goToBuy = () => {
    if (heroDraw) navigate(`/draws/${heroDraw.slug || heroDraw._id}/buy`);
    else navigate("/draws");
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="bg-bg">

      {/* ── PROMO BANNER ─────────────────────────────────────────────────── */}
      {promo && (
        <div className="bg-burgundy text-white py-3 px-4 animate-slideIn">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm flex items-center gap-2 min-w-0 flex-1">
              <span className="text-base">🎁</span>
              <span className="min-w-0">
                {t("home.promoBanner.shoppingWith")}{" "}
                <span className="font-mono font-bold tracking-wider">{promo.promoCode}</span> —{" "}
                {t("home.promoBanner.earnsCommission", { name: promo.streamerName })}
              </span>
            </div>
            <button
              onClick={dismissPromo}
              className="text-white/70 hover:text-white text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap"
              aria-label={t("home.promoBanner.remove")}
            >
              {t("home.promoBanner.remove")}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          1. CINEMATIC HERO — branded backdrop + PRIZE carousel
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        className="relative w-full overflow-hidden"
        style={{ height: "min(90vh, 680px)" }}
        aria-label={t("home.hero.label", "Prize showcase")}
      >
        {/* ── STATIC BRANDED BACKDROP (shared across all prize slides) ── */}
        <div className="absolute inset-0">
          {/* 1. Burgundy gradient base */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#8b1e3f] via-[#6e1732] to-[#3a0c1b]" />

          {/* 2. Gold sunburst — 32 rays */}
          <svg
            className="absolute pointer-events-none"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="-50 -50 100 100"
            style={{
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: "min(95vw, 950px)",
              height: "min(95vw, 950px)",
            }}
          >
            <defs>
              <radialGradient id="ray-fade" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.55" />
                <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </radialGradient>
            </defs>
            <g stroke="url(#ray-fade)" strokeWidth="0.4">
              {Array.from({ length: 32 }).map((_, j) => {
                const rad = ((j * 360) / 32) * (Math.PI / 180);
                return (
                  <line
                    key={j}
                    x1="0"
                    y1="0"
                    x2={Math.cos(rad) * 50}
                    y2={Math.sin(rad) * 50}
                  />
                );
              })}
            </g>
          </svg>

          {/* 3. Spotlight glow */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: "min(75vw, 780px)",
              height: "min(75vw, 780px)",
              background:
                "radial-gradient(circle, rgba(251,191,36,0.35) 0%, rgba(245,158,11,0.15) 40%, transparent 70%)",
              filter: "blur(30px)",
            }}
          />

          {/* 4. Gold dot pattern */}
          <div
            className="absolute inset-0 opacity-[0.15] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(#fbbf24 1.5px, transparent 1.5px)",
              backgroundSize: "32px 32px",
            }}
          />

          {/* 5. Sparkle particles */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <g fill="#fbbf24">
              <circle cx="8" cy="20" r="0.28" opacity="0.8" />
              <circle cx="15" cy="55" r="0.18" opacity="0.5" />
              <circle cx="22" cy="10" r="0.32" opacity="0.85" />
              <circle cx="32" cy="38" r="0.2" opacity="0.6" />
              <circle cx="40" cy="72" r="0.25" opacity="0.7" />
              <circle cx="48" cy="18" r="0.18" opacity="0.55" />
              <circle cx="62" cy="88" r="0.3" opacity="0.8" />
              <circle cx="78" cy="92" r="0.22" opacity="0.65" />
              <circle cx="88" cy="28" r="0.26" opacity="0.75" />
              <circle cx="92" cy="62" r="0.18" opacity="0.5" />
            </g>
          </svg>

          {/* 6. Corner brackets */}
          <div className="absolute top-5 left-5 w-10 h-10 border-t-2 border-l-2 border-[#f59e0b] opacity-70 pointer-events-none" />
          <div className="absolute top-5 right-5 w-10 h-10 border-t-2 border-r-2 border-[#f59e0b] opacity-70 pointer-events-none" />
          <div className="absolute bottom-5 left-5 w-10 h-10 border-b-2 border-l-2 border-[#f59e0b] opacity-70 pointer-events-none" />
          <div className="absolute bottom-5 right-5 w-10 h-10 border-b-2 border-r-2 border-[#f59e0b] opacity-70 pointer-events-none" />
        </div>

        {loading && (
          <div className="absolute inset-0 bg-gradient-to-br from-[#8b1e3f] to-[#4a0f22] animate-pulse" />
        )}

        {/* ── STATIC DRAW BADGE (top, doesn't change between prize slides) ── */}
        {heroDraw && (
          <div className="absolute top-8 sm:top-10 left-1/2 -translate-x-1/2 z-20 px-4">
            <span
              className="inline-block bg-[#8b1e3f]/70 backdrop-blur-sm border border-[#f59e0b]/50 text-white text-[10px] sm:text-xs font-bold tracking-[0.25em] uppercase px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap"
              style={{ textShadow: "0 1px 8px rgba(58,12,27,0.8)" }}
            >
              {t("home.hero.live", "Live Now")} · {heroDraw.name || heroDraw.title || ""}
            </span>
          </div>
        )}

        {/* ── PRIZE SLIDES — each prize is its own slide ── */}
        {heroPrizes.map((prize, i) => {
          const amount = prize.prizeAmount ?? prize.value;
          return (
            <div
              key={i}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center transition-opacity duration-700 pointer-events-none"
              style={{ opacity: i === activeSlide ? 1 : 0 }}
            >
              {/* tier label */}
              <p
                className="text-[#fbbf24] text-xs sm:text-sm font-bold tracking-[0.35em] uppercase mb-3"
                style={{ textShadow: "0 2px 12px rgba(58,12,27,0.9)" }}
              >
                {rankLabel(i)}
              </p>

              {/* prize name (HUGE) */}
              <h2
                className="text-white font-extrabold leading-tight mb-3 max-w-2xl"
                style={{
                  fontSize: "clamp(2rem, 7vw, 4rem)",
                  textShadow:
                    "0 2px 24px rgba(58,12,27,0.95), 0 0 40px rgba(58,12,27,0.6)",
                }}
              >
                {prize.name || prize.title}
              </h2>

              {/* prize amount in gold */}
              {amount && (
                <p
                  className="font-black text-[#fbbf24]"
                  style={{
                    fontSize: "clamp(1.25rem, 4vw, 2rem)",
                    textShadow: "0 2px 18px rgba(58,12,27,0.9)",
                  }}
                >
                  {fmtETB(amount)}
                </p>
              )}
            </div>
          );
        })}

        {/* Fallback when no prizes */}
        {heroDraw && heroPrizes.length === 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center px-6">
            <h2
              className="text-white font-extrabold text-center"
              style={{ fontSize: "clamp(1.5rem, 5vw, 2.5rem)" }}
            >
              {t("home.hero.noPrizes", "Prizes announced soon")}
            </h2>
          </div>
        )}

        {/* ── TRUST BADGES (static, above the button) ── */}
        <div
          className="absolute bottom-32 sm:bottom-36 left-0 right-0 z-20 flex flex-wrap justify-center gap-x-4 gap-y-1 text-white/80 text-[11px] px-6"
          style={{ textShadow: "0 1px 8px rgba(58,12,27,0.8)" }}
        >
          <span>● {t("home.trust.anuPartner")}</span>
          <span>● {t("home.trust.verifiable")}</span>
          <span>● {t("home.trust.ageOnly")}</span>
        </div>

        {/* ── BUY TICKETS BUTTON — centered at bottom of hero ── */}
        <div className="absolute bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={goToBuy}
            className="bg-[#f59e0b] hover:bg-[#d97706] active:scale-95 text-white font-bold tracking-widest uppercase px-8 sm:px-10 py-3.5 sm:py-4 rounded-full shadow-xl transition-all duration-200 text-sm whitespace-nowrap"
          >
            {t("home.hero.buyTickets", "Buy Tickets")} →
          </button>
        </div>

        {/* ── CAROUSEL DOTS (very bottom) ── */}
        {heroPrizes.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {heroPrizes.map((_, i) => (
              <button
                key={i}
                onClick={() => goToSlide(i)}
                aria-label={`Prize ${i + 1}`}
                className={`rounded-full transition-all duration-300 ${
                  i === activeSlide
                    ? "w-7 h-2.5 bg-[#f59e0b]"
                    : "w-2.5 h-2.5 bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        )}

        {/* ── PREV / NEXT arrows ── */}
        {heroPrizes.length > 1 && (
          <>
            <button
              onClick={() => goToSlide((activeSlide - 1 + heroPrizes.length) % heroPrizes.length)}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition text-xl"
              aria-label="Previous"
            >
              ‹
            </button>
            <button
              onClick={() => goToSlide((activeSlide + 1) % heroPrizes.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition text-xl"
              aria-label="Next"
            >
              ›
            </button>
          </>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          2. FEATURED DRAW CARD
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-lg mx-auto">
            {featured ? (
              <FeaturedDrawCard draw={featured} />
            ) : (
              <div className="bg-white border-2 border-amber-400/40 rounded-2xl p-6 sm:p-7 shadow-2xl">
                <div className="text-center py-8">
                  <div className="text-5xl mb-3">🎟️</div>
                  <h3 className="font-bold text-lg mb-1">{t("home.featured.noActiveDraw")}</h3>
                  <p className="text-text-muted text-sm">{t("home.featured.checkBack")}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          3. RECENT WINNERS
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-surface py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <div className="text-xs font-bold text-burgundy uppercase tracking-widest mb-1">
              {t("home.winners.eyebrow")}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold">{t("home.winners.title")}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { name: t("home.winners.comingSoon"), prize: t("home.winners.firstWinner") },
              { name: t("home.winners.comingSoon"), prize: t("home.winners.stayTuned") },
              { name: t("home.winners.comingSoon"), prize: t("home.winners.ticketsSellingFast") },
            ].map((w, i) => (
              <div key={i} className="bg-white border border-border rounded-xl p-5 text-center">
                <div className="text-4xl mb-2">🏆</div>
                <div className="font-bold">{w.name}</div>
                <div className="text-sm text-text-muted">{w.prize}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          4. QR + HOW TO PLAY
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="text-xs font-bold text-burgundy uppercase tracking-widest mb-1">
                {t("home.qrSection.eyebrow")}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">
                {t("home.qrSection.title")}
              </h2>
              <p className="text-text-muted text-base mb-5 leading-relaxed">
                {t("home.qrSection.body")}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/draws"
                  className="bg-burgundy text-white font-bold px-5 py-2.5 rounded-lg hover:bg-burgundy-dark transition text-sm"
                >
                  {t("home.qrSection.browseDraws")}
                </Link>
                <Link
                  to="/how-it-works"
                  className="bg-white border border-border font-semibold px-5 py-2.5 rounded-lg hover:bg-surface transition text-sm"
                >
                  {t("home.qrSection.learnMore")}
                </Link>
              </div>
            </div>
            <div className="flex justify-center md:justify-end">
              <QRCard
                title={t("home.qrSection.scanTitle")}
                subtitle={t("home.qrSection.scanSubtitle")}
                size={160}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FLOATING BUY TICKETS PILL  (bottom-right corner, after scrolling past hero)
      ══════════════════════════════════════════════════════════════════════ */}
      {showStickyCTA && heroDraw && (
        <button
          onClick={goToBuy}
          className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 bg-[#f59e0b] hover:bg-[#d97706] active:scale-95 text-white font-bold tracking-wider uppercase px-5 sm:px-6 py-3 sm:py-3.5 rounded-full shadow-2xl transition-all duration-200 text-sm flex items-center gap-2 animate-popIn"
          aria-label={t("home.stickyCTA.buyTickets", "Buy Tickets")}
        >
          <span className="text-base">🎟️</span>
          <span>{t("home.stickyCTA.buyTickets", "Buy Tickets")}</span>
        </button>
      )}
    </div>
  );
}

/* ============================================================
   FeaturedDrawCard — your original, untouched
============================================================ */
function FeaturedDrawCard({ draw }) {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState(() => computeTimeLeft(draw.drawDate));

  useEffect(() => {
    const tid = setInterval(() => setTimeLeft(computeTimeLeft(draw.drawDate)), 1000);
    return () => clearInterval(tid);
  }, [draw.drawDate]);

  const prize = draw.prizes?.[0] || { name: draw.prizeName };
  const soldPct = (draw.ticketsSold / draw.ticketPoolSize) * 100;
  const morePrizesCount = (draw.prizes?.length || 0) - 1;

  return (
    <div className="bg-white border-2 border-amber-400/60 rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-400/20 to-transparent rounded-bl-full"></div>

      <div className="flex items-start justify-between mb-4 relative">
        <div className="text-[10px] font-bold uppercase tracking-widest text-burgundy bg-burgundy-light px-2 py-1 rounded">
          {t("home.featured.liveNow")}
        </div>
        <div className="text-[10px] text-text-muted">{draw.title}</div>
      </div>

      <div className="text-xs font-semibold text-text-muted mb-1">{t("home.featured.currentJackpot")}</div>
      <div className="text-2xl sm:text-3xl font-extrabold leading-tight mb-1">{prize.name}</div>
      {morePrizesCount > 0 && (
        <div className="text-xs text-text-muted mb-3">
          {t(morePrizesCount === 1 ? "home.featured.morePrize" : "home.featured.morePrizes", { count: morePrizesCount })}
        </div>
      )}

      <div className="bg-gradient-to-br from-burgundy to-burgundy-dark text-white rounded-xl p-4 my-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-amber-300 mb-2 text-center">
          {timeLeft.expired ? t("home.featured.drawClosed") : t("home.featured.drawClosesIn")}
        </div>
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          <CountUnit value={timeLeft.days} label="D" />
          <CountUnit value={timeLeft.hours} label="H" />
          <CountUnit value={timeLeft.minutes} label="M" />
          <CountUnit value={timeLeft.seconds} label="S" />
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-text-muted">{t("home.featured.ticketsSold")}</span>
          <span className="font-semibold">
            {draw.ticketsSold.toLocaleString()} / {draw.ticketPoolSize.toLocaleString()}
          </span>
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
        {t("home.featured.buyTicket", { price: draw.ticketPriceETB.toLocaleString() })}
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