
import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../lib/api";

const POLL_INTERVAL = 2000;
const SPIN_FRAME_MS = 50; // how fast numbers flash during slot machine

export default function DrawLive() {
  const { slug } = useParams();
  const [state, setState] = useState(null);
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(true);
  const [displayNumber, setDisplayNumber] = useState("000000000000");
  const audioCtxRef = useRef(null);
  const tickIntervalRef = useRef(null);

  // Poll state from server (synchronizes all viewers)
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

  // Compute current phase from animation elapsed time
  const phase = computePhase(state);

  // Slot machine ticker — runs during reel phase
  useEffect(() => {
    if (phase.name !== "reel" && phase.name !== "slowing") {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = null;
      }
      return;
    }

    const samples = state?.animation?.sampleTicketNumbers || [];
    if (samples.length === 0) return;

    // Speed slows as we approach the end
    const interval = phase.name === "slowing"
      ? SPIN_FRAME_MS + (phase.progress * 400)
      : SPIN_FRAME_MS;

    tickIntervalRef.current = setInterval(() => {
      const random = samples[Math.floor(Math.random() * samples.length)];
      setDisplayNumber(random);
      if (!muted) playTick();
    }, interval);

    return () => {
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
    };
  }, [phase.name, phase.progress, state?.animation?.sampleTicketNumbers, muted]);

  // On winner reveal, lock to winner number + play fanfare
  useEffect(() => {
    if (phase.name === "reveal" && state?.winner?.ticketNumber) {
      setDisplayNumber(state.winner.ticketNumber);
      if (!muted) playFanfare();
    }
  }, [phase.name, state?.winner?.ticketNumber, muted]);

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
      gain.gain.value = 0.05;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.03);
    } catch {}
  }

  function playFanfare() {
    try {
      const ctx = ensureAudio();
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.4);
      });
    } catch {}
  }

  if (error) {
    return <FullScreen><div className="text-center text-white"><div className="text-5xl mb-4">⚠</div><p>{error}</p></div></FullScreen>;
  }

  if (!state) {
    return <FullScreen><div className="text-white animate-pulse text-2xl">Loading broadcast…</div></FullScreen>;
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-burgundy via-burgundy-dark to-black text-white overflow-hidden">
      {/* Animated background particles */}
      <Particles active={phase.name !== "idle" && phase.name !== "reveal"} />

      {/* Top brand */}
      <div className="absolute top-0 left-0 right-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-lg">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center text-burgundy font-extrabold shadow-gold">L</div>
          <span>LuckyET <span className="opacity-60 text-sm font-normal">· Live</span></span>
        </div>
        <button
          onClick={() => setMuted(!muted)}
          className="text-xs bg-white/10 backdrop-blur border border-white/20 px-3 py-1.5 rounded-full hover:bg-white/20 transition"
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? "🔇 Sound off" : "🔊 Sound on"}
        </button>
      </div>

      {/* Main stage */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 z-20">
        {/* Phase label */}
        <div className="text-center mb-6 md:mb-10 min-h-[60px]">
          <div className="text-xs md:text-sm uppercase tracking-[0.3em] text-amber-300 font-bold mb-1">
            {state.title}
          </div>
          <div className="text-base md:text-2xl font-semibold opacity-90">
            {phase.label}
          </div>
        </div>

        {/* Phase: idle (waiting for admin) */}
        {phase.name === "idle" && (
          <div className="text-center animate-pulse">
            <div className="text-6xl md:text-9xl mb-6">⏳</div>
            <div className="text-xl md:text-3xl font-bold mb-2">Standing by</div>
            <div className="text-sm md:text-base opacity-70">The draw will begin shortly</div>
            {state.prizeName && (
              <div className="mt-8 inline-block bg-white/10 backdrop-blur border border-white/20 rounded-xl px-6 py-3">
                <div className="text-xs uppercase tracking-wider opacity-60 mb-1">Prize</div>
                <div className="text-lg md:text-2xl font-bold">{state.prizeName}</div>
                <div className="text-xs opacity-70 mt-1">{state.ticketsSold.toLocaleString()} tickets in this draw</div>
              </div>
            )}
          </div>
        )}

        {/* Phase: connecting */}
        {phase.name === "connecting" && (
          <div className="text-center">
            <div className="relative w-32 h-32 md:w-48 md:h-48 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-amber-400/30 rounded-full animate-ping"></div>
              <div className="absolute inset-4 border-4 border-amber-400/50 rounded-full animate-ping" style={{ animationDelay: "0.3s" }}></div>
              <div className="absolute inset-0 flex items-center justify-center text-5xl md:text-7xl">⚛️</div>
            </div>
            <div className="text-base md:text-xl opacity-80">Establishing secure connection to</div>
            <div className="text-lg md:text-2xl font-bold text-amber-300 mt-1">ANU Quantum Lab · Canberra</div>
          </div>
        )}

        {/* Phase: receiving quantum bytes */}
        {phase.name === "receiving" && (
          <div className="text-center w-full max-w-2xl">
            <div className="text-5xl md:text-7xl mb-6">📡</div>
            <div className="text-base md:text-xl opacity-80 mb-4">Receiving quantum randomness</div>
            <QuantumBytesDisplay progress={phase.progress} />
            <div className="text-xs md:text-sm opacity-60 mt-3 font-mono">256 bits · True randomness from quantum vacuum</div>
          </div>
        )}

        {/* Phase: reel (slot machine spinning) */}
        {(phase.name === "reel" || phase.name === "slowing") && (
          <div className="text-center w-full">
            <div className="text-sm md:text-base opacity-80 mb-6">
              {phase.name === "reel" ? "Computing winner index…" : "Locking in winner…"}
            </div>
            <SlotDisplay value={displayNumber} spinning={true} />
          </div>
        )}

        {/* Phase: reveal */}
        {phase.name === "reveal" && state.winner && (
          <div className="text-center w-full animate-slideIn">
            <div className="text-4xl md:text-7xl mb-4">🏆</div>
            <div className="text-base md:text-xl uppercase tracking-[0.3em] text-amber-300 font-bold mb-6">Winner</div>
            <SlotDisplay value={displayNumber} spinning={false} highlight={true} />
            <div className="mt-8 inline-block bg-gradient-to-br from-amber-400 to-amber-600 text-burgundy px-8 py-4 rounded-2xl shadow-gold">
              <div className="text-xs uppercase tracking-wider font-bold opacity-70 mb-1">Won by</div>
              <div className="text-2xl md:text-4xl font-extrabold">{state.winner.displayName}</div>
              <div className="text-sm font-semibold opacity-80 mt-1">{state.winner.country}</div>
            </div>
            <div className="mt-6">
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

      {/* Bottom honest disclosure */}
      <div className="absolute bottom-4 left-0 right-0 text-center text-[10px] md:text-xs opacity-40 px-4 z-30">
        Powered by ANU Quantum Random Numbers · Result is verifiable on the proof page
      </div>
    </div>
  );
}

/* ============ COMPUTE PHASE FROM SERVER STATE ============ */
function computePhase(state) {
  if (!state) return { name: "loading", label: "" };

  if (state.status === "drawn" && state.winner) {
    return { name: "reveal", label: "Winner selected!", progress: 1 };
  }

  if (state.status === "drawing" && state.animation) {
    const p = state.animation.progress;
    // 0-15% — connecting
    if (p < 0.15) return { name: "connecting", label: "Connecting to ANU Quantum Lab…", progress: p / 0.15 };
    // 15-35% — receiving
    if (p < 0.35) return { name: "receiving", label: "Quantum bytes incoming…", progress: (p - 0.15) / 0.20 };
    // 35-70% — reel spinning
    if (p < 0.70) return { name: "reel", label: "Spinning the wheel…", progress: (p - 0.35) / 0.35 };
    // 70-95% — slowing
    if (p < 0.95) return { name: "slowing", label: "Locking in winner…", progress: (p - 0.70) / 0.25 };
    // 95-100% — reveal
    return { name: "reveal", label: "Winner selected!", progress: 1 };
  }

  return { name: "idle", label: "Waiting to start", progress: 0 };
}

/* ============ SLOT DISPLAY ============ */
function SlotDisplay({ value, spinning, highlight }) {
  const digits = (value || "000000000000").padStart(12, "0").split("");
  return (
    <div className="flex justify-center gap-1 md:gap-2 flex-wrap max-w-3xl mx-auto">
      {digits.map((d, i) => (
        <div
          key={i}
          className={`
            ${highlight
              ? "bg-gradient-to-br from-amber-400 to-amber-600 text-burgundy shadow-gold"
              : "bg-white/10 backdrop-blur border border-white/20 text-white"}
            w-10 h-14 md:w-14 md:h-20 lg:w-16 lg:h-24
            flex items-center justify-center
            text-3xl md:text-5xl lg:text-6xl font-mono font-extrabold
            rounded-lg
            transition-all duration-300
            ${spinning ? "animate-pulse" : ""}
          `}
        >
          {d}
        </div>
      ))}
    </div>
  );
}

/* ============ QUANTUM BYTES VISUALIZATION ============ */
function QuantumBytesDisplay({ progress }) {
  const totalBytes = 32;
  const arrived = Math.floor(totalBytes * progress);
  const bytes = Array.from({ length: totalBytes }, (_, i) => {
    if (i < arrived) {
      return Math.floor(Math.random() * 256).toString(16).padStart(2, "0");
    }
    return "--";
  });
  return (
    <div className="font-mono text-xs md:text-sm bg-black/40 border border-white/10 rounded-lg p-3 md:p-4 break-all leading-relaxed">
      {bytes.map((b, i) => (
        <span
          key={i}
          className={`inline-block mr-1 ${
            b === "--" ? "text-white/20" : "text-amber-300"
          }`}
        >
          {b}
        </span>
      ))}
    </div>
  );
}

/* ============ PARTICLES ============ */
function Particles({ active }) {
  if (!active) return null;
  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-amber-400 rounded-full opacity-60"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.6; }
          50% { transform: translateY(-30px) scale(1.5); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ============ CONFETTI ============ */
function Confetti() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 80 }).map((_, i) => {
        const colors = ["bg-amber-400", "bg-amber-300", "bg-white", "bg-rose-400"];
        const color = colors[i % colors.length];
        return (
          <div
            key={i}
            className={`absolute w-2 h-3 ${color} rounded-sm`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `-20px`,
              animation: `confetti ${2 + Math.random() * 2}s ease-out forwards`,
              animationDelay: `${Math.random() * 0.5}s`,
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes confetti {
          to {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

/* ============ HELPER ============ */
function FullScreen({ children }) {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-burgundy via-burgundy-dark to-black flex items-center justify-center">
      {children}
    </div>
  );
}
