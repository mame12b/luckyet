import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../lib/api";
import PromoterQR from "../components/PromoterQR";

const STATUS_COLORS = {
  pending:    "bg-amber-100 text-amber-800",
  active:     "bg-green-100 text-green-800",
  suspended:  "bg-red-100 text-red-800",
  terminated: "bg-gray-200 text-gray-700",
};

export default function PromoterDetail() {
  const { id } = useParams();
  const [streamer, setStreamer] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit commission state
  const [editingCommission, setEditingCommission] = useState(false);
  const [newCommission, setNewCommission] = useState(30);

  const load = () => {
    setLoading(true);
    api.get(`/admin/streamers/${id}`)
      .then(({ data }) => {
        setStreamer(data.streamer);
        setNewCommission(data.streamer.commissionPercent);
        setPayouts(data.payouts || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const saveCommission = async () => {
    try {
      await api.patch(`/admin/streamers/${id}`, { commissionPercent: Number(newCommission) });
      setEditingCommission(false);
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Update failed");
    }
  };

  const toggleSuspend = async () => {
    const action = streamer.status === "suspended" ? "reactivate" : "suspend";
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${streamer.userId.fullName}?`)) return;
    try {
      await api.post(`/admin/streamers/${id}/suspend`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Action failed");
    }
  };

  const approveStreamer = async () => {
    if (!confirm(`Approve and activate ${streamer.userId.fullName}?`)) return;
    try {
      await api.post(`/admin/streamers/${id}/approve`, {});
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Approval failed");
    }
  };

  if (loading) {
    return <div className="p-6"><div className="h-64 bg-gray-100 rounded-md animate-pulse"></div></div>;
  }
  if (!streamer) {
    return (
      <div className="p-6 text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <div className="font-bold">Promoter not found</div>
        <Link to="/promoters" className="text-brand hover:underline text-sm">← All promoters</Link>
      </div>
    );
  }

  const u = streamer.userId;
  const earned = streamer.totalCommissionEarnedETB - streamer.totalPaidOutETB;
  const aboveThreshold = earned >= 5000;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <Link to="/promoters" className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">← All promoters</Link>

      {/* Header */}
      <header className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-mono font-extrabold text-2xl text-brand">{streamer.promoCode}</span>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${STATUS_COLORS[streamer.status]}`}>
                {streamer.status}
              </span>
            </div>
            <div className="font-bold text-lg">{u?.fullName || "—"}</div>
            <div className="text-sm text-gray-500 font-mono">{u?.phone}</div>
            <div className="text-xs text-gray-500">{u?.email}</div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {streamer.status === "pending" && (
              <button onClick={approveStreamer} className="text-xs bg-green-600 text-white font-semibold px-3 py-1.5 rounded hover:bg-green-700">
                ✓ Approve
              </button>
            )}
            <button
              onClick={toggleSuspend}
              className="text-xs bg-white border border-gray-300 text-gray-700 font-semibold px-3 py-1.5 rounded hover:bg-gray-50"
            >
              {streamer.status === "suspended" ? "Reactivate" : "Suspend"}
            </button>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <Stat label="Tickets sold" value={streamer.totalTicketsAttributed || 0} />
          <Stat label="Sales generated" value={`${(streamer.totalSalesETB || 0).toLocaleString()} ETB`} />
          <Stat label="Commission earned" value={`${(streamer.totalCommissionEarnedETB || 0).toLocaleString()} ETB`} />
          <Stat label="Paid out" value={`${(streamer.totalPaidOutETB || 0).toLocaleString()} ETB`} />
        </div>

        {/* Earned + threshold */}
        <div className={`mt-4 p-3 rounded-lg ${aboveThreshold ? "bg-amber-50 border border-amber-200" : "bg-gray-50 border border-gray-200"}`}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-gray-500">Available for payout</div>
              <div className="text-xl font-extrabold font-mono">{Math.max(0, earned).toLocaleString()} ETB</div>
            </div>
            {aboveThreshold && (
              <div className="text-xs text-amber-800 font-semibold">
                💰 Threshold reached — payout suggested
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Commission control */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <h2 className="font-bold text-sm mb-3">Commission rate</h2>
        {editingCommission ? (
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="number"
              min="0"
              max="50"
              value={newCommission}
              onChange={(e) => setNewCommission(e.target.value)}
              className="w-20 bg-white border border-gray-300 outline-none rounded-md px-3 py-2 text-sm"
            />
            <span className="text-sm font-semibold">%</span>
            <button onClick={saveCommission} className="text-xs bg-brand text-white font-semibold px-3 py-1.5 rounded hover:bg-brand-dark">
              Save
            </button>
            <button onClick={() => { setEditingCommission(false); setNewCommission(streamer.commissionPercent); }} className="text-xs bg-white border border-gray-300 font-semibold px-3 py-1.5 rounded">
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="font-mono font-extrabold text-2xl text-brand">{streamer.commissionPercent}%</span>
            <button onClick={() => setEditingCommission(true)} className="text-xs text-brand hover:underline font-semibold">
              Edit
            </button>
          </div>
        )}
        <div className="text-[11px] text-gray-400 mt-2">
          Earned on each ticket attributed via promo code <strong>{streamer.promoCode}</strong>.
          Changes apply to future sales only.
        </div>
      </div>

      <div className="mb-4">
        <PromoterQR promoCode={streamer.promoCode} />
      </div>

      {/* Payouts history */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="font-bold text-sm mb-3">Payout history</h2>
        {payouts.length === 0 ? (
          <div className="text-xs text-gray-500 py-4 text-center">No payouts yet.</div>
        ) : (
          <div className="space-y-2">
            {payouts.map(p => (
              <div key={p._id} className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2 text-xs">
                <div>
                  <div className="font-mono font-bold">{p.referenceCode}</div>
                  <div className="text-gray-500">{new Date(p.createdAt).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold">{p.amountETB.toLocaleString()} ETB</div>
                  <div className={`text-[10px] uppercase font-bold ${
                    p.status === "paid" ? "text-green-700" :
                    p.status === "rejected" ? "text-red-700" :
                    "text-amber-700"
                  }`}>
                    {p.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-0.5">{label}</div>
      <div className="text-base font-bold font-mono">{value}</div>
    </div>
  );
}
