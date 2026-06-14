
import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../lib/api";

const POLL_INTERVAL = 2000;
const SPIN_FRAME_MS = 60;

const TIER_META = {
  1: { label: "Grand Prize", medal: "🥇", ring: "from-amber-300 to-amber-500" },
  2: { label: "2nd Prize", medal: "🥈", ring: "from-slate-200 to-slate-400" },
  3: { label: "3rd Prize", medal: "🥉", ring: "from-amber-500 to-amber-700" },
  4: { label: "4th Prize", medal: "🎁", ring: "from-rose-300 to-rose-500" },
  5: { label: "5th Prize", medal: "🎁", ring: "from-rose-400 to-rose-600" },
};

export default function DrawLive() {
  const { slug } = useParams();
  const [state, setState] = useState(null);
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(true);
  const [displayNumber, setDisplayNumber] = useState("000000000000");
  const audioCtxRef = useRef(null);
  const tickRef = useRef(null);

  // Poll the server (synchronizes all viewers)
  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      try {
        const { data } = await api.get(`/draws/slug/${slug}/live-state`);
        if (mounted) setState(data);
      } catch (err) {
        if (mounted) setError(err.response?.data?.message || "Failed to load broadcast");
      }
    };
    poll();
    const interval = setInterval(poll, POLL_INTERVAL);
    return () => { mounted = false; clearInterval(interval); };
  }, [slug]);

  const phase = computePhase(state);

  // Slot machine ticker during spin phases
  useEffect(() => {
    if (phase.name !== "reel" && phase.name !== "slowing") {
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
      return;
    }
    const samples = state?.animation?.sampleTicketNumbers || [];
    if (samples.length === 0) return;

    const interval = phase.name === "slowing"
      ? SPIN_FRAME_MS + phase.progress * 380
      : SPIN_FRAME_MS;

    tickRef.current = setInterval(() => {
      setDisplayNumber(samples[Math.floor(Math.random() * samples.length)]);
      if (!muted) playTick();
    }, interval);

    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [phase.name, phase.progress, state?.animation?.sampleTicketNumbers, muted]);

  // On reveal, play fanfare
  useEffect(() => {
    if (phase.name === "reveal" && state?.winners?.length && !muted) {
      playFanfare();
    }
  }, [phase.name, state?.winners, muted]);

  function ensureAudio() {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtxRef.current;
  }
  function playTick() {
    try {
      const ctx = ensureAudio();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 800 + Math.random() * 400;
      gain.gain.value = 0.04;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.03);
    } catch {}
  }
  function playFanfare() {
    try {
      const ctx = ensureAudio();
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.5);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.5);
      });
    } catch {}
  }

  if (error) {
    return <FullScreen><div className="text-center text-white"><div className="text-5xl mb-4">⚠</div><p>{error}</p></div></FullScreen>;
  }
  if (!state) {
    return <FullScreen><div className="text-white animate-pulse text-2xl">Loading broadcast…</div></FullScreen>;
  }

  const prizeTitle = state.prizes?.[0]?.name || state.title;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-burgundy via-burgundy-dark to-black text-white overflow-auto">
      <Particles active={phase.name !== "idle" && phase.name !== "reveal"} />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-lg">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center text-burgundy font-extrabold">E</div>
          <span>EdilPlay <span className="opacity-60 text-sm font-normal">· Live</span></span>
        </div>
        <button
          onClick={() => setMuted(!muted)}
          className="text-xs bg-white/10 backdrop-blur border border-white/20 px-3 py-1.5 rounded-full hover:bg-white/20 transition"
        >
          {muted ? "🔇 Sound off" : "🔊 Sound on"}
        </button>
      </div>

      {/* Stage */}
      <div className="min-h-full flex flex-col items-center justify-center px-6 py-20 z-20 relative">
        {/* Title */}
        <div className="text-center mb-8">
          <div className="text-xs md:text-sm uppercase tracking-[0.3em] text-amber-300 font-bold mb-1">
            {state.title}
          </div>
          <div className="text-base md:text-2xl font-semibold opacity-90">{phase.label}</div>
        </div>

