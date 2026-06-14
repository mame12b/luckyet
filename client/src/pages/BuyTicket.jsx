import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../lib/api";
import { useAuthStore } from "../store/auth";
import CopyButton from "../components/CopyButton";
import { getStoredPromo } from "../lib/promo";

const METHOD_ICONS = {
  botim: "📱",
  cbe_bank: "🏦",
  awash_bank: "🏦",
  bank_transfer: "🏦",
};

// Payment methods we don't currently offer — hidden from UI even if server returns them
const HIDDEN_METHODS = ["telebirr"];

export default function BuyTicket() {
  const { t } = useTranslation();
  const { slug } = useParams();
  const nav = useNavigate();
  const { user } = useAuthStore();
  const [draw, setDraw] = useState(null);
  const [methods, setMethods] = useState([]);
  const [step, setStep] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [method, setMethod] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoValid, setPromoValid] = useState(null);
  const [payment, setPayment] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Load draw + payment accounts (filtering hidden methods)
  useEffect(() => {
    if (!user) { nav(`/login?redirect=/draws/${slug}/buy`); return; }
    const country = user?.country || "AE";
    Promise.all([
      api.get(`/draws/slug/${slug}?country=${country}`),
      api.get(`/settings/payment-methods?country=${country}`).catch(() => ({ data: { paymentAccounts: [] } })),
    ])
      .then(([drawRes, methodsRes]) => {
        setDraw(drawRes.data.draw);
        const accounts = (methodsRes.data.paymentAccounts || methodsRes.data.accounts || [])
          .filter(a => a.isActive !== false)
          .filter(a => !HIDDEN_METHODS.includes(a.method));
        setMethods(accounts);
        const recommended = accounts.find(a => a.recommended);
        if (recommended) setMethod(recommended.method);
        else if (accounts.length > 0) setMethod(accounts[0].method);
      })
      .catch((err) => setError(err.response?.data?.message || t("buy.loadFailed")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, user, nav]);

  // Pre-fill promo code from localStorage (QR scan)
  useEffect(() => {
    const stored = getStoredPromo();
    if (stored) setPromoCode(stored);
  }, []);

  // Debounced promo validation
  useEffect(() => {
    if (!promoCode.trim()) { setPromoValid(null); return; }
    const code = promoCode.trim().toUpperCase();
    const tid = setTimeout(() => {
      api.get(`/streamers/validate/${code}`)
        .then(({ data }) => setPromoValid(data))
        .catch(() => setPromoValid({ valid: false }));
    }, 400);
    return () => clearTimeout(tid);
  }, [promoCode]);

  if (!draw && !error) {
    return <div className="max-w-3xl mx-auto px-4 py-10"><div className="h-96 bg-surface border border-border rounded-xl animate-pulse"></div></div>;
  }

  if (error && !draw) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-bold mb-2">{t("buy.cantBuy")}</h1>
        <p className="text-text-muted mb-5 text-sm">{error}</p>
        <Link to="/draws" className="text-brand-dark font-semibold hover:underline">{t("buy.browseDraws")}</Link>
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
      setError(err.response?.data?.message || t("buy.step1.couldNotStart"));
    } finally {
      setSubmitting(false);
    }
  };

  // === STEP 2 → STEP 3: upload receipt ===
  const submitReceipt = async () => {
    setError("");
    if (!receipt) { setError(t("buy.step2.receiptRequired")); return; }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("receipt", receipt);
      formData.append("transactionNumber", payment.referenceCode);
      await api.post(`/payments/${payment._id}/receipt`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || t("buy.step2.uploadFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedAccount = methods.find((a) => a.method === payment?.paymentMethod);

  return (
    <div className="bg-surface min-h-[80vh]">
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
        {/* Back link — hidden on success step (no going back after submit) */}
        {step !== 3 && (
          <Link
            to={`/draws/${slug}`}
            className="text-xs text-text-muted hover:text-burgundy inline-flex items-center gap-1 font-semibold mb-3"
          >
            {t("buy.back")}
          </Link>
        )}

        {/* Persistent draw context — visible on steps 1 & 2, hidden on success */}
        {step !== 3 && <DrawContext draw={draw} />}

        {/* Step indicator (labels now always visible) */}
        {step !== 3 && <Stepper step={step} />}

        {/* === STEP 1: Order === */}
        {step === 1 && (
          <div className="space-y-3">
            {/* Quantity */}
            <Card title={t("buy.step1.quantityTitle")}>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-12 h-12 bg-white border border-border rounded-lg text-2xl font-bold hover:border-brand active:scale-95 transition"
                >−</button>
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
                  className="w-12 h-12 bg-white border border-border rounded-lg text-2xl font-bold hover:border-brand active:scale-95 transition"
                >+</button>
              </div>

              {/* Inline price math — no more hidden subtotal */}
              <div className="mt-3 pt-3 border-t border-border text-center text-sm">
                <span className="text-text-muted">{quantity} × </span>
                <span className="font-bold">{draw.ticketPriceETB.toLocaleString()} ETB</span>
                <span className="text-text-muted"> = </span>
                <span className="font-extrabold text-burgundy">{subtotalETB.toLocaleString()} ETB</span>
              </div>

              <p className="text-[11px] text-text-muted mt-2 text-center">{t("buy.step1.maxNote")}</p>
            </Card>

            {/* Payment method — selected expands with next-step preview */}
            <Card title={t("buy.step1.methodTitle")}>
              <div className="space-y-2">
                {methods.length === 0 ? (
                  <div className="text-sm text-text-muted text-center py-4">{t("buy.step1.noMethods")}</div>
                ) : methods.map((m) => {
                  const icon = METHOD_ICONS[m.method] || "💳";
                  const label = m.label || t(`buy.methods.${m.method}`, { defaultValue: m.method });
                  const subtitle = t(`buy.methods.${m.method}Subtitle`, { defaultValue: "" });
                  const selected = method === m.method;
                  return (
                    <button
                      key={m.method}
                      type="button"
                      onClick={() => setMethod(m.method)}
                      className={`w-full block px-3 py-3 rounded-lg border-2 transition text-left ${
                        selected ? "border-brand bg-brand-light/40" : "border-border bg-white hover:border-border-strong"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl flex-shrink-0">{icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="font-bold text-sm">{label}</div>
                            {m.recommended && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-success bg-success-light px-1.5 py-0.5 rounded">
                                {t("buy.step1.forYou")}
                              </span>
                            )}
                          </div>
                          {subtitle && <div className="text-xs text-text-muted">{subtitle}</div>}
                        </div>
                        {selected && <span className="text-brand text-xl flex-shrink-0">✓</span>}
                      </div>

                      {/* Selected method expands with details */}
                      {selected && (
                        <div className="mt-3 pt-3 border-t border-brand/20 text-xs text-text-muted space-y-1.5">
                          <div className="flex items-start gap-2">
                            <span className="flex-shrink-0">⏱</span>
                            <span>{t("buy.step1.processingHint", { defaultValue: "Usually approved within 2–4 hours after receipt review" })}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="flex-shrink-0">📋</span>
                            <span>{t("buy.step1.nextStepHint", { defaultValue: "Next step: you'll see the account number to send to + upload your receipt" })}</span>
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Promo code */}
            <Card title={t("buy.step1.promoTitle")}>
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder={t("buy.step1.promoPlaceholder")}
                className="w-full bg-white border border-border focus:border-brand outline-none rounded-md px-3 py-2.5 text-sm font-mono uppercase"
              />
              {promoValid?.valid && (
                <p className="text-xs text-green-700 font-semibold mt-1">
                  {t("buy.step1.promoApplied", { name: promoValid.streamerName })}
                  {promoValid.playerDiscountPercent > 0 &&
                    t("buy.step1.promoDiscount", { percent: promoValid.playerDiscountPercent })
                  }
                </p>
              )}
              {promoValid && !promoValid.valid && promoCode.trim() && (
                <p className="text-xs text-danger mt-1.5">{t("buy.step1.promoInvalid")}</p>
              )}
            </Card>

            {/* Total */}
            <div className="bg-burgundy text-white rounded-xl p-4">
              <div className="flex justify-between text-sm opacity-80 mb-1">
                <span>{t("buy.step1.subtotal", { qty: quantity, price: draw.ticketPriceETB.toLocaleString() })}</span>
                <span>{subtotalETB.toLocaleString()} ETB</span>
              </div>
              {discountETB > 0 && (
                <div className="flex justify-between text-sm text-amber-300 mb-1">
                  <span>{t("buy.step1.discount")}</span>
                  <span>− {discountETB.toLocaleString()} ETB</span>
                </div>
              )}
              <div className="flex justify-between items-end pt-2 border-t border-white/20">
                <span className="text-sm font-semibold">{t("buy.step1.total")}</span>
                <span className="text-2xl font-extrabold">{totalETB.toLocaleString()} <span className="text-sm opacity-70">ETB</span></span>
              </div>
            </div>

            {error && <div className="bg-danger-light text-danger text-sm px-3 py-2 rounded-md">{error}</div>}

            <button
              onClick={startPayment}
              disabled={submitting || !method}
              className="w-full bg-brand text-white font-bold py-3.5 rounded-lg hover:bg-brand-dark transition shadow-gold disabled:opacity-50 text-base"
            >
              {submitting ? t("buy.step1.starting") : t("buy.step1.continue")}
            </button>
          </div>
        )}

        {/* === STEP 2: Pay + Upload === */}
        {step === 2 && payment && (
          <div className="space-y-3">
            {/* Amount + reference */}
            <Card title={t("buy.step2.amountTitle")}>
              <div className="text-center py-2">
                <div className="text-3xl font-extrabold text-burgundy">{payment.totalETB.toLocaleString()} <span className="text-base font-normal text-text-muted">ETB</span></div>
                {payment.displayCurrency !== "ETB" && (
                  <div className="text-xs text-text-faint mt-0.5">
                    {t("buy.step2.approx", { amount: payment.displayAmount, currency: payment.displayCurrency })}
                  </div>
                )}
              </div>
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="text-[10px] text-amber-900 font-bold uppercase tracking-wider mb-1">{t("buy.step2.referenceNote")}</div>
                <div className="flex items-center justify-between gap-2">
                  <code className="font-mono font-extrabold text-lg text-burgundy break-all">{payment.referenceCode}</code>
                  <CopyButton value={payment.referenceCode} label={t("buy.step2.copy")} />
                </div>
              </div>
            </Card>

            {/* Send to */}
            {selectedAccount && (
              <Card title={t("buy.step2.sendTo", { label: selectedAccount.label })}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 p-3 bg-white border border-border rounded-lg">
                    <div className="min-w-0">
                      <div className="text-[10px] text-text-muted uppercase tracking-wider">{t("buy.step2.accountNumber")}</div>
                      <code className="font-mono font-bold text-sm break-all">{selectedAccount.accountNumber}</code>
                    </div>
                    <CopyButton value={selectedAccount.accountNumber.replace(/\s/g, "")} label={t("buy.step2.copy")} />
                  </div>
                  <div className="flex items-center justify-between gap-2 p-3 bg-white border border-border rounded-lg">
                    <div className="min-w-0">
                      <div className="text-[10px] text-text-muted uppercase tracking-wider">{t("buy.step2.accountName")}</div>
                      <div className="font-semibold text-sm truncate">{selectedAccount.accountName}</div>
                    </div>
                    <CopyButton value={selectedAccount.accountName} label={t("buy.step2.copy")} />
                  </div>
                </div>
                {selectedAccount.instructions && (
                  <p className="text-xs text-text-muted mt-3 leading-relaxed">{selectedAccount.instructions}</p>
                )}
              </Card>
            )}

            {/* Upload */}
            <Card title={t("buy.step2.uploadTitle")}>
              <label className="block text-xs font-semibold mb-1.5">{t("buy.step2.receiptLabel")}</label>
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
                    <div className="text-xs text-text-muted">{(receipt.size / 1024).toFixed(0)} KB · {t("buy.step2.tapToChange")}</div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-3xl mb-1 opacity-50">📤</div>
                    <div className="text-sm font-semibold">{t("buy.step2.tapToUpload")}</div>
                    <div className="text-[11px] text-text-muted mt-0.5">{t("buy.step2.fileTypes")}</div>
                  </div>
                )}
              </label>
            </Card>

            {error && <div className="bg-danger-light text-danger text-sm px-3 py-2 rounded-md">{error}</div>}

            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                disabled={submitting}
                className="px-4 py-3 bg-white border border-border rounded-lg font-semibold text-sm hover:bg-surface"
              >
                {t("buy.step2.back")}
              </button>
              <button
                onClick={submitReceipt}
                disabled={submitting || !receipt}
                className="flex-1 bg-brand text-white font-bold py-3 rounded-lg hover:bg-brand-dark transition shadow-gold disabled:opacity-50 text-base"
              >
                {submitting ? t("buy.step2.submitting") : t("buy.step2.submit")}
              </button>
            </div>
          </div>
        )}

        {/* === STEP 3: Done — full-bleed celebration === */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Hero success card */}
            <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-burgundy rounded-3xl p-8 sm:p-12 text-center shadow-2xl relative overflow-hidden">
              {/* Decorative sparkles in background */}
              <div className="absolute inset-0 pointer-events-none opacity-30">
                <div className="absolute top-6 left-6 text-2xl">✨</div>
                <div className="absolute top-10 right-10 text-xl">🎉</div>
                <div className="absolute bottom-8 left-12 text-xl">🎊</div>
                <div className="absolute bottom-6 right-6 text-2xl">✨</div>
                <div className="absolute top-1/2 left-4 text-lg">⭐</div>
                <div className="absolute top-1/3 right-6 text-lg">⭐</div>
              </div>

              <div className="relative">
                {/* Big checkmark */}
                <div className="w-24 h-24 bg-white rounded-full mx-auto mb-5 flex items-center justify-center text-5xl shadow-lg ring-4 ring-white/30">
                  <span className="text-burgundy">✓</span>
                </div>

                <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">
                  {t("buy.step3.title")}
                </h2>
                <p className="text-burgundy/80 text-base sm:text-lg leading-relaxed max-w-md mx-auto mb-6">
                  {t("buy.step3.bodyPart1")}{" "}
                  <strong>{t("buy.step3.bodyHours")}</strong>
                  {t("buy.step3.bodyPart2")}{" "}
                  <strong>{t("buy.step3.bodyMyTickets")}</strong>
                  {t("buy.step3.bodyPart3")}
                </p>

                {/* Reference code */}
                <div className="bg-white/40 backdrop-blur rounded-2xl p-4 mb-6 max-w-xs mx-auto border-2 border-white/60">
                  <div className="text-[10px] uppercase tracking-[0.2em] font-bold mb-1 text-burgundy/70">
                    {t("buy.step3.reference")}
                  </div>
                  <div className="font-mono font-extrabold text-2xl text-burgundy">
                    {payment.referenceCode}
                  </div>
                  <div className="text-xs text-burgundy/70 mt-1.5">
                    {t("buy.step3.saveTip")}
                  </div>
                </div>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-2 max-w-sm mx-auto">
                  <Link
                    to="/my-payments"
                    className="flex-1 bg-burgundy text-white font-bold py-3.5 rounded-lg hover:bg-burgundy-dark transition text-sm shadow-md"
                  >
                    {t("buy.step3.viewMyPayments")}
                  </Link>
                  <Link
                    to="/draws"
                    className="flex-1 bg-white/80 backdrop-blur border border-burgundy/30 text-burgundy font-semibold py-3.5 rounded-lg hover:bg-white transition text-sm"
                  >
                    {t("buy.step3.browseMore")}
                  </Link>
                </div>
              </div>
            </div>

            {/* What's next timeline */}
            <div className="bg-white border border-border rounded-2xl p-5 sm:p-6">
              <h3 className="font-bold text-sm mb-4 uppercase tracking-wider text-text-muted">
                {t("buy.step3.whatsNext", { defaultValue: "What's next?" })}
              </h3>
              <ol className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 bg-brand-light text-brand-dark rounded-full flex items-center justify-center font-bold text-sm">1</span>
                  <div className="flex-1 pt-0.5">
                    <div className="font-semibold text-sm">
                      {t("buy.step3.next1Title", { defaultValue: "We verify your transfer" })}
                    </div>
                    <div className="text-xs text-text-muted mt-0.5">
                      {t("buy.step3.next1Body", { defaultValue: "Usually within 2–4 hours during business hours" })}
                    </div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 bg-brand-light text-brand-dark rounded-full flex items-center justify-center font-bold text-sm">2</span>
                  <div className="flex-1 pt-0.5">
                    <div className="font-semibold text-sm">
                      {t("buy.step3.next2Title", { defaultValue: "Your quantum tickets are generated" })}
                    </div>
                    <div className="text-xs text-text-muted mt-0.5">
                      {t("buy.step3.next2Body", { defaultValue: "Each with a unique QR code, viewable in My Tickets" })}
                    </div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 bg-brand-light text-brand-dark rounded-full flex items-center justify-center font-bold text-sm">3</span>
                  <div className="flex-1 pt-0.5">
                    <div className="font-semibold text-sm">
                      {t("buy.step3.next3Title", { defaultValue: "Wait for the draw" })}
                    </div>
                    <div className="text-xs text-text-muted mt-0.5">
                      {t("buy.step3.next3Body", { defaultValue: "Winners are announced live and contacted via WhatsApp" })}
                    </div>
                  </div>
                </li>
              </ol>
            </div>

            {/* You entered — reinforces what they bought into */}
            <div className="bg-burgundy/5 border border-burgundy/20 rounded-2xl p-5">
              <div className="text-[10px] uppercase tracking-[0.2em] text-burgundy font-bold mb-2">
                {t("buy.step3.youEntered", { defaultValue: "You entered" })}
              </div>
              <div className="font-extrabold text-burgundy mb-3">{draw.title}</div>
              <div className="space-y-1 text-sm">
                {draw.prizes?.slice(0, 3).map((prize, i) => {
                  const medals = ["🥇", "🥈", "🥉"];
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span>{medals[i]}</span>
                      <span className="text-text-muted">{prize.name || prize.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   DrawContext — persistent header showing prizes + countdown
   (visible across all 3 steps so the player never loses sight
    of what they're buying into)
───────────────────────────────────────────────────────────── */
function DrawContext({ draw }) {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState(() => computeTimeLeft(draw.drawDate));

  useEffect(() => {
    if (!draw.drawDate) return;
    const tid = setInterval(() => setTimeLeft(computeTimeLeft(draw.drawDate)), 1000);
    return () => clearInterval(tid);
  }, [draw.drawDate]);

  const medals = ["🥇", "🥈", "🥉", "🏅"];
  const prizes = draw.prizes?.slice(0, 4) || [];

  return (
    <div className="bg-gradient-to-br from-burgundy to-burgundy-dark text-white rounded-2xl p-4 sm:p-5 mb-5 shadow-lg relative overflow-hidden">
      {/* gold corner accent */}
      <div
        className="absolute top-0 right-0 w-24 h-24 pointer-events-none"
        style={{ background: "radial-gradient(circle at top right, rgba(245,158,11,0.25) 0%, transparent 70%)" }}
      />

      <div className="flex items-start justify-between gap-3 mb-3 relative">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
            {draw.title}
          </div>
          <div className="text-xs text-white/70 mt-1">
            {t("buy.context.ticketPrice", {
              defaultValue: "{{price}} ETB per ticket",
              price: draw.ticketPriceETB.toLocaleString(),
            })}
          </div>
        </div>

        {timeLeft && !timeLeft.expired && (
          <div className="text-right flex-shrink-0 bg-white/10 backdrop-blur rounded-lg px-3 py-1.5">
            <div className="text-[9px] uppercase tracking-wider opacity-70">
              {t("buy.context.closesIn", { defaultValue: "Closes in" })}
            </div>
            <div className="text-sm font-extrabold font-mono">
              {timeLeft.days}d {String(timeLeft.hours).padStart(2, "0")}h {String(timeLeft.minutes).padStart(2, "0")}m
            </div>
          </div>
        )}

        {timeLeft && timeLeft.expired && (
          <div className="text-right flex-shrink-0 bg-danger/30 rounded-lg px-3 py-1.5">
            <div className="text-xs font-bold uppercase">
              {t("buy.context.closed", { defaultValue: "Closed" })}
            </div>
          </div>
        )}
      </div>

      {prizes.length > 0 && (
        <div className="space-y-1.5 text-sm relative">
          {prizes.map((prize, i) => {
            const amount = prize.prizeAmount ?? prize.value;
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="flex-shrink-0 text-base">{medals[i]}</span>
                <span className="font-semibold truncate flex-1">{prize.name || prize.title}</span>
                {amount && (
                  <span className="text-amber-300 text-xs font-bold flex-shrink-0">
                    {amount.toLocaleString()} ETB
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function computeTimeLeft(drawDate) {
  if (!drawDate) return null;
  const now = Date.now();
  const target = new Date(drawDate).getTime();
  const diff = target - now;
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    expired: false,
  };
}

function Card({ title, children }) {
  return (
    <div className="bg-white border border-border rounded-xl p-4 sm:p-5">
      <h3 className="font-bold text-sm mb-3">{title}</h3>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Stepper — labels now visible on mobile too (was hidden sm:inline)
───────────────────────────────────────────────────────────── */
function Stepper({ step }) {
  const { t } = useTranslation();
  const steps = [
    { n: 1, label: t("buy.stepper.order") },
    { n: 2, label: t("buy.stepper.pay") },
    { n: 3, label: t("buy.stepper.done") },
  ];
  return (
    <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-5">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center gap-1.5 sm:gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
              step >= s.n ? "bg-brand text-white" : "bg-surface-2 text-text-muted"
            }`}
          >
            {step > s.n ? "✓" : s.n}
          </div>
          <span
            className={`text-[10px] sm:text-xs font-semibold ${
              step >= s.n ? "text-text" : "text-text-muted"
            }`}
          >
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <div className={`w-4 sm:w-12 h-0.5 ${step > s.n ? "bg-brand" : "bg-surface-2"}`}></div>
          )}
        </div>
      ))}
    </div>
  );
}