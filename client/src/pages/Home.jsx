
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const SLIDES = [
  {
    eyebrow: "🎰 Live now",
    title: "iPhone 15 Pro Max",
    accent: "+ 100,000 ETB",
    bodyShort: "Be among the first 5,000 players.",
    bodyLong: "Every ticket is quantum-verified — impossible to rig.",
    cta: { label: "View this draw", to: "/draws" },
    bg: "from-amber-50 via-white to-burgundy-light",
    badge: "Active",
  },
  {
    eyebrow: "🏆 Coming soon",
    title: "Brand New Car",
    accent: "Suzuki Dzire 2026",
    bodyShort: "Same trusted draw, bigger prize.",
    bodyLong: "Reserve your spot when sales open.",
    cta: { label: "Browse all draws", to: "/draws" },
    bg: "from-burgundy-light via-white to-amber-50",
    badge: "Soon",
  },
  {
    eyebrow: "🏠 Final draw",
    title: "House in Addis",
    accent: "Fully furnished",
    bodyShort: "The dream prize.",
    bodyLong: "Three-bedroom apartment with full legal paperwork.",
    cta: { label: "Get notified", to: "/register" },
    bg: "from-amber-50 via-white to-amber-100",
    badge: "Upcoming",
  },
];

export default function Home() {
  const [slide, setSlide] = useState(0);

  // Auto-rotate every 6 seconds
  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 6000);
    return () => clearInterval(t);
  }, []);

  const current = SLIDES[slide];

  return (
    <div>
      {/* HERO CAROUSEL */}
      <section className={`relative bg-gradient-to-br ${current.bg} transition-all duration-700 overflow-hidden`}>
        <div className="bg-pattern absolute inset-0 opacity-50"></div>

        <div className="relative max-w-7xl mx-auto px-6 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div key={slide} className="animate-slideIn">
              <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-border text-burgundy text-xs font-semibold px-3 py-1.5 rounded-full mb-5 shadow-soft">
                {current.eyebrow}
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold leading-[1.05] tracking-tight mb-3">
                {current.title}<br />
                <span className="text-gradient-gold">{current.accent}</span>
              </h1>
              <p className="text-text-muted text-base sm:text-lg leading-relaxed mb-6 sm:mb-7 max-w-lg">
              <span className="font-semibold text-text">{current.bodyShort}</span>{" "}
              <span className="hidden sm:inline">{current.bodyLong}</span>
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to={current.cta.to}
                  className="bg-brand text-white font-semibold px-6 py-3 rounded-lg hover:bg-brand-dark transition shadow-gold text-sm"
                >
                  {current.cta.label} →
                </Link>
                <Link
                  to="/how-it-works"
                  className="bg-white border border-border-strong text-text font-semibold px-6 py-3 rounded-lg hover:bg-surface transition text-sm"
                >
                  How it works
                </Link>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-8 text-xs text-text-muted">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-success rounded-full"></span>
                  ANU Quantum Lab partner
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-success rounded-full"></span>
                  Verifiable draws
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-burgundy rounded-full"></span>
                  18+ only
                </div>
              </div>
            </div>

            {/* Live draw card */}
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-br from-brand to-burgundy rounded-2xl opacity-20 blur-lg"></div>
              <div className="relative bg-white border border-border rounded-2xl p-6 shadow-card">
                <div className="flex items-center justify-between mb-5">
                  <span className="text-xs font-semibold text-burgundy uppercase tracking-wider">Live now</span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-success bg-success-light px-2.5 py-1 rounded-full font-semibold">
                    <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse"></span>
                    {current.badge}
                  </span>
                </div>

                <div className="mb-5">
                  <div className="text-xs text-text-muted mb-1">Current jackpot prize</div>
                  <h3 className="text-2xl font-bold">{current.title.replace("Win ", "")}</h3>
                  <div className="text-gradient-gold text-2xl font-extrabold">{current.accent}</div>
                </div>

                <div className="space-y-4 pt-4 border-t border-border">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-text-muted">Tickets sold</span>
                      <span className="font-semibold">0 / 5,000</span>
                    </div>
                    <div className="w-full h-2 bg-surface-2 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-brand to-brand-dark rounded-full" style={{ width: "0%" }}></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-text-muted">Ticket price</div>
                      <div className="font-bold text-lg">500 <span className="text-sm font-normal text-text-muted">ETB</span></div>
                      <div className="text-xs text-text-faint">≈ 16 AED</div>
                    </div>
                    <div>
                      <div className="text-xs text-text-muted">Closes</div>
                      <div className="font-bold text-lg">Jul 14</div>
                      <div className="text-xs text-text-faint">2026</div>
                    </div>
                  </div>
                </div>

                <Link to="/draws" className="block text-center w-full bg-burgundy text-white font-semibold py-3 rounded-lg mt-5 hover:bg-burgundy-dark transition shadow-burgundy text-sm">
                  Buy a ticket →
                </Link>
              </div>
            </div>
          </div>

          {/* Slide dots */}
          <div className="flex justify-center gap-2 mt-10">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === slide ? "w-10 bg-brand" : "w-2 bg-border-strong hover:bg-text-faint"
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* PRICE TIERS STRIP (like Ethio Lottery's tiers) */}
      <section className="bg-burgundy text-white py-8 md:py-10 px-6">
        <div className="max-w-7xl mx-auto grid sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-4 text-center">
          {[
            { qty: "1", label: "Ticket", price: "500 ETB", hint: "Single entry" },
            { qty: "5", label: "Tickets", price: "2,500 ETB", hint: "Better odds" },
            { qty: "10", label: "Tickets", price: "5,000 ETB", hint: "Best value" },
            { qty: "20", label: "Tickets", price: "10,000 ETB", hint: "Group play" },
          ].map((t, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="text-amber-300 text-4xl font-extrabold leading-none mb-1">{t.qty}</div>
              <div className="text-sm uppercase tracking-wider opacity-80 mb-2">{t.label}</div>
              <div className="text-white text-lg font-bold">{t.price}</div>
              <div className="text-amber-200 text-xs mt-0.5">{t.hint}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-surface py-16 md:py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs font-bold text-burgundy uppercase tracking-widest mb-3">How it works</div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Four steps to win</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-5">
            {[
              { n: "01", t: "Sign up", d: "Create your account in 60 seconds. Phone + email.", emoji: "✍️" },
              { n: "02", t: "Buy a ticket", d: "Pay via Botim, bank transfer, or Telebirr.", emoji: "🎫" },
              { n: "03", t: "Get verified", d: "Upload your receipt. Verified within 24 hours.", emoji: "✓" },
              { n: "04", t: "Win", d: "Quantum randomness picks the winner. Fully verifiable.", emoji: "🏆" },
            ].map((s, i) => (
              <div key={s.n} className="relative">
                {i < 3 && (
                  <div className="hidden md:block absolute top-7 left-full w-full h-px border-t-2 border-dashed border-border-strong -z-0"></div>
                )}
                <div className="relative bg-white border border-border rounded-xl p-5 hover:shadow-card hover:border-brand transition">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono text-brand font-bold">{s.n}</span>
                    <span className="text-xl">{s.emoji}</span>
                  </div>
                  <div className="font-bold mb-1">{s.t}</div>
                  <div className="text-sm text-text-muted leading-relaxed">{s.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RECENT WINNERS (placeholders) */}
      <section className="px-6 py-16 md:py-20 max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-10 flex-wrap gap-3">
          <div>
            <div className="text-xs font-bold text-burgundy uppercase tracking-widest mb-2">Recent winners</div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Real winners, real prizes</h2>
            <p className="text-text-muted mt-2 text-sm">Verified quantum draws. Names shown with consent.</p>
          </div>
          <span className="text-xs bg-warning-light text-warning font-semibold px-3 py-1.5 rounded-full">
            Sample previews · First real winners after Draw #1
          </span>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {[
            { name: "Sample", initial: "S", prize: "iPhone 15 Pro Max + 100k ETB", from: "Dubai, UAE", date: "Coming soon", ticket: "—" },
            { name: "Sample", initial: "S", prize: "Suzuki Dzire 2026", from: "Riyadh, KSA", date: "Coming soon", ticket: "—" },
            { name: "Sample", initial: "S", prize: "Apartment in Addis", from: "Doha, QA", date: "Coming soon", ticket: "—" },
          ].map((w, i) => (
            <div key={i} className="bg-white border border-border rounded-xl p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-brand-light to-transparent rounded-bl-full opacity-50"></div>
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-brand to-brand-dark rounded-full flex items-center justify-center text-white text-xl font-bold shadow-gold">
                    {w.initial}
                  </div>
                  <div>
                    <div className="font-bold">{w.name}</div>
                    <div className="text-xs text-text-muted">{w.from}</div>
                  </div>
                </div>
                <div className="border-t border-border pt-4">
                  <div className="text-xs text-text-muted uppercase tracking-wide mb-1">Won</div>
                  <div className="font-semibold mb-2">{w.prize}</div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted">{w.date}</span>
                    <span className="font-mono text-text-faint">#{w.ticket}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TRUST SECTION */}
      <section className="bg-surface py-16 md:py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs font-bold text-burgundy uppercase tracking-widest mb-3">Why LuckyET</div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Built on trust. Powered by physics.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                emoji: "⚛️",
                title: "Quantum-verifiable",
                desc: "Every winner is picked using true randomness from the Australian National University quantum lab. The math is public — anyone can verify it.",
              },
              {
                emoji: "🌍",
                title: "Built for diaspora",
                desc: "Pay the way you already pay — Botim, CBE, Telebirr. Available in English, አማርኛ, and ትግርኛ. Made by Habesha, for Habesha.",
              },
              {
                emoji: "📋",
                title: "Transparent operations",
                desc: "Live ticket counter, public draw history, real winner stories, audit log of every action. Every step on the record.",
              },
            ].map((b) => (
              <div key={b.title} className="bg-white border border-border rounded-xl p-6 hover:border-brand hover:shadow-card transition">
                <div className="text-3xl mb-3">{b.emoji}</div>
                <h3 className="text-lg font-bold mb-2">{b.title}</h3>
                <p className="text-text-muted text-sm leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative bg-gradient-to-br from-burgundy via-burgundy-dark to-burgundy text-white px-6 py-16 overflow-hidden">
        <div className="bg-pattern absolute inset-0 opacity-20"></div>
        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-block bg-brand text-burgundy text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-5">
            🎰 Join now
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold mb-4 leading-tight">
            Your luck starts<br />
            <span className="text-amber-300">with one ticket</span>.
          </h2>
          <p className="text-white/80 mb-8 max-w-xl mx-auto leading-relaxed">
            Join Ethiopians and Eritreans across the GCC playing the first quantum-verified lottery built for our diaspora.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/register" className="bg-brand text-burgundy font-bold px-6 py-3 rounded-lg hover:bg-amber-300 transition shadow-gold">
              Create your account →
            </Link>
            <Link to="/draws" className="bg-white/10 backdrop-blur border border-white/30 text-white font-semibold px-6 py-3 rounded-lg hover:bg-white/20 transition">
              Browse draws
            </Link>
          </div>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-4 mt-10 text-xs opacity-70">
            <span>Follow us</span>
            <span>·</span>
            <span>TikTok</span>
            <span>·</span>
            <span>Telegram</span>
            <span>·</span>
            <span>Instagram</span>
          </div>
        </div>
      </section>
    </div>
  );
}