{/* Idle / standby — rich teaser */}
{phase.name === "idle" && <StandbyScreen state={state} />}

        {/* Connecting */}
        {phase.name === "connecting" && (
          <div className="text-center">
            <div className="relative w-32 h-32 md:w-48 md:h-48 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-amber-400/30 rounded-full animate-ping"></div>
              <div className="absolute inset-4 border-4 border-amber-400/50 rounded-full animate-ping" style={{ animationDelay: "0.3s" }}></div>
              <div className="absolute inset-0 flex items-center justify-center text-5xl md:text-7xl">⚛️</div>
            </div>
            <div className="text-base md:text-xl opacity-80">Connecting to quantum randomness source</div>
          </div>
        )}

        {/* Receiving */}
        {phase.name === "receiving" && (
          <div className="text-center w-full max-w-2xl">
            <div className="text-5xl md:text-7xl mb-6">📡</div>
            <div className="text-base md:text-xl opacity-80 mb-4">Receiving quantum randomness</div>
            <QuantumBytes progress={phase.progress} />
          </div>
        )}

        {/* Reel / slowing */}
        {(phase.name === "reel" || phase.name === "slowing") && (
          <div className="text-center w-full">
            <div className="text-sm md:text-base opacity-80 mb-6">
              {phase.name === "reel" ? "Selecting winners…" : "Locking in results…"}
            </div>
            <SlotDisplay value={displayNumber} spinning />
          </div>
        )}

        {/* REVEAL — all winners horizontally */}
        {(phase.name === "reveal" || (phase.revealedTiers?.length > 0)) && state.winners?.length > 0 && (
  <div className="w-full max-w-6xl animate-slideIn">
    <div className="text-center mb-8">
      <div className="text-4xl md:text-6xl mb-2">🎉</div>
      <div className="text-lg md:text-2xl uppercase tracking-[0.3em] text-amber-300 font-bold">
        {phase.revealedTiers?.length === state.winners.length
          ? (state.winners.length > 1 ? "Winners" : "Winner")
          : `${ordinalSuffix(phase.currentTier)} prize`}
      </div>
    </div>

    <div className={`grid gap-4 md:gap-6 ${
      state.winners.length === 1 ? "max-w-md mx-auto" :
      state.winners.length === 2 ? "md:grid-cols-2 max-w-3xl mx-auto" :
      "md:grid-cols-3"
    }`}>
      {[...state.winners]
        .sort((a, b) => a.tier - b.tier)
        .map((w, idx) => {
          // Only show this card if its tier has been revealed
          const isRevealed = phase.revealedTiers?.includes(w.tier);
          if (!isRevealed) {
            // Placeholder card — keeps layout stable
            return (
              <div key={w.tier} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center opacity-30">
                <div className="text-5xl mb-2">❓</div>
                <div className="text-xs uppercase tracking-widest opacity-60 font-bold">
                  Pending…
                </div>
              </div>
            );
          }
          const meta = TIER_META[w.tier] || TIER_META[1];
          const prize = state.prizes?.find((p) => p.tier === w.tier);
          return (
            <div
              key={w.tier}
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 text-center animate-slideIn"
              style={{ animationDelay: `${idx * 0.2}s` }}
            >
              <div className="bg-gradient-to-br from-amber-400 to-amber-600 text-burgundy rounded-xl py-3 px-2 mb-4">
                <div className="text-[10px] uppercase tracking-widest font-bold opacity-70">Winning Ticket</div>
                <div className="font-mono text-2xl md:text-2xl font-extrabold tracking-wider break-all">
                  {w.ticketNumber}
                </div>
              </div>
              <div className="text-5xl mb-2">{meta.medal}</div>
              <div className="text-xs uppercase tracking-widest text-amber-300 font-bold mb-1">
                {meta.label}
              </div>
              <div className="font-bold text-lg mb-3 min-h-[3.5rem] flex items-center justify-center">
                {prize?.name || "Prize"}
              </div>
              <div className="border-t border-white/15 pt-3">
                <div className="text-[10px] uppercase tracking-wider opacity-60 mb-0.5">Won by</div>
                <div className="text-xl font-extrabold">{w.displayName}</div>
                <div className="text-sm opacity-70">{w.country}</div>
              </div>
            </div>
          );
        })}
    </div>

    {phase.revealedTiers?.length === state.winners.length && (
      <>
        <div className="text-center mt-8">
          <Link
            to={`/results/${state.slug}`}
            className="inline-block text-xs md:text-sm bg-white/10 backdrop-blur border border-white/30 px-5 py-2.5 rounded-full hover:bg-white/20 transition"
          >
            View quantum proof →
          </Link>
        </div>
        <Confetti />
      </>
    )}
  </div>
)}
      </div>
    </div>
  );
}

