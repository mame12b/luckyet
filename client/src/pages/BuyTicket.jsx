import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../lib/api";
import { useAuthStore } from "../store/auth";
import CopyButton from "../components/CopyButton";

const METHOD_INFO = {
  botim: { icon: "📱", label: "Botim", subtitle: "Best for UAE / GCC" },
  telebirr: { icon: "💸", label: "Telebirr Intl", subtitle: "International transfer" },
  cbe_bank: { icon: "🏦", label: "CBE", subtitle: "Inside Ethiopia" },
  awash_bank: { icon: "🏦", label: "Awash Bank", subtitle: "Inside Ethiopia" },
  bank_transfer: { icon: "🏦", label: "Bank transfer", subtitle: "Local bank" },
};

export default function BuyTicket() {
  const { slug } = useParams();
  const nav = useNavigate();
  const { user } = useAuthStore();

  const [draw, setDraw] = useState(null);
  const [methods, setMethods] = useState([]);
  const [step, setStep] = useState(1);                // 1=order, 2=pay+upload, 3=done
  const [quantity, setQuantity] = useState(1);
  const [method, setMethod] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoValid, setPromoValid] = useState(null);

  const [payment, setPayment] = useState(null);       // backend-created payment
  const [receipt, setReceipt] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Load draw + payment accounts
  useEffect(() => {
    if (!user) { nav(`/login?redirect=/draws/${slug}/buy`); return; }
    const country = user?.country || "AE";
    Promise.all([
      api.get(`/draws/slug/${slug}?country=${country}`),
      api.get(`/settings/payment-methods?country=${country}`).catch(() => ({ data: { paymentAccounts: [] } })),
    ])
      .then(([drawRes, methodsRes]) => {
        setDraw(drawRes.data.draw);
        const accounts = methodsRes.data.paymentAccounts || methodsRes.data.accounts || [];
        setMethods(accounts.filter(a => a.isActive !== false));
        // Pre-select the first recommended one if any, otherwise the first method
        const recommended = accounts.find(a => a.recommended);
        if (recommended) setMethod(recommended.method);
        else if (accounts.length > 0) setMethod(accounts[0].method);
      })
      .catch((err) => setError(err.response?.data?.message || "Failed to load draw"));
  }, [slug, user, nav]);

  // Promo validation (debounced)
  useEffect(() => {
    if (!promoCode.trim()) { setPromoValid(null); return; }
    const code = promoCode.trim().toUpperCase();
    const t = setTimeout(() => {
      api.get(`/streamers/validate/${code}`)
        .then(({ data }) => setPromoValid(data))
        .catch(() => setPromoValid({ valid: false }));
    }, 400);
    return () => clearTimeout(t);
  }, [promoCode]);

  if (!draw && !error) {
    return <div className="max-w-3xl mx-auto px-4 py-10"><div className="h-96 bg-surface border border-border rounded-xl animate-pulse"></div></div>;
  }
  if (error && !draw) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-bold mb-2">Cannot buy ticket</h1>
        <p className="text-text-muted mb-5 text-sm">{error}</p>
        <Link to="/draws" className="text-brand-dark font-semibold hover:underline">← Browse draws</Link>
      </div>
    );
  }

  // --- Pricing ---
  const subtotalETB = quantity * draw.ticketPriceETB;
  const discountPct = promoValid?.valid ? (promoValid.playerDiscountPercent || 0) : 0;
  const discountETB = Math.round(subtotalETB * discountPct / 100);
  const totalETB = subtotalETB - discountETB;

  // === STEP 1 → STEP 2: create payment intent ===
  const startPayment = async () => {
    setError("");
    setSubmitting(true);
    try {
      const { data } = await api.post("/payments/initiate", {
        drawId: draw._id,
        quantity,
        paymentMethod: method,
        promoCode: promoValid?.valid ? promoCode.trim().toUpperCase() : undefined,
      });
      setPayment(data.payment);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || "Could not start payment. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // === STEP 2 → STEP 3: upload receipt ===
 const submitReceipt = async () => {
  setError("");
  if (!receipt) { setError("Receipt image or PDF is required"); return; }

  setSubmitting(true);
  try {
    const formData = new FormData();
    formData.append("receipt", receipt);
    // Use the reference code as the "transaction reference" — admin verifies via receipt image
    formData.append("transactionNumber", payment.referenceCode);
    await api.post(`/payments/${payment._id}/receipt`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    setStep(3);
  } catch (err) {
    setError(err.response?.data?.message || "Upload failed. Try again.");
  } finally {
    setSubmitting(false);
  }
};

  const selectedAccount = methods.find((a) => a.method === payment?.paymentMethod);

  return (
    <div className="bg-surface min-h-[80vh]">
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <Link to={`/draws/${slug}`} className="text-xs text-text-muted hover:text-burgundy inline-flex items-center gap-1 font-semibold mb-2">
            ← Back
          </Link>
          <div className="text-xs text-burgundy font-semibold mb-0.5">{draw.title}</div>
          <h1 className="text-xl sm:text-2xl font-extrabold">{draw.prizes?.[0]?.name || draw.prizeName}</h1>
        </div>

        {/* Step indicator */}
        <Stepper step={step} />

        {/* === STEP 1: Order — quantity + method together === */}
        {step === 1 && (
          <div className="space-y-3">
            {/* Quantity */}
            <Card title="How many tickets?">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-12 h-12 bg-white border border-border rounded-lg text-2xl font-bold hover:border-brand active:scale-95 transition">−</button>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="flex-1 text-center text-2xl font-bold border border-border rounded-lg py-2 focus:border-brand outline-none"
                />
                <button
                  onClick={() => setQuantity(Math.min(50, quantity + 1))}
                  className="w-12 h-12 bg-white border border-border rounded-lg text-2xl font-bold hover:border-brand active:scale-95 transition">+</button>
              </div>
              <p className="text-[11px] text-text-muted mt-2 text-center">Max 50 per purchase</p>
            </Card>

            {/* Payment method */}
            <Card title="How will you pay?">
              <div className="space-y-2">
                {methods.length === 0 ? (
                  <div className="text-sm text-text-muted text-center py-4">No payment methods configured.</div>
                    ) :methods.map((m) => {
                        const info = METHOD_INFO[m.method] || { icon: "💳", label: m.method, subtitle: "" };
                        const selected = method === m.method;
                        return (
                          <button
                            key={m.method}
                            type="button"
                            onClick={() => setMethod(m.method)}
                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg border-2 transition text-left ${
                              selected ? "border-brand bg-brand-light/40" : "border-border bg-white hover:border-border-strong"
                            }`}>
                            <div className="text-2xl flex-shrink-0">{info.icon}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="font-bold text-sm">{m.label || info.label}</div>
                                {m.recommended && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-success bg-success-light px-1.5 py-0.5 rounded">
                                    ✓ For you
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-text-muted">{info.subtitle}</div>
                            </div>
                            {selected && <span className="text-brand text-xl flex-shrink-0">✓</span>}
                          </button>
                        );
                      })}
              </div>
            </Card>

            {/* Promo code (collapsed unless filled) */}
            <Card title="Promo code (optional)">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="HABESHA10"
                className="w-full bg-white border border-border focus:border-brand outline-none rounded-md px-3 py-2.5 text-sm font-mono uppercase"
              />
              {promoValid?.valid && (
                <p className="text-xs text-success mt-1.5">
                  ✓ {promoValid.streamerName}'s code · {promoValid.playerDiscountPercent}% off
                </p>
              )}
              {promoValid && !promoValid.valid && promoCode.trim() && (
                <p className="text-xs text-danger mt-1.5">Invalid or expired code</p>
              )}
            </Card>

            {/* Total */}
            <div className="bg-burgundy text-white rounded-xl p-4">
              <div className="flex justify-between text-sm opacity-80 mb-1">
                <span>Subtotal ({quantity} × {draw.ticketPriceETB.toLocaleString()})</span>
                <span>{subtotalETB.toLocaleString()} ETB</span>
              </div>
              {discountETB > 0 && (
                <div className="flex justify-between text-sm text-amber-300 mb-1">
                  <span>Discount</span>
                  <span>− {discountETB.toLocaleString()} ETB</span>
                </div>
              )}
              <div className="flex justify-between items-end pt-2 border-t border-white/20">
                <span className="text-sm font-semibold">Total</span>
                <span className="text-2xl font-extrabold">{totalETB.toLocaleString()} <span className="text-sm opacity-70">ETB</span></span>
              </div>
            </div>

            {error && <div className="bg-danger-light text-danger text-sm px-3 py-2 rounded-md">{error}</div>}

            <button
              onClick={startPayment}
              disabled={submitting || !method}
              className="w-full bg-brand text-white font-bold py-3.5 rounded-lg hover:bg-brand-dark transition shadow-gold disabled:opacity-50 text-base"
            >
              {submitting ? "Starting…" : "Continue to payment →"}
            </button>
          </div>
        )}

        {/* === STEP 2: Pay + Upload — combined === */}
        {step === 2 && payment && (
          <div className="space-y-3">
            {/* Amount + reference */}
            <Card title="Send this exact amount">
              <div className="text-center py-2">
                <div className="text-3xl font-extrabold text-burgundy">{payment.totalETB.toLocaleString()} <span className="text-base font-normal text-text-muted">ETB</span></div>
                {payment.displayCurrency !== "ETB" && (
                  <div className="text-xs text-text-faint mt-0.5">≈ {payment.displayAmount} {payment.displayCurrency}</div>
                )}
              </div>
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="text-[10px] text-amber-900 font-bold uppercase tracking-wider mb-1">Reference code — include in transfer note</div>
                <div className="flex items-center justify-between gap-2">
                  <code className="font-mono font-extrabold text-lg text-burgundy break-all">{payment.referenceCode}</code>
                  <CopyButton value={payment.referenceCode} label="Copy" />
                </div>
              </div>
            </Card>

            {/* Send to */}
            {selectedAccount && (
              <Card title={`Send to · ${selectedAccount.label}`}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 p-3 bg-white border border-border rounded-lg">
                    <div className="min-w-0">
                      <div className="text-[10px] text-text-muted uppercase tracking-wider">Account number</div>
                      <code className="font-mono font-bold text-sm break-all">{selectedAccount.accountNumber}</code>
                    </div>
                    <CopyButton value={selectedAccount.accountNumber.replace(/\s/g, "")} label="Copy" />
                  </div>
                  <div className="flex items-center justify-between gap-2 p-3 bg-white border border-border rounded-lg">
                    <div className="min-w-0">
                      <div className="text-[10px] text-text-muted uppercase tracking-wider">Account name</div>
                      <div className="font-semibold text-sm truncate">{selectedAccount.accountName}</div>
                    </div>
                    <CopyButton value={selectedAccount.accountName} label="Copy" />
                  </div>
                </div>
                {selectedAccount.instructions && (
                  <p className="text-xs text-text-muted mt-3 leading-relaxed">{selectedAccount.instructions}</p>
                )}
              </Card>
            )}

            {/* Upload */}
            <Card title="Upload your receipt">
              <label className="block text-xs font-semibold mb-1.5">Receipt screenshot or PDF</label>
              <label className="block border-2 border-dashed border-border rounded-lg p-5 cursor-pointer hover:border-brand transition bg-white">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => setReceipt(e.target.files[0])}
                  className="hidden"
                />
                {receipt ? (
                  <div className="text-center">
                    <div className="text-success text-2xl mb-1">📄</div>
                    <div className="font-semibold text-sm truncate">{receipt.name}</div>
                    <div className="text-xs text-text-muted">{(receipt.size / 1024).toFixed(0)} KB · Tap to change</div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-3xl mb-1 opacity-50">📤</div>
                    <div className="text-sm font-semibold">Tap to upload</div>
                    <div className="text-[11px] text-text-muted mt-0.5">JPG, PNG, or PDF · max 5MB</div>
                  </div>
                )}
              </label>
            </Card>

            {error && <div className="bg-danger-light text-danger text-sm px-3 py-2 rounded-md">{error}</div>}

            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                disabled={submitting}
                className="px-4 py-3 bg-white border border-border rounded-lg font-semibold text-sm hover:bg-surface">
                ← Back
              </button>
              <button
                onClick={submitReceipt}
                disabled={submitting || !receipt}
                className="flex-1 bg-brand text-white font-bold py-3 rounded-lg hover:bg-brand-dark transition shadow-gold disabled:opacity-50 text-base">
                {submitting ? "Submitting…" : "Submit receipt"}
              </button>
            </div>
          </div>
        )}

        {/* === STEP 3: Done === */}
        {step === 3 && (
          <div className="bg-white border border-border rounded-2xl p-6 sm:p-8 text-center">
            <div className="w-16 h-16 bg-success-light text-success rounded-full mx-auto mb-4 flex items-center justify-center text-3xl">
              ✓
            </div>
            <h2 className="text-2xl font-extrabold mb-2">Receipt submitted!</h2>
            <p className="text-text-muted text-sm leading-relaxed mb-5">
              We'll review your payment within <strong className="text-text">24 hours</strong>. Once verified, your quantum tickets will appear in <strong className="text-text">My tickets</strong>.
            </p>

            <div className="bg-surface border border-border rounded-lg p-4 mb-5 text-left">
              <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Reference</div>
              <div className="font-mono font-bold">{payment.referenceCode}</div>
              <div className="text-xs text-text-muted mt-1">Save this in case we need to contact you.</div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Link to="/my-payments" className="flex-1 bg-brand text-white font-bold py-3 rounded-lg hover:bg-brand-dark transition text-sm">
                View my payments
              </Link>
              <Link to="/draws" className="flex-1 bg-white border border-border text-text font-semibold py-3 rounded-lg hover:bg-surface text-sm">
                Browse more draws
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="bg-white border border-border rounded-xl p-4 sm:p-5">
      <h3 className="font-bold text-sm mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Stepper({ step }) {
  const steps = [
    { n: 1, label: "Order" },
    { n: 2, label: "Pay" },
    { n: 3, label: "Done" },
  ];
  return (
    <div className="flex items-center justify-center gap-2 mb-5">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
            step >= s.n ? "bg-brand text-white" : "bg-surface-2 text-text-muted"
          }`}>
            {step > s.n ? "✓" : s.n}
          </div>
          <span className={`text-xs font-semibold hidden sm:inline ${step >= s.n ? "text-text" : "text-text-muted"}`}>
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <div className={`w-8 sm:w-12 h-0.5 ${step > s.n ? "bg-brand" : "bg-surface-2"}`}></div>
          )}
        </div>
      ))}
    </div>
  );
}
