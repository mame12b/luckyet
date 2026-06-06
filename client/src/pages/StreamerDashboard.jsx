import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { useAuthStore } from "../store/auth";
import PromoterQR from "../components/PromoterQR";

export default function StreamerDashboard() {
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPayout, setShowPayout] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    api.get("/streamers/me")
      .then(({ data }) => setData(data))
      .catch((err) => setError(err.response?.data?.message || "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) {
    return (
      <div className="bg-surface min-h-screen px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="h-32 bg-white rounded-xl animate-pulse mb-4"></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[1,2,3,4].map(i => <div key={i} className="h-20 bg-white rounded-xl animate-pulse"></div>)}
          </div>
          <div className="h-64 bg-white rounded-xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error || !data?.hasProfile) {
    return (
      <div className="bg-surface min-h-screen px-4 py-12">
        <div className="max-w-md mx-auto bg-white border border-border rounded-2xl p-6 text-center shadow-card">
          <div className="text-4xl mb-3">🎤</div>
          <h1 className="text-xl font-extrabold mb-2">No promoter profile yet</h1>
          <p className="text-sm text-text-muted mb-4">
            {error || "You're not registered as a promoter. Contact LuckyET support if you'd like to become one."}
          </p>
          <Link to="/dashboard" className="block w-full bg-brand text-white font-bold py-2.5 rounded-md hover:bg-brand-dark text-sm">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { streamer, stats, recentSales, payouts } = data;
  const aboveThreshold = stats.availableETB >= 5000;
  const canRequestPayout = streamer.status === "active" && stats.availableETB > 0;

  return (
    <div className="bg-surface min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* Welcome header */}
        <header className="mb-5">
          <div className="text-[10px] uppercase tracking-widest text-brand-dark font-bold mb-1">Promoter</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold mb-1">Hi {user?.fullName?.split(" ")[0] || "there"} 👋</h1>
          <p className="text-sm text-text-muted">
            Your code <span className="font-mono font-bold text-brand-dark">{streamer.promoCode}</span> earns you{" "}
            <strong>{streamer.commissionPercent}%</strong> on every ticket sold.
          </p>
        </header>

        {/* Status banner if not active */}
        {streamer.status !== "active" && (
          <div className={`mb-4 rounded-xl p-3 text-sm ${
            streamer.status === "pending" ? "bg-amber-50 border border-amber-200 text-amber-900" :
            "bg-red-50 border border-red-200 text-red-900"
          }`}>
            {streamer.status === "pending" && "⏳ Your promoter account is pending admin approval."}
            {streamer.status === "suspended" && "🚫 Your account is suspended. Contact support."}
            {streamer.status === "terminated" && "❌ Your account has been terminated."}
          </div>
        )}

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
          <KpiCard label="Available" value={`${stats.availableETB.toLocaleString()} ETB`} accent="amber" highlight={aboveThreshold} />
          <KpiCard label="Total earned" value={`${stats.totalEarnedETB.toLocaleString()} ETB`} />
          <KpiCard label="Tickets sold" value={stats.totalTicketsAttributed.toLocaleString()} />
          <KpiCard label="Sales total" value={`${stats.totalSalesETB.toLocaleString()} ETB`} />
        </div>

        {/* Payout CTA */}
        {canRequestPayout && (
          <div className={`mb-5 rounded-xl p-4 ${aboveThreshold ? "bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-300" : "bg-white border border-border"}`}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                {aboveThreshold ? (
                  <>
                    <div className="font-bold text-sm">💰 Time to cash out!</div>
                    <div className="text-xs text-text-muted">You've reached the payout threshold.</div>
                  </>
                ) : (
                  <>
                    <div className="font-bold text-sm">Your balance</div>
                    <div className="text-xs text-text-muted">Request a payout anytime, or save up for less hassle (5,000 ETB suggested).</div>
                  </>
                )}
              </div>
              <button
                onClick={() => setShowPayout(true)}
                className="bg-brand text-white font-bold px-4 py-2 rounded-md text-sm hover:bg-brand-dark transition"
              >
                Request payout
              </button>
            </div>
          </div>
        )}

        {/* QR code section */}
        <div className="mb-5">
          <PromoterQR promoCode={streamer.promoCode} />
        </div>

        {/* Recent sales */}
        <div className="bg-white border border-border rounded-xl p-5 mb-4">
          <h2 className="font-bold text-sm mb-3">Recent sales</h2>
          {recentSales.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-2xl mb-2 opacity-30">🎟️</div>
              <div className="text-xs text-text-muted">No sales yet. Share your QR to start earning.</div>
            </div>
          ) : (
            <div className="space-y-2">
              {recentSales.slice(0, 10).map((s) => (
                <div key={s._id} className="flex items-center justify-between text-xs bg-surface rounded-md px-3 py-2">
                  <div className="min-w-0">
                    <div className="font-mono font-bold truncate">{s.referenceCode}</div>
                    <div className="text-text-muted truncate">
                      {s.drawId?.title || "Draw"} · {s.userId?.fullName?.split(" ")[0] || "Buyer"}
                    </div>
                  </div>
                  <div className="text-right whitespace-nowrap ml-2">
                    <div className="font-mono font-bold">{s.totalETB.toLocaleString()} ETB</div>
                    <div className="text-[10px] text-green-700 font-semibold">
                      +{Math.round(s.totalETB * streamer.commissionPercent / 100).toLocaleString()} ETB
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payout history */}
        <div className="bg-white border border-border rounded-xl p-5">
          <h2 className="font-bold text-sm mb-3">Payout history</h2>
          {payouts.length === 0 ? (
            <div className="text-xs text-text-muted text-center py-4">No payout requests yet.</div>
          ) : (
            <div className="space-y-2">
              {payouts.map((p) => (
                <div key={p._id} className="flex items-center justify-between text-xs bg-surface rounded-md px-3 py-2">
                  <div>
                    <div className="font-mono font-bold">{p.referenceCode}</div>
                    <div className="text-text-muted">{new Date(p.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold">{p.amountETB.toLocaleString()} ETB</div>
                    <div className={`text-[10px] uppercase font-bold ${
                      p.status === "paid" ? "text-green-700" :
                      p.status === "rejected" ? "text-red-700" :
                      "text-amber-700"
                    }`}>{p.status}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {showPayout && (
        <RequestPayoutModal
          streamer={streamer}
          maxETB={stats.availableETB}
          onClose={() => setShowPayout(false)}
          onSuccess={() => { setShowPayout(false); load(); }}
        />
      )}
    </div>
  );
}

function KpiCard({ label, value, accent, highlight }) {
  return (
    <div className={`border rounded-xl p-3 ${
      highlight ? "border-amber-400 bg-amber-50" :
      accent === "amber" ? "border-amber-300 bg-gradient-to-br from-amber-50 to-white" :
      "border-border bg-white"
    }`}>
      <div className="text-[9px] uppercase tracking-wider font-bold text-text-muted mb-0.5">{label}</div>
      <div className="text-base sm:text-lg font-extrabold font-mono leading-tight">{value}</div>
    </div>
  );
}

function RequestPayoutModal({ streamer, maxETB, onClose, onSuccess }) {
  const [amount, setAmount] = useState(Math.min(maxETB, 5000));
  const [method, setMethod] = useState(streamer.payoutMethod || "bank_transfer");
  const [accountDetails, setAccountDetails] = useState(streamer.payoutAccountDetails || "");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const amt = Number(amount);
    if (!amt || amt <= 0) { setError("Enter an amount"); return; }
    if (amt > maxETB) { setError(`Maximum is ${maxETB.toLocaleString()} ETB`); return; }
    if (!accountDetails.trim() || accountDetails.trim().length < 3) {
      setError("Please enter your account details");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/streamers/me/payouts", {
        amountETB: amt,
        method,
        payoutAccountDetails: accountDetails.trim(),
        notes: notes.trim() || undefined,
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose}></div>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 sm:p-6 pointer-events-auto max-h-[90vh] overflow-y-auto">
          <h2 className="text-lg font-extrabold mb-1">Request payout</h2>
          <p className="text-xs text-text-muted mb-4">Available: <span className="font-mono font-bold">{maxETB.toLocaleString()} ETB</span></p>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Amount (ETB)</label>
              <input
                type="number"
                min="1"
                max={maxETB}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full bg-white border border-border focus:border-brand outline-none rounded-md px-3 py-2.5 text-base font-mono"
              />
              <button
                type="button"
                onClick={() => setAmount(maxETB)}
                className="text-[11px] text-brand-dark hover:underline mt-1 font-semibold"
              >
                Withdraw all ({maxETB.toLocaleString()} ETB)
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Pay me via</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full bg-white border border-border outline-none rounded-md px-3 py-2.5 text-sm"
              >
                <option value="bank_transfer">Bank transfer</option>
                <option value="botim">Botim</option>
                <option value="telebirr">Telebirr</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Account details</label>
              <input
                type="text"
                value={accountDetails}
                onChange={(e) => setAccountDetails(e.target.value)}
                required
                placeholder="e.g. CBE 1000123456789 — Asrat Belay"
                className="w-full bg-white border border-border focus:border-brand outline-none rounded-md px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Notes <span className="text-text-faint font-normal">(optional)</span></label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows="2"
                className="w-full bg-white border border-border outline-none rounded-md px-3 py-2 text-sm resize-none"
              />
            </div>

            {error && <div className="bg-danger-light text-danger text-xs px-3 py-2 rounded-md">{error}</div>}

            <div className="flex gap-2 mt-4">
              <button type="button" onClick={onClose} className="flex-1 bg-white border border-border font-semibold py-2 rounded-md hover:bg-surface text-sm">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="flex-1 bg-brand text-white font-semibold py-2 rounded-md hover:bg-brand-dark disabled:opacity-50 text-sm">
                {submitting ? "Submitting..." : "Submit request"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
