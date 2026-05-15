
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuthStore } from "../store/auth";

const PAYMENT_METHODS = {
  AE: [
    { value: "botim", label: "Botim transfer", desc: "Best for UAE" },
    { value: "uae_bank", label: "UAE bank transfer", desc: "Local UAE bank" },
    { value: "telebirr_intl", label: "Telebirr International" },
  ],
  SA: [
    { value: "botim", label: "Botim transfer" },
    { value: "telebirr_intl", label: "Telebirr International" },
  ],
  ET: [
    { value: "cbe", label: "CBE Birr", desc: "Commercial Bank of Ethiopia" },
    { value: "awash", label: "Awash Bank" },
    { value: "dashen", label: "Dashen Bank" },
    { value: "telebirr_intl", label: "Telebirr" },
  ],
  DEFAULT: [
    { value: "botim", label: "Botim transfer" },
    { value: "telebirr_intl", label: "Telebirr International" },
  ],
};

export default function BuyTicket() {
  const { slug } = useParams();
  const nav = useNavigate();
  const { user } = useAuthStore();

  const [draw, setDraw] = useState(null);
  const [loading, setLoading] = useState(true);

  // Step state
  const [step, setStep] = useState(1); // 1=quantity, 2=instructions, 3=upload, 4=done

  // Step 1: quantity + method + promo
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("botim");
  const [promoCode, setPromoCode] = useState("");

  // Step 2: payment instructions returned from server
  const [payment, setPayment] = useState(null);
  const [instructions, setInstructions] = useState(null);

  // Step 3: upload
  const [receipt, setReceipt] = useState(null);
  const [transactionNumber, setTransactionNumber] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      nav(`/login?redirect=/draws/${slug}/buy`);
    }
  }, [user, slug, nav]);

  useEffect(() => {
    const country = user?.country || "AE";
    api.get(`/draws/slug/${slug}?country=${country}`)
      .then(({ data }) => setDraw(data.draw))
      .catch((err) => setError(err.response?.data?.message || "Failed to load draw"))
      .finally(() => setLoading(false));
  }, [slug, user]);

  const methods = PAYMENT_METHODS[user?.country] || PAYMENT_METHODS.DEFAULT;

  const handleInitiate = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const payload = { drawId: draw._id, quantity, paymentMethod };
      if (promoCode.trim()) payload.promoCode = promoCode.trim().toUpperCase();

      const { data } = await api.post("/payments/initiate", payload);
      setPayment(data.payment);
      setInstructions(data.instructions);
      setStep(2);
    } catch (err) {
      setError(
        err.response?.data?.errors?.[0]?.message ||
        err.response?.data?.message ||
        "Failed to initiate payment"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setError("");
    if (!receipt) {
      setError("Please attach your receipt image");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("receipt", receipt);
      fd.append("transactionNumber", transactionNumber);

      await api.post(`/payments/${payment._id}/receipt`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setStep(4);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Upload failed. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !draw) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="h-96 bg-surface border border-border rounded-xl animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {/* Header */}
      <Link to={`/draws/${slug}`} className="text-sm text-text-muted hover:text-text mb-4 inline-flex items-center gap-1">
        ← Back to draw
      </Link>
      <h1 className="text-2xl font-bold tracking-tight mb-1">{draw.prizeName}</h1>
      <p className="text-text-muted text-sm mb-8">{draw.title}</p>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8 text-xs">
        {["Select", "Pay", "Upload receipt", "Done"].map((label, i) => {
          const n = i + 1;
          const active = step === n;
          const done = step > n;
          return (
            <div key={n} className="flex items-center gap-2 flex-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center font-medium text-[10px] ${
                  done ? "bg-success text-white" : active ? "bg-brand text-white" : "bg-surface-2 text-text-muted"
                }`}
              >
                {done ? "✓" : n}
              </div>
              <span className={`${active ? "font-medium text-text" : "text-text-muted"} hidden sm:inline`}>{label}</span>
              {n < 4 && <div className="flex-1 h-px bg-border"></div>}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="bg-danger-light text-danger text-sm px-4 py-3 rounded-md mb-6">{error}</div>
      )}

      {/* Step 1: Quantity + method */}
      {step === 1 && (
        <form onSubmit={handleInitiate} className="bg-white border border-border rounded-xl p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">Quantity</label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 rounded-md border border-border hover:bg-surface text-lg">−</button>
              <input
                type="number"
                min="1"
                max="50"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                className="w-20 text-center bg-white border border-border focus:border-brand focus:ring-2 focus:ring-brand/10 outline-none rounded-md px-3 py-2.5 font-medium"
              />
              <button type="button" onClick={() => setQuantity(Math.min(50, quantity + 1))} className="w-10 h-10 rounded-md border border-border hover:bg-surface text-lg">+</button>
              <span className="text-sm text-text-muted">tickets (max 50)</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Payment method</label>
            <div className="space-y-2">
              {methods.map((m) => (
                <label
                  key={m.value}
                  className={`flex items-center gap-3 p-3 border rounded-md cursor-pointer transition ${
                    paymentMethod === m.value ? "border-brand bg-brand-light" : "border-border hover:border-border-strong"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={m.value}
                    checked={paymentMethod === m.value}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="accent-brand"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{m.label}</div>
                    {m.desc && <div className="text-xs text-text-muted">{m.desc}</div>}
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Promo code <span className="text-text-faint font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="e.g. HABESHA10"
              className="w-full bg-white border border-border focus:border-brand focus:ring-2 focus:ring-brand/10 outline-none rounded-md px-3.5 py-2.5 text-sm uppercase"
            />
          </div>

          <div className="bg-surface border border-border rounded-md p-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-text-muted">Subtotal</span>
              <span>{(draw.ticketPriceETB * quantity).toLocaleString()} ETB</span>
            </div>
            <div className="flex justify-between font-semibold pt-2 border-t border-border">
              <span>Total</span>
              <span>{(draw.ticketPriceETB * quantity).toLocaleString()} ETB</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-brand text-white font-medium py-3 rounded-md hover:bg-brand-dark transition disabled:opacity-50"
          >
            {submitting ? "Creating order..." : "Continue to payment →"}
          </button>
        </form>
      )}

      {/* Step 2: Payment instructions */}
      {step === 2 && instructions && (
        <div className="space-y-5">
          <div className="bg-warning-light border border-warning/30 rounded-xl p-5">
            <div className="font-semibold text-text mb-1">Reference code</div>
            <div className="font-mono text-2xl font-bold text-warning tracking-wider">{instructions.referenceCode}</div>
            <div className="text-xs text-text-muted mt-2">
              ⚠ You <strong>must</strong> include this code in your payment note, otherwise we cannot identify your transfer.
            </div>
          </div>

          <div className="bg-white border border-border rounded-xl p-5">
            <div className="text-xs font-medium text-text-muted uppercase tracking-wide mb-3">Amount to send</div>
            <div className="text-3xl font-bold mb-1">{instructions.totalETB.toLocaleString()} ETB</div>
            {instructions.displayCurrency !== "ETB" && (
              <div className="text-text-muted">≈ {instructions.displayAmount} {instructions.displayCurrency}</div>
            )}
          </div>

          <div className="bg-white border border-border rounded-xl p-5">
            <div className="text-xs font-medium text-text-muted uppercase tracking-wide mb-3">Send to</div>
            <div className="space-y-3">
              {instructions.accounts.map((acc) => (
                <div key={acc._id} className="border border-border rounded-md p-3 bg-surface">
                  <div className="text-xs text-text-muted uppercase tracking-wide mb-1">{acc.label}</div>
                  <div className="font-mono font-semibold text-base mb-0.5">{acc.accountNumber}</div>
                  <div className="text-sm text-text-muted">{acc.accountName}</div>
                  {acc.instructions && (
                    <div className="text-xs text-text-faint mt-2">{acc.instructions}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-brand-light border border-brand/20 rounded-xl p-5">
            <div className="font-medium text-sm mb-2">What to do next</div>
            <ol className="text-sm text-text space-y-1.5 list-decimal list-inside">
              {instructions.steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          </div>

          <div className="text-xs text-text-muted">
            This order expires on {new Date(instructions.expiresAt).toLocaleString()}.
          </div>

          <button
            onClick={() => setStep(3)}
            className="w-full bg-brand text-white font-medium py-3 rounded-md hover:bg-brand-dark transition"
          >
            I've sent the payment →
          </button>
        </div>
      )}

      {/* Step 3: Upload receipt */}
      {step === 3 && (
        <form onSubmit={handleUpload} className="bg-white border border-border rounded-xl p-6 space-y-5">
          <div>
            <h3 className="font-semibold mb-1">Upload your receipt</h3>
            <p className="text-sm text-text-muted">Screenshot of your transfer + the transaction number from your bank/wallet.</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Transaction number</label>
            <input
              type="text"
              value={transactionNumber}
              onChange={(e) => setTransactionNumber(e.target.value)}
              placeholder="e.g. TRX123456789"
              required
              className="w-full bg-white border border-border focus:border-brand focus:ring-2 focus:ring-brand/10 outline-none rounded-md px-3.5 py-2.5 text-sm"
            />
            <p className="text-xs text-text-muted mt-1">From your bank app or Botim transfer screen</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Receipt image</label>
            <div className="border-2 border-dashed border-border rounded-md p-6 text-center hover:border-brand transition">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => setReceipt(e.target.files?.[0] || null)}
                className="hidden"
                id="receipt-input"
              />
              <label htmlFor="receipt-input" className="cursor-pointer">
                {receipt ? (
                  <div>
                    <div className="text-sm font-medium text-text">{receipt.name}</div>
                    <div className="text-xs text-text-muted mt-1">{(receipt.size / 1024).toFixed(0)} KB · click to change</div>
                  </div>
                ) : (
                  <div>
                    <div className="text-sm font-medium text-brand">Choose a file</div>
                    <div className="text-xs text-text-muted mt-1">JPG, PNG, WEBP, or PDF · Max 5MB</div>
                  </div>
                )}
              </label>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-md p-3 text-xs text-text-muted">
            Make sure your receipt clearly shows: amount sent, recipient account, and the reference code <strong className="font-mono text-text">{payment?.referenceCode}</strong> in the transfer note.
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(2)} className="flex-1 border border-border text-text font-medium py-3 rounded-md hover:bg-surface transition">
              Back
            </button>
            <button
              type="submit"
              disabled={submitting || !receipt}
              className="flex-1 bg-brand text-white font-medium py-3 rounded-md hover:bg-brand-dark transition disabled:opacity-50"
            >
              {submitting ? "Uploading..." : "Submit receipt"}
            </button>
          </div>
        </form>
      )}

      {/* Step 4: Done */}
      {step === 4 && (
        <div className="bg-white border border-border rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-success-light rounded-full mx-auto mb-5 flex items-center justify-center">
            <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Receipt submitted</h2>
          <p className="text-text-muted mb-6 max-w-md mx-auto">
            Our team will verify your payment within 24 hours. You'll get an SMS and email when your tickets are issued.
          </p>
          <div className="bg-surface border border-border rounded-md p-4 max-w-sm mx-auto mb-6 text-left">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-text-muted">Reference</span>
              <span className="font-mono font-medium">{payment?.referenceCode}</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-text-muted">Tickets</span>
              <span className="font-medium">{quantity}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Total</span>
              <span className="font-medium">{payment?.totalETB.toLocaleString()} ETB</span>
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <Link to="/my-payments" className="bg-brand text-white font-medium px-5 py-2.5 rounded-md hover:bg-brand-dark transition text-sm">
              Track this payment
            </Link>
            <Link to="/draws" className="border border-border text-text font-medium px-5 py-2.5 rounded-md hover:bg-surface transition text-sm">
              Browse more draws
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