function computePhase(state) {
  if (!state) return { name: "loading", label: "" };

  if (state.status === "drawn" && state.winners?.length) {
    return { name: "reveal", label: "Results are in!", progress: 1, revealedTiers: state.winners.map(w => w.tier) };
  }

  if (state.status === "drawing" && state.animation) {
    const elapsed = state.animation.elapsedMs;
    const tierDurations = state.animation.tierDurations || [];

    // Phase timing constants
    const INTRO_MS = 4000; // connecting + receiving combined

    if (elapsed < INTRO_MS * 0.4) {
      return { name: "connecting", label: "Connecting to quantum lab…", progress: elapsed / (INTRO_MS * 0.4) };
    }
    if (elapsed < INTRO_MS) {
      return { name: "receiving", label: "Quantum bytes incoming…", progress: (elapsed - INTRO_MS * 0.4) / (INTRO_MS * 0.6) };
    }

    // Now we're in tier-reveal territory
    // REVEAL ORDER: highest tier first (3rd → 2nd → 1st), so iterate descending
    const reversedTiers = [...tierDurations].sort((a, b) => b.tier - a.tier);

    let cursor = INTRO_MS;
    const revealedTiers = [];
    for (const td of reversedTiers) {
      const tierStart = cursor;
      const tierEnd = cursor + td.durationMs;

      if (elapsed >= tierEnd) {
        // This tier is fully done — already revealed
        revealedTiers.push(td.tier);
        cursor = tierEnd;
        continue;
      }

      // We're inside THIS tier's animation
      const tierProgress = (elapsed - tierStart) / td.durationMs;
      // First 60% = spin, next 30% = slow, last 10% = reveal moment
      if (tierProgress < 0.6) {
        return { name: "reel", label: `Drawing ${ordinalSuffix(td.tier)} prize winner…`, progress: tierProgress / 0.6, currentTier: td.tier, revealedTiers };
      }
      if (tierProgress < 0.9) {
        return { name: "slowing", label: `Locking in ${ordinalSuffix(td.tier)} winner…`, progress: (tierProgress - 0.6) / 0.3, currentTier: td.tier, revealedTiers };
      }
      // Reveal moment for this tier — add it to revealed
      return { name: "reveal", label: `${ordinalSuffix(td.tier)} prize winner!`, progress: 1, currentTier: td.tier, revealedTiers: [...revealedTiers, td.tier] };
    }

    // All tiers revealed
    return { name: "reveal", label: "All results are in!", progress: 1, revealedTiers: tierDurations.map(t => t.tier) };
  }

  return { name: "idle", label: "Waiting to start", progress: 0 };
}

