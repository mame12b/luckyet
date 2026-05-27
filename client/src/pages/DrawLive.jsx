
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
          <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center text-burgundy font-extrabold">L</div>
          <span>LuckyET <span className="opacity-60 text-sm font-normal">· Live</span></span>
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

        {/* Idle */}
        {phase.name === "idle" && (
          <div className="text-center animate-pulse">
            <div className="text-6xl md:text-9xl mb-6">⏳</div>
            <div className="text-xl md:text-3xl font-bold mb-2">Standing by</div>
            <div className="text-sm md:text-base opacity-70">The draw will begin shortly</div>
            {state.prizes?.length > 0 && (
              <div className="mt-8 inline-block bg-white/10 backdrop-blur border border-white/20 rounded-xl px-6 py-3">
                <div className="text-xs uppercase tracking-wider opacity-60 mb-1">
                  {state.prizes.length > 1 ? `${state.prizes.length} prizes` : "Prize"}
                </div>
                <div className="text-lg md:text-2xl font-bold">{prizeTitle}</div>
                <div className="text-xs opacity-70 mt-1">{state.ticketsSold?.toLocaleString()} tickets in this draw</div>
              </div>
            )}
          </div>
        )}

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
        {phase.name === "reveal" && state.winners?.length > 0 && (
          <div className="w-full max-w-6xl animate-slideIn">
            <div className="text-center mb-8">
              <div className="text-4xl md:text-6xl mb-2">🎉</div>
              <div className="text-lg md:text-2xl uppercase tracking-[0.3em] text-amber-300 font-bold">
                {state.winners.length > 1 ? "Winners" : "Winner"}
              </div>
            </div>

            {/* Horizontal winner cards */}
            <div className={`grid gap-4 md:gap-6 ${
              state.winners.length === 1 ? "max-w-md mx-auto" :
              state.winners.length === 2 ? "md:grid-cols-2 max-w-3xl mx-auto" :
              "md:grid-cols-3"
            }`}>
              {[...state.winners].sort((a, b) => a.tier - b.tier).map((w, idx) => {
                const meta = TIER_META[w.tier] || TIER_META[1];
                const prize = state.prizes?.find((p) => p.tier === w.tier);
                return (
                  <div
                    key={w.tier}
                    className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 text-center animate-slideIn"
                    style={{ animationDelay: `${idx * 0.2}s` }}
                  >
                    {/* Ticket number on top */}
                    <div className="bg-gradient-to-br from-amber-400 to-amber-600 text-burgundy rounded-xl py-3 px-2 mb-4">
                      <div className="text-[10px] uppercase tracking-widest font-bold opacity-70">Winning Ticket</div>
                      <div className="font-mono text-xl md:text-2xl font-extrabold tracking-wider break-all">
                        {w.ticketNumber}
                      </div>
                    </div>

                    {/* Medal + tier */}
                    <div className="text-5xl mb-2">{meta.medal}</div>
                    <div className="text-xs uppercase tracking-widest text-amber-300 font-bold mb-1">
                      {meta.label}
                    </div>

                    {/* Prize name */}
                    <div className="font-bold text-lg mb-3 min-h-[3.5rem] flex items-center justify-center">
                      {prize?.name || "Prize"}
                    </div>

                    {/* Winner */}
                    <div className="border-t border-white/15 pt-3">
                      <div className="text-[10px] uppercase tracking-wider opacity-60 mb-0.5">Won by</div>
                      <div className="text-xl font-extrabold">{w.displayName}</div>
                      <div className="text-sm opacity-70">{w.country}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-center mt-8">
              <Link
                to={`/results/${state.slug}`}
                className="inline-block text-xs md:text-sm bg-white/10 backdrop-blur border border-white/30 px-5 py-2.5 rounded-full hover:bg-white/20 transition"
              >
                View quantum proof →
              </Link>
            </div>

            <Confetti />
          </div>
        )}
      </div>

      <div className="absolute bottom-4 left-0 right-0 text-center text-[10px] md:text-xs opacity-40 px-4 z-30">
        Powered by ANU Quantum Random Numbers · Result is verifiable on the proof page
      </div>
    </div>
  );
}

function computePhase(state) {
  if (!state) return { name: "loading", label: "" };

  if (state.status === "drawn" && state.winners?.length) {
    return { name: "reveal", label: "Results are in!", progress: 1 };
  }

  if (state.status === "drawing" && state.animation) {
    const p = state.animation.progress;
    if (p < 0.15) return { name: "connecting", label: "Connecting to quantum lab…", progress: p / 0.15 };
    if (p < 0.35) return { name: "receiving", label: "Quantum bytes incoming…", progress: (p - 0.15) / 0.20 };
    if (p < 0.70) return { name: "reel", label: "Drawing winners…", progress: (p - 0.35) / 0.35 };
    if (p < 0.97) return { name: "slowing", label: "Locking in results…", progress: (p - 0.70) / 0.27 };
    if (state.winners?.length) return { name: "reveal", label: "Results are in!", progress: 1 };
    return { name: "slowing", label: "Locking in results…", progress: 1 };
  }

  return { name: "idle", label: "Waiting to start", progress: 0 };
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
