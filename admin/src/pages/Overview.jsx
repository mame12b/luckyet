import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

const PALETTE = ["#8b1e3f", "#f59e0b", "#0ea5e9", "#10b981", "#a855f7", "#ef4444", "#64748b"];

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

  const load = () => {
    setLoading(true);
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
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading && !kpis) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-surface rounded-md animate-pulse"></div>)}
        </div>
        <div className="h-64 bg-surface rounded-md animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <header className="mb-5 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-text-muted">Real-time view of platform performance.</p>
        </div>
        <button
          onClick={load}
          className="text-xs bg-white border border-border px-3 py-1.5 rounded-md font-semibold hover:bg-surface"
        >
          ↻ Refresh
        </button>
      </header>

      {/* KPI cards */}
      {kpis && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <KpiCard
            label="Today's revenue"
            value={`${fmtETB(kpis.today.revenue)} ETB`}
            sub={`${kpis.today.tickets} tickets · ${kpis.today.count} payments`}
            trend={kpis.dodChangePercent}
            accent="amber"
          />
          <KpiCard
            label="Last 30 days"
            value={`${fmtETB(kpis.last30Days.revenue)} ETB`}
            sub={`${kpis.last30Days.tickets} tickets`}
            accent="burgundy"
          />
          <KpiCard
            label="Pending review"
            value={kpis.pendingPayments.toString()}
            sub={kpis.pendingPayments > 0 ? "Action needed" : "All caught up"}
            accent={kpis.pendingPayments > 0 ? "red" : "green"}
            href="/payments/pending"
          />
          <KpiCard
            label="Active draws"
            value={kpis.activeDraws.toString()}
            sub={`${kpis.totalPlayers.toLocaleString()} players signed up`}
            accent="blue"
          />
        </div>
      )}

      {/* Daily sales chart */}
      <Section title="Daily sales — last 30 days" subtitle="Verified payments only">
        {daily.length === 0 ? (
          <Empty />
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(d) => d.slice(5)}  // MM-DD
                />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(n) => fmtETB(n)} />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  formatter={(v, name) => [
                    name === "revenue" ? `${v.toLocaleString()} ETB` : v,
                    name.charAt(0).toUpperCase() + name.slice(1),
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="revenue" stroke="#8b1e3f" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="tickets" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Section>

      {/* Two columns: draws + payment methods */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <Section title="Top draws by revenue">
          {draws.length === 0 ? <Empty /> : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={draws.slice(0, 6)} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={fmtETB} />
                  <YAxis type="category" dataKey="title" tick={{ fontSize: 10 }} width={100} />
                  <Tooltip
                    contentStyle={{ fontSize: 12 }}
                    formatter={(v) => [`${v.toLocaleString()} ETB`, "Revenue"]}
                  />
                  <Bar dataKey="revenue" fill="#8b1e3f" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>

        <Section title="Payment methods">
          {byMethod.length === 0 ? <Empty /> : (
            <div className="h-64 flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byMethod}
                    dataKey="revenue"
                    nameKey="method"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ method, percent }) => `${method} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {byMethod.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontSize: 12 }}
                    formatter={(v, name) => [`${v.toLocaleString()} ETB`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
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
                <tr className="text-[10px] uppercase tracking-wider text-text-muted border-b border-border">
                  <th className="text-left py-1.5 pr-2 font-semibold">Country</th>
                  <th className="text-right py-1.5 px-2 font-semibold">Buyers</th>
                  <th className="text-right py-1.5 px-2 font-semibold">Tickets</th>
                  <th className="text-right py-1.5 pl-2 font-semibold">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {byCountry.map((c, i) => (
                  <tr key={i} className="border-b border-border last:border-b-0">
                    <td className="py-2 pr-2 font-semibold">{c.country || "—"}</td>
                    <td className="text-right py-2 px-2 text-text-muted">{c.buyers}</td>
                    <td className="text-right py-2 px-2 text-text-muted">{c.tickets}</td>
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
              <div className="text-xs text-text-muted">No promoter activity yet.</div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-text-muted border-b border-border">
                  <th className="text-left py-1.5 pr-2 font-semibold">Code · Name</th>
                  <th className="text-right py-1.5 px-2 font-semibold">Tickets</th>
                  <th className="text-right py-1.5 pl-2 font-semibold">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {promoters.map((p, i) => (
                  <tr key={i} className="border-b border-border last:border-b-0">
                    <td className="py-2 pr-2">
                      <div className="font-mono text-xs font-bold text-burgundy">{p.promoCode}</div>
                      {p.name && <div className="text-[11px] text-text-muted truncate">{p.name}</div>}
                    </td>
                    <td className="text-right py-2 px-2 text-text-muted">{p.tickets}</td>
                    <td className="text-right py-2 pl-2 font-mono">{p.revenue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      </div>

      {/* All draws table */}
      <Section title="All draws performance">
        {draws.length === 0 ? <Empty /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-text-muted border-b border-border">
                  <th className="text-left py-2 pr-2 font-semibold">Draw</th>
                  <th className="text-right py-2 px-2 font-semibold">Tickets</th>
                  <th className="text-right py-2 px-2 font-semibold">Fill</th>
                  <th className="text-right py-2 px-2 font-semibold">Buyers</th>
                  <th className="text-right py-2 pl-2 font-semibold">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {draws.map((d, i) => (
                  <tr key={i} className="border-b border-border last:border-b-0">
                    <td className="py-2 pr-2">
                      <Link to={`/draws/${d.slug}`} className="font-semibold hover:underline">{d.title}</Link>
                      <div className="text-[11px] text-text-muted">{d.status}</div>
                    </td>
                    <td className="text-right py-2 px-2 text-text-muted">{d.tickets} / {d.ticketPoolSize}</td>
                    <td className="text-right py-2 px-2">
                      <div className="inline-block w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden align-middle mr-1">
                        <div
                          className="h-full bg-burgundy"
                          style={{ width: `${Math.min(d.fillPercent, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] text-text-muted">{d.fillPercent.toFixed(0)}%</span>
                    </td>
                    <td className="text-right py-2 px-2 text-text-muted">{d.uniqueBuyers}</td>
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

function KpiCard({ label, value, sub, trend, accent = "burgundy", href }) {
  const accents = {
    burgundy: "border-burgundy/30 bg-gradient-to-br from-burgundy/5 to-white",
    amber:    "border-amber-400/30 bg-gradient-to-br from-amber-50 to-white",
    red:      "border-red-300 bg-red-50",
    green:    "border-green-300 bg-green-50",
    blue:     "border-blue-300 bg-blue-50",
  };
  const trendColor = trend == null ? "" : trend >= 0 ? "text-green-700" : "text-red-700";

  const inner = (
    <div className={`border rounded-xl p-4 ${accents[accent]} h-full`}>
      <div className="text-[10px] uppercase tracking-wider font-bold text-text-muted mb-1">{label}</div>
      <div className="text-2xl font-extrabold tracking-tight">{value}</div>
      <div className="flex items-baseline gap-2 mt-1">
        <div className="text-[11px] text-text-muted">{sub}</div>
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
    <div className="bg-white border border-border rounded-xl p-4 mb-4">
      <header className="mb-3">
        <h2 className="font-bold text-sm">{title}</h2>
        {subtitle && <div className="text-[11px] text-text-muted">{subtitle}</div>}
      </header>
      {children}
    </div>
  );
}

function Empty() {
  return (
    <div className="text-center py-8">
      <div className="text-2xl mb-2 opacity-30">📊</div>
      <div className="text-xs text-text-muted">No data yet — comes alive once tickets are sold.</div>
    </div>
  );
}