function ordinalSuffix(n) {
  if (n === 1) return "Grand";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

// Helper to keep code clean
function getAnimationPhase(p, winners) {
  if (p < 0.15) return { name: "connecting", label: "Connecting to quantum lab…", progress: p / 0.15 };
  if (p < 0.35) return { name: "receiving", label: "Quantum bytes incoming…", progress: (p - 0.15) / 0.20 };
  if (p < 0.70) return { name: "reel", label: "Drawing winners…", progress: (p - 0.35) / 0.35 };
  if (p < 0.97) return { name: "slowing", label: "Locking in results…", progress: (p - 0.70) / 0.27 };
  if (winners?.length) return { name: "reveal", label: "Results are in!", progress: 1 };
  return { name: "slowing", label: "Locking in results…", progress: 1 };
}

function SlotDisplay({ value, spinning }) {
  const digits = (value || "000000000000").padStart(12, "0").split("");
  return (
    <div className="flex justify-center gap-1 md:gap-2 flex-wrap max-w-3xl mx-auto">
      {digits.map((d, i) => (
        <div
          key={i}
          className={`bg-white/10 backdrop-blur border border-white/20 text-white
            w-9 h-13 md:w-14 md:h-20 flex items-center justify-center
            text-2xl md:text-5xl font-mono font-extrabold rounded-lg
            ${spinning ? "animate-pulse" : ""}`}
        >
          {d}
        </div>
      ))}
    </div>
  );
}

function QuantumBytes({ progress }) {
  const total = 32;
  const arrived = Math.floor(total * progress);
  const bytes = Array.from({ length: total }, (_, i) =>
    i < arrived ? Math.floor(Math.random() * 256).toString(16).padStart(2, "0") : "--"
  );
  return (
    <div className="font-mono text-xs md:text-sm bg-black/40 border border-white/10 rounded-lg p-3 md:p-4 break-all leading-relaxed">
      {bytes.map((b, i) => (
        <span key={i} className={`inline-block mr-1 ${b === "--" ? "text-white/20" : "text-amber-300"}`}>{b}</span>
      ))}
    </div>
  );
}

function Particles({ active }) {
  if (!active) return null;
  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      {Array.from({ length: 30 }).map((_, i) => (
        <div key={i} className="absolute w-1 h-1 bg-amber-400 rounded-full opacity-60"
          style={{
            left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
            animation: `floatp ${3 + Math.random() * 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 2}s`,
          }} />
      ))}
      <style>{`@keyframes floatp {
        0%,100% { transform: translateY(0) scale(1); opacity: 0.6; }
        50% { transform: translateY(-30px) scale(1.5); opacity: 1; }
      }`}</style>
    </div>
  );
}

function Confetti() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 80 }).map((_, i) => {
        const colors = ["bg-amber-400", "bg-amber-300", "bg-white", "bg-rose-400"];
        return (
          <div key={i} className={`absolute w-2 h-3 ${colors[i % colors.length]} rounded-sm`}
            style={{
              left: `${Math.random() * 100}%`, top: "-20px",
              animation: `confettifall ${2 + Math.random() * 2}s ease-out forwards`,
              animationDelay: `${Math.random() * 0.6}s`,
              transform: `rotate(${Math.random() * 360}deg)`,
            }} />
        );
      })}
      <style>{`@keyframes confettifall {
        to { transform: translateY(100vh) rotate(720deg); opacity: 0; }
      }`}</style>
    </div>
  );
}

function FullScreen({ children }) {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-burgundy via-burgundy-dark to-black flex items-center justify-center">
      {children}
    </div>
  );
}

