import { useEffect, useState } from "react";
import api from "../lib/api";

export default function PasswordResets() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");

  // Approval modal
  const [approving, setApproving] = useState(null);
  const [approvedResult, setApprovedResult] = useState(null);

  // Rejection modal
  const [rejecting, setRejecting] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const load = () => {
    setLoading(true);
    api.get(`/admin/password-resets?status=${tab}`)
      .then(({ data }) => setRequests(data.requests || []))
      .finally(() => setLoading(false));
  };

  useEffect(load, [tab]);

  const handleApprove = async (request) => {
    setApproving(request);
    try {
      const { data } = await api.post(`/admin/password-resets/${request._id}/approve`);
      setApprovedResult(data);
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Approve failed");
      setApproving(null);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) return;
    try {
      await api.post(`/admin/password-resets/${rejecting._id}/reject`, { rejectionReason });
      setRejecting(null);
      setRejectionReason("");
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Reject failed");
    }
  };

  const closeApproved = () => {
    setApproving(null);
    setApprovedResult(null);
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <header className="mb-5">
        <h1 className="text-2xl font-bold">Password reset requests</h1>
        <p className="text-sm text-text-muted">Verify the user's identity, then approve to generate a one-time code.</p>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {["pending", "approved", "completed", "rejected", "expired"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-xs px-3 py-1.5 rounded-full font-semibold whitespace-nowrap ${
              tab === t ? "bg-brand text-white" : "bg-white border border-border text-text-muted"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-24 bg-surface rounded-md animate-pulse"></div>)}</div>
      ) : requests.length === 0 ? (
        <div className="bg-white border border-border rounded-lg p-12 text-center">
          <div className="text-4xl mb-2">✓</div>
          <div className="font-semibold">No {tab} requests</div>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r._id} className="bg-white border border-border rounded-lg p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                <div>
                  <div className="font-bold">{r.userId.fullName}</div>
                  <div className="text-xs text-text-muted font-mono">{r.userId.phone}</div>
                  <div className="text-xs text-text-muted">{r.userId.email}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-text-muted">Requested</div>
                  <div className="text-xs font-semibold">{new Date(r.createdAt).toLocaleString()}</div>
                </div>
              </div>

              {r.contactMethod && (
                <div className="text-xs"><span className="text-text-muted">Contact via:</span> <span className="font-semibold">{r.contactMethod}</span></div>
              )}
              {r.reason && (
                <div className="text-xs mt-1"><span className="text-text-muted">Reason:</span> {r.reason}</div>
              )}
              {r.rejectionReason && (
                <div className="text-xs mt-1 text-red-700"><span className="font-semibold">Rejected:</span> {r.rejectionReason}</div>
              )}

              {r.status === "pending" && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleApprove(r)}
                    className="text-xs bg-green-600 text-white font-semibold px-3 py-1.5 rounded hover:bg-green-700"
                  >
                    ✓ Approve & generate code
                  </button>
                  <button
                    onClick={() => setRejecting(r)}
                    className="text-xs bg-white border border-red-300 text-red-700 font-semibold px-3 py-1.5 rounded hover:bg-red-50"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Approval result modal — shows the code ONCE */}
      {approvedResult && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={closeApproved}></div>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 pointer-events-auto">
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">🔑</div>
                <h2 className="text-lg font-bold mb-1">Code generated</h2>
                <p className="text-sm text-text-muted">Share this with {approvedResult.user.fullName.split(" ")[0]} via {approving?.contactMethod || "their preferred method"}.</p>
              </div>

              <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 mb-3">
                <div className="text-[10px] uppercase tracking-widest font-bold text-amber-800 text-center mb-1">One-time reset code</div>
                <div className="font-mono font-extrabold text-3xl text-center tracking-[0.3em] text-burgundy">{approvedResult.resetCode}</div>
                <div className="text-[10px] text-amber-800 text-center mt-2">Expires {new Date(approvedResult.expiresAt).toLocaleString()}</div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-xs text-blue-900 leading-relaxed">
                💡 The user goes to <strong>/reset-password</strong>, enters this code along with their phone, and chooses their own new password. You will never know it.
              </div>

              <button onClick={closeApproved} className="w-full bg-burgundy text-white font-semibold py-2.5 rounded-md hover:bg-burgundy-dark text-sm">
                Done
              </button>
            </div>
          </div>
        </>
      )}

      {/* Rejection modal */}
      {rejecting && !approvedResult && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setRejecting(null)}></div>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 pointer-events-auto">
              <h2 className="text-lg font-bold mb-1">Reject reset request</h2>
              <p className="text-sm text-text-muted mb-3">Why is this request being rejected?</p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows="3"
                placeholder="e.g. Could not verify identity"
                className="w-full bg-white border border-border focus:border-brand outline-none rounded-md px-3 py-2 text-sm resize-none"
                autoFocus
              />
              <div className="flex gap-2 mt-4">
                <button onClick={() => { setRejecting(null); setRejectionReason(""); }} className="flex-1 bg-white border border-border font-semibold py-2 rounded-md hover:bg-surface text-sm">
                  Cancel
                </button>
                <button onClick={handleReject} disabled={!rejectionReason.trim()} className="flex-1 bg-red-600 text-white font-semibold py-2 rounded-md hover:bg-red-700 disabled:opacity-50 text-sm">
                  Reject request
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
