import { useEffect, useState } from "react";
import api, { fileUrl } from "../lib/api";

export default function PendingPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [actioning, setActioning] = useState(false);
  const [actionError, setActionError] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [confirmReject, setConfirmReject] = useState(false);

  const load = () => {
    setLoading(true);
    api.get("/admin/payments/pending")
      .then(({ data }) => setPayments(data.payments))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const verify = async () => {
    if (!selected) return;
    setActioning(true);
    setActionError("");
    try {
      const { data } = await api.post(`/admin/payments/${selected._id}/verify`, {
        decision: "verified",
      });
      // Show success briefly with ticket info, then close
      alert(`✓ Verified. ${data.tickets.length} quantum ticket${data.tickets.length === 1 ? "" : "s"} issued.\n\n${data.tickets.map(t => t.ticketNumber).join("\n")}`);
      setSelected(null);
      load();
    } catch (err) {
      setActionError(err.response?.data?.message || "Verification failed");
    } finally {
      setActioning(false);
    }
  };

  const reject = async () => {
    if (!selected || !rejectionReason.trim()) {
      setActionError("Rejection reason is required");
      return;
    }
    setActioning(true);
    setActionError("");
    try {
      await api.post(`/admin/payments/${selected._id}/verify`, {
        decision: "rejected",
        rejectionReason: rejectionReason.trim(),
      });
      setSelected(null);
      setRejectionReason("");
      setConfirmReject(false);
      load();
    } catch (err) {
      setActionError(err.response?.data?.message || "Rejection failed");
    } finally {
      setActioning(false);
    }
  };

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Pending payments</h1>
          <p className="text-sm text-text-muted">{payments.length} {payments.length === 1 ? "payment" : "payments"} awaiting verification</p>
        </div>
        <button onClick={load} className="text-sm border border-border bg-white hover:bg-surface px-3 py-1.5 rounded-md font-medium transition">
          Refresh
        </button>
      </header>

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-white border border-border rounded-lg animate-pulse"></div>)}
        </div>
      )}

      {!loading && payments.length === 0 && (
        <div className="bg-white border border-border rounded-xl p-12 text-center">
          <div className="text-success text-3xl mb-3">✓</div>
          <h3 className="font-semibold text-lg mb-1">All caught up</h3>
          <p className="text-text-muted text-sm">No payments awaiting verification right now.</p>
        </div>
      )}

      <div className="space-y-2">
        {payments.map((p) => (
          <button
            key={p._id}
            onClick={() => { setSelected(p); setRejectionReason(""); setConfirmReject(false); setActionError(""); }}
            className="w-full text-left bg-white border border-border rounded-lg px-5 py-4 hover:border-brand hover:shadow-soft transition"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-mono text-sm font-semibold">{p.referenceCode}</span>
                  <span className="text-xs bg-warning-light text-warning font-medium px-2 py-0.5 rounded-full">Awaiting</span>
                </div>
                <div className="text-sm font-medium mb-0.5">{p.userId?.fullName}</div>
                <div className="text-xs text-text-muted">
                  {p.userId?.email} · {p.userId?.country} · {p.drawId?.prizeName} · {p.quantity} {p.quantity === 1 ? "ticket" : "tickets"} · {p.paymentMethod.replace(/_/g, " ")}
                </div>
              </div>
              <div className="text-right">
                <div className="text-base font-bold">{p.totalETB.toLocaleString()} ETB</div>
                <div className="text-xs text-text-faint">{new Date(p.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => !actioning && setSelected(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white border border-border rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-card">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold">{selected.referenceCode}</h2>
                  <span className="text-xs bg-warning-light text-warning font-medium px-2 py-0.5 rounded-full">Awaiting verification</span>
                </div>
                <p className="text-xs text-text-muted mt-0.5">Verify before issuing tickets — once verified, quantum tickets are generated.</p>
              </div>
              <button onClick={() => !actioning && setSelected(null)} className="text-text-muted hover:text-text text-xl leading-none">×</button>
            </div>

            <div className="flex-1 overflow-auto p-5 grid md:grid-cols-2 gap-5">
              {/* Receipt image */}
              <div>
                <div className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">Receipt</div>
                {selected.receiptImageUrl ? (
                  <a href={fileUrl(selected.receiptImageUrl)} target="_blank" rel="noopener noreferrer" className="block border border-border rounded-md overflow-hidden hover:border-brand transition">
                    <img src={fileUrl(selected.receiptImageUrl)} alt="Receipt" className="w-full h-auto" />
                  </a>
                ) : (
                  <div className="border border-border rounded-md p-6 text-center text-text-muted text-sm bg-surface">
                    No receipt uploaded
                  </div>
                )}
                <div className="mt-2 text-xs text-text-muted">Click image to open full size in new tab.</div>
              </div>

              {/* Details */}
              <div className="space-y-4">
                <Detail label="Player" value={selected.userId?.fullName} hint={`${selected.userId?.email} · ${selected.userId?.phone}`} />
                <Detail label="Country" value={selected.userId?.country} />
                <Detail label="Draw" value={selected.drawId?.prizeName} hint={selected.drawId?.title} />
                <Detail label="Quantity" value={`${selected.quantity} ${selected.quantity === 1 ? "ticket" : "tickets"}`} />
                <Detail label="Amount" value={`${selected.totalETB.toLocaleString()} ETB`} hint={selected.displayCurrency !== "ETB" ? `≈ ${selected.displayAmount} ${selected.displayCurrency}` : null} />
                {selected.discountETB > 0 && <Detail label="Discount applied" value={`-${selected.discountETB.toLocaleString()} ETB`} hint={`Promo: ${selected.promoCodeUsed}`} />}
                <Detail label="Payment method" value={selected.paymentMethod.replace(/_/g, " ")} />
                <Detail label="Transaction number" value={selected.transactionNumber} mono />
                <Detail label="Submitted" value={new Date(selected.updatedAt || selected.createdAt).toLocaleString()} />
              </div>
            </div>

            {/* Reject reason form */}
            {confirmReject && (
              <div className="px-5 py-4 border-t border-border bg-danger-light">
                <label className="block text-xs font-medium mb-1.5 text-danger">Rejection reason (will be shown to the player)</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows="2"
                  placeholder="e.g. Receipt amount does not match · Reference code missing · Transaction not found in our account"
                  className="w-full bg-white border border-border focus:border-brand focus:ring-2 focus:ring-brand/10 outline-none rounded-md px-3 py-2 text-sm resize-none"
                />
              </div>
            )}

            {actionError && (
              <div className="px-5 py-3 bg-danger-light text-danger text-sm">{actionError}</div>
            )}

            {/* Actions */}
            <div className="px-5 py-4 border-t border-border bg-surface flex items-center justify-end gap-2">
              {!confirmReject ? (
                <>
                  <button onClick={() => !actioning && setSelected(null)} className="text-sm px-4 py-2 text-text-muted hover:text-text rounded-md">
                    Cancel
                  </button>
                  <button
                    onClick={() => setConfirmReject(true)}
                    disabled={actioning}
                    className="text-sm border border-danger/30 text-danger bg-white hover:bg-danger-light px-4 py-2 rounded-md font-medium transition disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={verify}
                    disabled={actioning}
                    className="text-sm bg-success text-white hover:bg-emerald-700 px-5 py-2 rounded-md font-medium transition disabled:opacity-50"
                  >
                    {actioning ? "Verifying..." : "✓ Verify & issue tickets"}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => { setConfirmReject(false); setRejectionReason(""); }} disabled={actioning} className="text-sm px-4 py-2 text-text-muted hover:text-text rounded-md">
                    Back
                  </button>
                  <button
                    onClick={reject}
                    disabled={actioning || !rejectionReason.trim()}
                    className="text-sm bg-danger text-white hover:bg-red-700 px-5 py-2 rounded-md font-medium transition disabled:opacity-50"
                  >
                    {actioning ? "Rejecting..." : "Confirm rejection"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value, hint, mono }) {
  return (
    <div>
      <div className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-sm ${mono ? "font-mono" : ""} font-medium`}>{value || "—"}</div>
      {hint && <div className="text-xs text-text-muted mt-0.5">{hint}</div>}
    </div>
  );
}