/* ============================================================
   Standby screen — shown before broadcast starts.
   Rich teaser with countdown, prize hero, Buy CTA, Close.
============================================================ */
function StandbyScreen({ state }) {
  const grand = state.prizes?.[0];
  const hasMultiplePrizes = state.prizes?.length > 1;
  const canBuy = state.status === "active";
  const drawDate = state.drawDate;

  const [timeLeft, setTimeLeft] = useState(() => computeTimeLeft(drawDate));
  useEffect(() => {
    if (!drawDate) return;
    const t = setInterval(() => setTimeLeft(computeTimeLeft(drawDate)), 1000);
    return () => clearInterval(t);
  }, [drawDate]);

  return (
    <div className="w-full max-w-3xl mx-auto pb-12 px-2 animate-slideIn">
      {/* Close button — fixed top right */}
      <Link
        to="/draws"
        className="fixed top-4 right-4 z-40 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center hover:bg-white/20 transition text-white"
        aria-label="Close"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        ✕
      </Link>

      {/* Standby badge */}
      <div className="text-center mb-4">
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-amber-300/30 rounded-full px-4 py-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          <span className="text-xs uppercase tracking-widest font-bold text-amber-300">Broadcast standing by</span>
        </div>
      </div>

      {/* Hero prize teaser */}
      {grand && (
        <div className="bg-white/10 backdrop-blur-md border border-amber-300/40 rounded-2xl p-5 sm:p-7 mb-5 text-center shadow-2xl">
          {grand.imageUrl && (
            <img
              src={grand.imageUrl}
              alt={grand.name}
              className="w-32 h-32 sm:w-40 sm:h-40 object-contain mx-auto mb-3 drop-shadow-2xl"
              onError={(e) => { e.target.style.display = "none"; }}
            />
          )}
          <div className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-amber-300 font-bold mb-1">
            Grand Prize
          </div>
          <div className="text-2xl sm:text-4xl font-extrabold mb-1 leading-tight">{grand.name}</div>
          {grand.estimatedValueETB > 0 && (
            <div className="text-base sm:text-xl font-bold bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
              + {grand.estimatedValueETB.toLocaleString()} ETB value
            </div>
          )}
          {hasMultiplePrizes && (
            <div className="text-xs opacity-70 mt-2">
              + {state.prizes.length - 1} more {state.prizes.length === 2 ? "prize" : "prizes"} below
            </div>
          )}
        </div>
      )}

      {/* Countdown to draw date */}
      {drawDate && !timeLeft.expired && (
        <div className="bg-gradient-to-br from-burgundy/40 to-black/40 backdrop-blur border border-white/15 rounded-2xl p-4 sm:p-5 mb-5">
          <div className="text-[10px] sm:text-xs uppercase tracking-widest text-amber-300 font-bold mb-2 sm:mb-3 text-center">
            Broadcast begins in
          </div>
          <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
            <CountUnit value={timeLeft.days} label="D" />
            <CountUnit value={timeLeft.hours} label="H" />
            <CountUnit value={timeLeft.minutes} label="M" />
            <CountUnit value={timeLeft.seconds} label="S" />
          </div>
        </div>
      )}
      {drawDate && timeLeft.expired && (
        <div className="bg-white/10 backdrop-blur border border-amber-300/30 rounded-xl p-4 mb-5 text-center">
          <div className="text-sm sm:text-base font-bold text-amber-300">⏰ Draw time has arrived</div>
          <div className="text-xs opacity-80 mt-1">Standing by for the host to start the broadcast…</div>
        </div>
      )}

      {/* Sample ticket numbers (subtle teaser) */}
      {state.animation?.sampleTicketNumbers?.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4 mb-5 overflow-hidden">
          <div className="text-[10px] uppercase tracking-widest opacity-50 text-center mb-2">
            Tickets in the pool
          </div>
          <div className="flex flex-wrap justify-center gap-2 opacity-60">
            {state.animation.sampleTicketNumbers.slice(0, 8).map((n, i) => (
              <span key={i} className="font-mono text-xs sm:text-sm bg-white/5 px-2 py-1 rounded">
                {n}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tickets sold info */}
      <div className="text-center mb-5 text-sm opacity-70">
        🎟️ {state.ticketsSold?.toLocaleString() || 0} tickets sold in this draw
      </div>

      {/* Buy CTA (only if draw is still active) */}
      {canBuy && (
        <Link
          to={`/draws/${state.slug}/buy`}
          className="block max-w-md mx-auto text-center bg-gradient-to-r from-amber-400 to-amber-600 text-burgundy font-extrabold py-4 px-6 rounded-xl shadow-2xl hover:from-amber-500 hover:to-amber-700 transition active:scale-95 mb-4"
        >
          🎟️ Buy a ticket before it's too late →
        </Link>
      )}

      {/* Reassurance */}
      <div className="text-center text-xs opacity-50 mt-2 px-4">
        Stay on this page — the broadcast will start automatically when the host begins.
      </div>
    </div>
  );
}

function CountUnit({ value, label }) {
  return (
    <div className="bg-white/10 rounded-md py-2 sm:py-3 text-center">
      <div className="text-xl sm:text-3xl font-extrabold font-mono leading-none">{String(value).padStart(2, "0")}</div>
      <div className="text-[9px] sm:text-[10px] uppercase tracking-wider opacity-70 mt-1">{label}</div>
    </div>
  );
}

function computeTimeLeft(drawDate) {
  if (!drawDate) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  const now = Date.now();
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
