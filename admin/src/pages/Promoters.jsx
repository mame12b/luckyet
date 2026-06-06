import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";

const STATUS_COLORS = {
  pending:    "bg-amber-100 text-amber-800",
  active:     "bg-green-100 text-green-800",
  suspended:  "bg-red-100 text-red-800",
  terminated: "bg-gray-200 text-gray-700",
};

const TABS = ["all", "active", "pending", "suspended", "terminated"];

export default function Promoters() {
  const [streamers, setStreamers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [showInvite, setShowInvite] = useState(false);

  const load = () => {
    setLoading(true);
    const params = tab === "all" ? "" : `?status=${tab}`;
    api.get(`/admin/streamers${params}`)
      .then(({ data }) => setStreamers(data.streamers || []))
      .finally(() => setLoading(false));
  };

  useEffect(load, [tab]);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <header className="mb-5 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Promoters</h1>
          <p className="text-sm text-gray-500">Ticket sellers who earn commission on attributed sales.</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="bg-brand text-white text-sm font-semibold px-4 py-2 rounded-md hover:bg-brand-dark"
        >
          + Invite promoter
        </button>
      </header>

      {/* Status tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-xs px-3 py-1.5 rounded-full font-semibold capitalize whitespace-nowrap ${
              tab === t ? "bg-brand text-white" : "bg-white border border-gray-300 text-gray-600"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-md animate-pulse"></div>)}</div>
      ) : streamers.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <div className="text-4xl mb-3">🎤</div>
          <div className="font-semibold mb-1">No {tab !== "all" && tab} promoters yet</div>
          <div className="text-sm text-gray-500">Invite someone to start selling tickets on commission.</div>
        </div>
      ) : (
        <div className="space-y-2">
          {streamers.map(s => (
            <Link
              key={s._id}
              to={`/promoters/${s._id}`}
              className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-brand hover:shadow-sm transition"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono font-bold text-brand">{s.promoCode}</span>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${STATUS_COLORS[s.status]}`}>
                      {s.status}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {s.commissionPercent}% commission
                    </span>
                  </div>
                  <div className="font-semibold text-sm">{s.userId?.fullName || "—"}</div>
                  <div className="text-xs text-gray-500">{s.userId?.phone}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm font-mono">{(s.totalSalesETB || 0).toLocaleString()} ETB</div>
                  <div className="text-[11px] text-gray-500">{s.totalTicketsAttributed || 0} tickets sold</div>
                  <div className="text-[11px] text-green-700 font-semibold">
                    {(s.totalCommissionEarnedETB - s.totalPaidOutETB || 0).toLocaleString()} ETB earned
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showInvite && <InvitePromoterModal onClose={() => setShowInvite(false)} onCreated={() => { setShowInvite(false); load(); }} />}
    </div>
  );
}

function InvitePromoterModal({ onClose, onCreated }) {
  const [step, setStep] = useState("search"); // search | configure
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [user, setUser] = useState(null);
  const [promoCode, setPromoCode] = useState("");
  const [commissionPercent, setCommissionPercent] = useState(30);
  const [tiktokHandle, setTiktokHandle] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("bank_transfer");
  const [payoutAccountDetails, setPayoutAccountDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!search.trim() || step !== "search") return;
    setSearching(true);
    const t = setTimeout(() => {
      api.get(`/admin/users?search=${encodeURIComponent(search.trim())}&limit=10`)
        .then(({ data }) => setResults(data.users || []))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [search, step]);

  const select = (u) => {
    setUser(u);
    setPromoCode((u.fullName?.split(" ")[0] || "").toUpperCase().slice(0, 10) + "10");
    setStep("configure");
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!/^[A-Z0-9]{3,20}$/i.test(promoCode)) {
      setError("Promo code must be 3-20 letters/numbers");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/admin/streamers", {
        userId: user._id,
        promoCode: promoCode.toUpperCase(),
        commissionPercent: Number(commissionPercent),
        tiktokHandle: tiktokHandle.trim() || undefined,
        payoutMethod,
        payoutAccountDetails: payoutAccountDetails.trim() || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create promoter");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose}></div>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 pointer-events-auto max-h-[90vh] overflow-y-auto">

          {step === "search" ? (
            <>
              <h2 className="text-lg font-bold mb-1">Invite a promoter</h2>
              <p className="text-sm text-gray-500 mb-4">Find the user who'll become a ticket promoter.</p>

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, phone, or email..."
                className="w-full bg-white border border-gray-300 focus:border-brand outline-none rounded-md px-3 py-2.5 text-sm mb-3"
                autoFocus
              />

              {searching ? (
                <div className="text-xs text-gray-500 text-center py-4">Searching...</div>
              ) : results.length === 0 && search.trim() ? (
                <div className="text-xs text-gray-500 text-center py-4">No users found.</div>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {results.map(u => (
                    <button
                      key={u._id}
                      onClick={() => select(u)}
                      className="w-full text-left bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md p-2.5 text-sm transition"
                    >
                      <div className="font-semibold">{u.fullName}</div>
                      <div className="text-xs text-gray-500 font-mono">{u.phone}</div>
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full mt-4 bg-white border border-gray-300 font-semibold py-2 rounded-md hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
            </>
          ) : (
            <form onSubmit={submit}>
              <button
                type="button"
                onClick={() => { setStep("search"); setUser(null); }}
                className="text-xs text-gray-500 mb-2 hover:text-brand"
              >
                ← Change user
              </button>

              <h2 className="text-lg font-bold mb-1">Configure promoter</h2>
              <p className="text-sm text-gray-500 mb-4">For <strong>{user.fullName}</strong></p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Promo code</label>
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20))}
                    required
                    className="w-full bg-white border border-gray-300 focus:border-brand outline-none rounded-md px-3 py-2 text-base font-mono font-bold tracking-wider"
                  />
                  <div className="text-[10px] text-gray-400 mt-1">Buyers enter this code at checkout to credit the sale.</div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Commission rate</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={commissionPercent}
                      onChange={(e) => setCommissionPercent(e.target.value)}
                      required
                      className="w-20 bg-white border border-gray-300 focus:border-brand outline-none rounded-md px-3 py-2 text-sm"
                    />
                    <span className="text-sm font-semibold">%</span>
                    <span className="text-xs text-gray-500">of each ticket they sell</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">TikTok handle <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input
                    type="text"
                    value={tiktokHandle}
                    onChange={(e) => setTiktokHandle(e.target.value)}
                    placeholder="@username"
                    className="w-full bg-white border border-gray-300 focus:border-brand outline-none rounded-md px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Payout method</label>
                  <select
                    value={payoutMethod}
                    onChange={(e) => setPayoutMethod(e.target.value)}
                    className="w-full bg-white border border-gray-300 outline-none rounded-md px-3 py-2 text-sm"
                  >
                    <option value="bank_transfer">Bank transfer</option>
                    <option value="botim">Botim</option>
                    <option value="telebirr">Telebirr</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Account details <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input
                    type="text"
                    value={payoutAccountDetails}
                    onChange={(e) => setPayoutAccountDetails(e.target.value)}
                    placeholder="e.g. CBE 1000123456789"
                    className="w-full bg-white border border-gray-300 outline-none rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {error && <div className="bg-red-50 text-red-700 text-xs px-3 py-2 rounded-md mt-3">{error}</div>}

              <div className="flex gap-2 mt-5">
                <button type="button" onClick={onClose} className="flex-1 bg-white border border-gray-300 font-semibold py-2 rounded-md hover:bg-gray-50 text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="flex-1 bg-brand text-white font-semibold py-2 rounded-md hover:bg-brand-dark disabled:opacity-50 text-sm">
                  {submitting ? "Creating..." : "Create promoter"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
