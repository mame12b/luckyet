import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";

const TABS = ["requested", "approved", "paid", "rejected"];

export default function Payouts() {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("requested");

  const [acting, setActing] = useState(null);
  const [actionType, setActionType] = useState("");
  const [proof, setProof] = useState("");
  const [reason, setReason] = useState("");

  const load = () => {
    setLoading(true);
    api.get(`/admin/payouts?status=${tab}`)
      .then(({ data }) => setPayouts(data.payouts || []))
      .finally(() => setLoading(false));
  };

  useEffect(load, [tab]);

  const openAction = (payout, action) => {
    setActing(payout);
    setActionType(action);
    setProof("");
    setReason("");
  };

  const submit = async () => {
    try {
      const body = { action: actionType };
      if (actionType === "mark_paid") body.paymentProof = proof.trim() || "manual";
      if (actionType === "reject") body.rejectionReason = reason.trim() || "Not specified";
      await api.post(`/admin/payouts/${acting._id}/action`, body);
      setActing(null);
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Action failed");
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <header className="mb-5">
        <h1 className="text-2xl font-bold">Payouts</h1>
        <p className="text-sm text-gray-500">Approve and process promoter payout requests.</p>
      </header>

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
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-md animate-pulse"></div>)}</div>
      ) : payouts.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <div className="text-4xl mb-2">💰</div>
          <div className="font-semibold">No {tab} payouts</div>
        </div>
      ) : (
        <div className="space-y-3">
          {payouts.map(p => (
            <div key={p._id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                <div>
                  <div className="font-mono text-xs font-bold text-brand mb-0.5">{p.referenceCode}</div>
                  <div className="font-bold">{p.userId?.fullName}</div>
                  <div className="text-xs text-gray-500 font-mono">{p.userId?.phone}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Promo: <span className="font-mono font-semibold">{p.streamerId?.promoCode}</span>
                    {" "}· {p.streamerId?.commissionPercent}% commission
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-extrabold text-xl font-mono">{p.amountETB.toLocaleString()} ETB</div>
                  <div className="text-[11px] text-gray-500 uppercase font-semibold">{p.method?.replace("_", " ")}</div>
                  <div className="text-[11px] text-gray-500">{new Date(p.createdAt).toLocaleString()}</div>
                </div>
              </div>

              {p.payoutAccountDetails && (
                <div className="text-xs bg-gray-50 rounded px-3 py-2 mb-2 font-mono">{p.payoutAccountDetails}</div>
              )}
              {p.notes && <div className="text-xs text-gray-600 italic mb-2">"{p.notes}"</div>}
              {p.rejectionReason && (
                <div className="text-xs text-red-700 bg-red-50 rounded px-3 py-2 mb-2">
                  <span className="font-semibold">Rejected:</span> {p.rejectionReason}
                </div>
              )}
              {p.paymentProof && (
                <div className="text-xs text-green-700 bg-green-50 rounded px-3 py-2 mb-2">
                  <span className="font-semibold">Paid:</span> {p.paymentProof}
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                {p.status === "requested" && (
                  <>
                    <button onClick={() => openAction(p, "approve")} className="text-xs bg-green-600 text-white font-semibold px-3 py-1.5 rounded hover:bg-green-700">
                      ✓ Approve
                    </button>
                    <button onClick={() => openAction(p, "reject")} className="text-xs bg-white border border-red-300 text-red-700 font-semibold px-3 py-1.5 rounded hover:bg-red-50">
                      Reject
                    </button>
                  </>
                )}
                {p.status === "approved" && (
                  <>
                    <button onClick={() => openAction(p, "mark_paid")} className="text-xs bg-brand text-white font-semibold px-3 py-1.5 rounded hover:bg-brand-dark">
                      ✓ Mark paid
                    </button>
                    <button onClick={() => openAction(p, "reject")} className="text-xs bg-white border border-red-300 text-red-700 font-semibold px-3 py-1.5 rounded hover:bg-red-50">
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action modal */}
      {acting && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setActing(null)}></div>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 pointer-events-auto">
              <h2 className="text-lg font-bold mb-1">
                {actionType === "approve" && "Approve payout"}
                {actionType === "mark_paid" && "Mark as paid"}
                {actionType === "reject" && "Reject payout"}
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                <span className="font-mono font-bold">{acting.amountETB.toLocaleString()} ETB</span>
                {" "}to {acting.userId?.fullName}
              </p>

              {actionType === "mark_paid" && (
                <div className="mb-4">
                  <label className="block text-xs font-semibold mb-1">Payment proof <span className="text-gray-400 font-normal">(transaction ID, receipt URL, or "manual")</span></label>
                  <input
                    type="text"
                    value={proof}
                    onChange={(e) => setProof(e.target.value)}
                    placeholder="e.g. CBE-TX-123456"
                    className="w-full bg-white border border-gray-300 outline-none rounded-md px-3 py-2 text-sm"
                    autoFocus
                  />
                </div>
              )}

              {actionType === "reject" && (
                <div className="mb-4">
                  <label className="block text-xs font-semibold mb-1">Reason</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows="3"
                    className="w-full bg-white border border-gray-300 outline-none rounded-md px-3 py-2 text-sm resize-none"
                    autoFocus
                  />
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => setActing(null)} className="flex-1 bg-white border border-gray-300 font-semibold py-2 rounded-md hover:bg-gray-50 text-sm">
                  Cancel
                </button>
                <button
                  onClick={submit}
                  className={`flex-1 text-white font-semibold py-2 rounded-md text-sm ${
                    actionType === "reject" ? "bg-red-600 hover:bg-red-700" :
                    actionType === "mark_paid" ? "bg-brand hover:bg-brand-dark" :
                    "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
