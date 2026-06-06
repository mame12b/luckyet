import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";

function fmtETB(n) {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function fmtPct(n) {
  if (n == null) return null;
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

export default function Overview() {
  const [kpis, setKpis] = useState(null);
  const [daily, setDaily] = useState([]);
  const [draws, setDraws] = useState([]);
  const [byCountry, setByCountry] = useState([]);
  const [byMethod, setByMethod] = useState([]);
  const [promoters, setPromoters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    Promise.all([
      api.get("/admin/analytics/kpis"),
      api.get("/admin/analytics/daily-sales?days=30"),
      api.get("/admin/analytics/draws"),
      api.get("/admin/analytics/breakdowns"),
      api.get("/admin/analytics/promoters"),
    ])
      .then(([k, d, dr, b, p]) => {
        setKpis(k.data);
        setDaily(d.data.series || []);
        setDraws(dr.data.draws || []);
        setByCountry(b.data.byCountry || []);
        setByMethod(b.data.byMethod || []);
        setPromoters(p.data.promoters || []);
      })
      .catch((err) => {
        console.error("Analytics load error:", err);
        setError(err.response?.data?.message || "Failed to load analytics");
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading && !kpis) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-100 rounded-md animate-pulse"></div>)}
        </div>
        <div className="h-64 bg-gray-100 rounded-md animate-pulse"></div>
      </div>
    );
  }

  // Max value for chart scaling
  const dailyMax = Math.max(...daily.map(d => d.revenue), 1);
  const drawsMax = Math.max(...draws.map(d => d.revenue), 1);
  const methodMax = Math.max(...byMethod.map(m => m.revenue), 1);
  const countryMax = Math.max(...byCountry.map(c => c.revenue), 1);
  const totalMethodRevenue = byMethod.reduce((s, m) => s + m.revenue, 0) || 1;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <header className="mb-5 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-gray-500">Real-time view of platform performance.</p>
        </div>
        <button
          onClick={load}
          className="text-xs bg-white border border-gray-300 px-3 py-1.5 rounded-md font-semibold hover:bg-gray-50"
        >
          ↻ Refresh
        </button>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}

      {/* KPI cards */}
      {kpis && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <KpiCard
            label="Today's revenue"
            value={`${fmtETB(kpis.today?.revenue || 0)} ETB`}
            sub={`${kpis.today?.tickets || 0} tickets · ${kpis.today?.count || 0} payments`}
            trend={kpis.dodChangePercent}
            accent="amber"
          />
          <KpiCard
            label="Last 30 days"
            value={`${fmtETB(kpis.last30Days?.revenue || 0)} ETB`}
            sub={`${kpis.last30Days?.tickets || 0} tickets`}
            accent="brand"
          />
          <KpiCard
            label="Pending review"
            value={(kpis.pendingPayments || 0).toString()}
            sub={kpis.pendingPayments > 0 ? "Action needed" : "All caught up"}
            accent={kpis.pendingPayments > 0 ? "red" : "green"}
            href="/payments/pending"
          />
          <KpiCard
            label="Active draws"
            value={(kpis.activeDraws || 0).toString()}
            sub={`${(kpis.totalPlayers || 0).toLocaleString()} players signed up`}
            accent="blue"
          />
        </div>
      )}

      {/* Daily sales chart — pure CSS */}
      <Section title="Daily sales — last 30 days" subtitle="Verified payments only">
        {daily.length === 0 ? <Empty /> : (
          <div>
            <div className="flex items-end gap-1 h-48 mb-2">
              {daily.map((d) => {
                const heightPct = (d.revenue / dailyMax) * 100;
                const hasActivity = d.revenue > 0;
                return (
                  <div
                    key={d.date}
                    className="flex-1 group relative flex flex-col justify-end"
                    title={`${d.date}: ${d.revenue.toLocaleString()} ETB · ${d.tickets} tickets`}
                  >
                    <div
                      className={`w-full rounded-t transition-all ${
                        hasActivity ? "bg-brand hover:bg-brand-dark" : "bg-gray-100"
                      }`}
                      style={{ height: `${Math.max(heightPct, hasActivity ? 2 : 1)}%` }}
                    >
                      {hasActivity && (
                        <div className="hidden group-hover:block absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                          <div className="font-bold">{d.revenue.toLocaleString()} ETB</div>
                          <div className="text-[10px] opacity-70">{d.tickets} tickets</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-gray-500">
              <span>{daily[0]?.date.slice(5)}</span>
              <span>{daily[Math.floor(daily.length / 2)]?.date.slice(5)}</span>
              <span>{daily[daily.length - 1]?.date.slice(5)}</span>
            </div>
          </div>
        )}
      </Section>

      {/* Two columns: draws + payment methods */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <Section title="Top draws by revenue">
          {draws.length === 0 ? <Empty /> : (
            <div className="space-y-2">
              {draws.slice(0, 6).map((d, i) => (
                <div key={i}>
                  <div className="flex items-baseline justify-between text-xs mb-1">
                    <span className="font-semibold truncate">{d.title}</span>
                    <span className="font-mono font-bold ml-2 whitespace-nowrap">{d.revenue.toLocaleString()} ETB</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand"
                      style={{ width: `${(d.revenue / drawsMax) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Payment methods">
          {byMethod.length === 0 ? <Empty /> : (
            <div className="space-y-2">
              {byMethod.map((m, i) => {
                const pct = (m.revenue / totalMethodRevenue) * 100;
                const colors = ["bg-brand", "bg-amber-500", "bg-blue-500", "bg-green-500", "bg-purple-500"];
                return (
                  <div key={i}>
                    <div className="flex items-baseline justify-between text-xs mb-1">
                      <span className="font-semibold">{m.method}</span>
                      <span className="text-gray-500">
                        <span className="font-bold text-gray-900">{pct.toFixed(0)}%</span>
                        <span className="ml-2 font-mono">{m.revenue.toLocaleString()} ETB</span>
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors[i % colors.length]}`}
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>

      {/* Country + Promoters */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <Section title="Buyers by country">
          {byCountry.length === 0 ? <Empty /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
                  <th className="text-left py-1.5 pr-2 font-semibold">Country</th>
                  <th className="text-right py-1.5 px-2 font-semibold">Buyers</th>
                  <th className="text-right py-1.5 px-2 font-semibold">Tickets</th>
                  <th className="text-right py-1.5 pl-2 font-semibold">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {byCountry.map((c, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-b-0">
                    <td className="py-2 pr-2 font-semibold">{c.country || "—"}</td>
                    <td className="text-right py-2 px-2 text-gray-500">{c.buyers}</td>
                    <td className="text-right py-2 px-2 text-gray-500">{c.tickets}</td>
                    <td className="text-right py-2 pl-2 font-mono">{c.revenue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title="Top promoters" subtitle="By verified ticket revenue">
          {promoters.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-2xl mb-2 opacity-30">◔</div>
              <div className="text-xs text-gray-500">No promoter activity yet.</div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
                  <th className="text-left py-1.5 pr-2 font-semibold">Code · Name</th>
                  <th className="text-right py-1.5 px-2 font-semibold">Tickets</th>
                  <th className="text-right py-1.5 pl-2 font-semibold">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {promoters.map((p, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-b-0">
                    <td className="py-2 pr-2">
                      <div className="font-mono text-xs font-bold text-brand">{p.promoCode}</div>
                      {p.name && <div className="text-[11px] text-gray-500 truncate">{p.name}</div>}
                    </td>
                    <td className="text-right py-2 px-2 text-gray-500">{p.tickets}</td>
                    <td className="text-right py-2 pl-2 font-mono">{p.revenue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      </div>

      {/* All draws performance */}
      <Section title="All draws performance">
        {draws.length === 0 ? <Empty /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
                  <th className="text-left py-2 pr-2 font-semibold">Draw</th>
                  <th className="text-right py-2 px-2 font-semibold">Tickets</th>
                  <th className="text-right py-2 px-2 font-semibold">Fill</th>
                  <th className="text-right py-2 px-2 font-semibold">Buyers</th>
                  <th className="text-right py-2 pl-2 font-semibold">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {draws.map((d, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-b-0">
                    <td className="py-2 pr-2">
                      <Link to={`/draws/${d.slug}`} className="font-semibold hover:underline">{d.title}</Link>
                      <div className="text-[11px] text-gray-500">{d.status}</div>
                    </td>
                    <td className="text-right py-2 px-2 text-gray-500">{d.tickets} / {d.ticketPoolSize}</td>
                    <td className="text-right py-2 px-2">
                      <div className="inline-block w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden align-middle mr-1">
                        <div
                          className="h-full bg-brand"
                          style={{ width: `${Math.min(d.fillPercent, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] text-gray-500">{d.fillPercent.toFixed(0)}%</span>
                    </td>
                    <td className="text-right py-2 px-2 text-gray-500">{d.uniqueBuyers}</td>
                    <td className="text-right py-2 pl-2 font-mono font-semibold">{d.revenue.toLocaleString()} ETB</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

function KpiCard({ label, value, sub, trend, accent, href }) {
  const accents = {
    brand: "border-brand/30 bg-gradient-to-br from-brand/5 to-white",
    amber:    "border-amber-400/30 bg-gradient-to-br from-amber-50 to-white",
    red:      "border-red-300 bg-red-50",
    green:    "border-green-300 bg-green-50",
    blue:     "border-blue-300 bg-blue-50",
  };
  const trendColor = trend == null ? "" : trend >= 0 ? "text-green-700" : "text-red-700";

  const inner = (
    <div className={`border rounded-xl p-4 ${accents[accent] || accents.brand} h-full`}>
      <div className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-extrabold tracking-tight">{value}</div>
      <div className="flex items-baseline gap-2 mt-1 flex-wrap">
        <div className="text-[11px] text-gray-500">{sub}</div>
        {trend != null && (
          <div className={`text-[11px] font-bold ${trendColor}`}>
            {trend >= 0 ? "↗" : "↘"} {fmtPct(trend)}
          </div>
        )}
      </div>
    </div>
  );

  if (href) return <Link to={href} className="block hover:scale-[1.02] transition">{inner}</Link>;
  return inner;
}

function Section({ title, subtitle, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
      <header className="mb-3">
        <h2 className="font-bold text-sm">{title}</h2>
        {subtitle && <div className="text-[11px] text-gray-500">{subtitle}</div>}
      </header>
      {children}
    </div>
  );
}

function Empty() {
  return (
    <div className="text-center py-8">
      <div className="text-2xl mb-2 opacity-30">📊</div>
      <div className="text-xs text-gray-500">No data yet — comes alive once tickets are sold.</div>
    </div>
  );
}
