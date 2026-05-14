
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="px-6 pt-16 pb-20 md:pt-24 md:pb-28 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-brand-light text-brand text-xs font-medium px-3 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 bg-brand rounded-full"></span>
              Quantum-verified draws
            </div>
            <h1 className="text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight mb-6">
              Win big.<br />
              <span className="text-brand">Trust the math.</span>
            </h1>
            <p className="text-text-muted text-lg leading-relaxed mb-8 max-w-lg">
              The first quantum-randomized lottery built for the Ethiopian & Eritrean diaspora.
              Pay with Botim, bank transfer, or Telebirr. Win cars, houses, and more.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/register" className="bg-brand text-white font-medium px-5 py-2.5 rounded-md hover:bg-brand-dark transition text-sm">
                Get started →
              </Link>
              <Link to="/draws" className="border border-border-strong text-text font-medium px-5 py-2.5 rounded-md hover:bg-surface transition text-sm">
                View active draws
              </Link>
            </div>
            <div className="flex items-center gap-6 mt-10 text-xs text-text-muted">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-success rounded-full"></span>
                <span>ANU Quantum Lab partner</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-success rounded-full"></span>
                <span>Bank-grade security</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-border rounded-xl p-6 shadow-card">
            <div className="flex items-center justify-between mb-5">
              <span className="text-xs font-medium text-text-muted uppercase tracking-wide">Current Draw</span>
              <span className="inline-flex items-center gap-1.5 text-xs text-success bg-success-light px-2 py-1 rounded-full font-medium">
                <span className="w-1.5 h-1.5 bg-success rounded-full"></span>
                Active
              </span>
            </div>
            <h3 className="text-2xl font-bold mb-1">iPhone 15 Pro Max + 100k ETB</h3>
            <p className="text-text-muted text-sm mb-6">Launch draw · Closes Jul 14, 2026</p>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-text-muted">Tickets sold</span>
                  <span className="font-medium">0 / 5,000</span>
                </div>
                <div className="w-full h-2 bg-surface-2 rounded-full overflow-hidden">
                  <div className="h-full bg-brand rounded-full" style={{ width: "0%" }}></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <div className="text-xs text-text-muted mb-0.5">Ticket price</div>
                  <div className="font-semibold">500 ETB</div>
                  <div className="text-xs text-text-faint">≈ 16 AED</div>
                </div>
                <div>
                  <div className="text-xs text-text-muted mb-0.5">Prize value</div>
                  <div className="font-semibold">250,000 ETB</div>
                  <div className="text-xs text-text-faint">≈ 8,200 AED</div>
                </div>
              </div>
            </div>
            <Link to="/draws" className="block text-center w-full bg-brand text-white font-medium py-2.5 rounded-md mt-6 hover:bg-brand-dark transition text-sm">
              Buy a ticket
            </Link>
          </div>
        </div>
      </section>

      {/* How it works strip */}
      <section className="bg-surface border-y border-border py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs font-medium text-brand uppercase tracking-wide mb-3">How it works</div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Four steps to win</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              ["01", "Sign up", "Create your account in 60 seconds with your phone and email."],
              ["02", "Buy a ticket", "Pay via Botim, bank transfer, or Telebirr. We give you a reference code."],
              ["03", "Get verified", "Upload your receipt. Our team verifies it within 24 hours."],
              ["04", "Win", "On draw day, quantum randomness picks the winner. Fully verifiable."],
            ].map(([n, t, d]) => (
              <div key={n} className="bg-white border border-border rounded-lg p-5">
                <div className="text-xs font-mono text-brand font-semibold mb-2">{n}</div>
                <div className="font-semibold mb-1.5">{t}</div>
                <div className="text-sm text-text-muted leading-relaxed">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="px-6 py-20 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-xs font-medium text-brand uppercase tracking-wide mb-3">Why LuckyET</div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Built on trust, not luck alone</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: "Quantum-verifiable",
              desc: "Every winner is selected using true randomness from the Australian National University quantum lab. The math is public — anyone can verify it.",
            },
            {
              title: "Built for diaspora",
              desc: "Pay the way you already pay — Botim, CBE, Telebirr. Available in English, አማርኛ, and ትግርኛ.",
            },
            {
              title: "Transparent operations",
              desc: "Live ticket counter, public draw history, real winner stories. Every step on the record.",
            },
          ].map((b) => (
            <div key={b.title} className="bg-white border border-border rounded-lg p-6 hover:border-border-strong transition">
              <div className="w-10 h-10 bg-brand-light rounded-md flex items-center justify-center mb-4">
                <div className="w-2 h-2 bg-brand rounded-full"></div>
              </div>
              <h3 className="text-lg font-semibold mb-2">{b.title}</h3>
              <p className="text-text-muted text-sm leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA strip */}
      <section className="bg-brand text-white px-6 py-16">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to play?</h2>
          <p className="text-white/80 mb-8 max-w-xl mx-auto">
            Join thousands of Ethiopians and Eritreans playing the first quantum-verified lottery for the diaspora.
          </p>
          <Link to="/register" className="inline-block bg-white text-brand font-semibold px-6 py-3 rounded-md hover:bg-surface transition">
            Create your account →
          </Link>
        </div>
      </section>
    </div>
  );
}