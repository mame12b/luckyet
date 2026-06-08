import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";

const PHONE_CODES = [
  { code: "+971", flag: "🇦🇪", label: "UAE" },
  { code: "+966", flag: "🇸🇦", label: "Saudi Arabia" },
  { code: "+965", flag: "🇰🇼", label: "Kuwait" },
  { code: "+974", flag: "🇶🇦", label: "Qatar" },
  { code: "+251", flag: "🇪🇹", label: "Ethiopia" },
  { code: "+291", flag: "🇪🇷", label: "Eritrea" },
  { code: "+1",   flag: "🇺🇸", label: "USA/Canada" },
  { code: "+44",  flag: "🇬🇧", label: "UK" },
];

export default function ForgotPassword() {
  const nav = useNavigate();
  const [phoneCode, setPhoneCode] = useState(PHONE_CODES[0]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [contactMethod, setContactMethod] = useState("WhatsApp");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const digits = phoneNumber.replace(/\D/g, "");
    if (digits.length < 6) { setError("Enter a valid phone number"); return; }
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", {
        phone: `${phoneCode.code}${digits}`,
        contactMethod,
        reason: reason.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-surface min-h-[80vh] flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-white border border-border rounded-2xl p-6 shadow-card text-center">
            <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl">⏳</div>
            <h1 className="text-xl font-extrabold mb-2">Request submitted</h1>
            <p className="text-sm text-text-muted mb-4 leading-relaxed">
              Our team will review your request and contact you via <strong>{contactMethod}</strong> with
              a one-time code. This usually takes a few hours during business hours.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 mb-4">
              💡 When you receive the code, come back to the <Link to="/reset-password" className="font-bold underline">reset password page</Link> and choose your new password.
            </div>
            <Link to="/login" className="block w-full bg-brand text-white font-bold py-2.5 rounded-md hover:bg-brand-dark text-sm">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface min-h-[80vh] flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white border border-border rounded-2xl p-5 sm:p-7 shadow-card">
          <h1 className="text-2xl font-extrabold mb-1">Forgot password?</h1>
          <p className="text-text-muted text-sm mb-5">
            Our team will verify your identity and send you a one-time code so you can set a new password yourself.
          </p>

          <form onSubmit={submit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold mb-1">Phone number</label>
              <div className="flex gap-2">
                <select
                  value={phoneCode.code}
                  onChange={(e) => setPhoneCode(PHONE_CODES.find(c => c.code === e.target.value) || PHONE_CODES[0])}
                  className="bg-white border border-border focus:border-brand outline-none rounded-md px-2 py-2.5 text-sm font-mono"
                >
                  {PHONE_CODES.map(c => (
                    <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  placeholder="50 123 4567"
                  className="flex-1 bg-white border border-border focus:border-brand outline-none rounded-md px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">How should we contact you?</label>
              <select
                value={contactMethod}
                onChange={(e) => setContactMethod(e.target.value)}
                className="w-full bg-white border border-border focus:border-brand outline-none rounded-md px-3 py-2.5 text-sm"
              >
                <option value="WhatsApp">WhatsApp</option>
                <option value="Telegram">Telegram</option>
                <option value="Phone call">Phone call</option>
                <option value="Email">Email</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Anything else? <span className="text-text-faint font-normal">(optional)</span></label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows="3"
                placeholder="e.g. I forgot my password and got locked out"
                className="w-full bg-white border border-border focus:border-brand outline-none rounded-md px-3 py-2 text-sm resize-none"
              />
            </div>

            {error && <div className="bg-danger-light text-danger text-xs px-3 py-2 rounded-md">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand text-white font-bold py-3 rounded-lg hover:bg-brand-dark transition shadow-gold disabled:opacity-50 text-sm"
            >
              {loading ? "Submitting..." : "Submit reset request"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-text-muted mt-5">
          Remembered? <Link to="/login" className="text-brand-dark font-semibold hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
