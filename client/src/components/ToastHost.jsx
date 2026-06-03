import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { onSocketEvent } from "../lib/socket";

export default function ToastHost() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const offVerified = onSocketEvent("payment.verified", (data) => {
      console.log("[ToastHost] payment.verified received:", data);
      addToast({
        id: `verified-${data.paymentId}-${Date.now()}`,
        type: "success",
        title: "🎉 Tickets confirmed!",
        message: `Your payment for ${data.drawTitle || "the draw"} is approved.`,
        ticketNumbers: data.ticketNumbers || [],
        ticketCount: data.ticketCount || data.quantity || 1,
        action: { label: "View my tickets", to: "/my-tickets" },
      });
      window.dispatchEvent(new CustomEvent("data-refresh", { detail: { source: "payment.verified" } }));
    });

    const offRejected = onSocketEvent("payment.rejected", (data) => {
      console.log("[ToastHost] payment.rejected received:", data);
      addToast({
        id: `rejected-${data.paymentId}-${Date.now()}`,
        type: "danger",
        title: "Payment couldn't be verified",
        message: data.reason || "Please contact support.",
        action: { label: "View my payments", to: "/my-payments" },
      });
      window.dispatchEvent(new CustomEvent("data-refresh", { detail: { source: "payment.rejected" } }));
    });

    return () => { offVerified(); offRejected(); };
  }, []);

  function addToast(toast) {
    setToasts((prev) => prev.find((t) => t.id === toast.id) ? prev : [...prev, toast]);
    // Auto-dismiss after 10s (longer so player can read ticket numbers)
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== toast.id)), 10000);
  }

  function dismiss(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  if (toasts.length === 0) return null;

  // Show the most recent toast as a celebration card
  const topToast = toasts[toasts.length - 1];

  return (
    <>
      {/* Soft backdrop — clickable to dismiss */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[9998] animate-fadeIn"
        onClick={() => dismiss(topToast.id)}
      />

      {/* Centered celebration card */}
      <div className="fixed inset-x-0 top-1/2 -translate-y-1/2 z-[9999] px-4 flex justify-center pointer-events-none">
        <div
          className={`pointer-events-auto bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-popIn border-t-4 ${
            topToast.type === "success" ? "border-green-500" : "border-red-500"
          }`}
        >
          {/* Header */}
          <div className={`px-6 py-5 ${topToast.type === "success" ? "bg-gradient-to-br from-amber-50 to-amber-100" : "bg-red-50"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h2 className="font-extrabold text-xl mb-1">{topToast.title}</h2>
                <p className="text-sm text-gray-700">{topToast.message}</p>
              </div>
              <button
                onClick={() => dismiss(topToast.id)}
                className="text-gray-400 hover:text-gray-700 text-2xl leading-none -mt-1 -mr-1 p-1"
                aria-label="Dismiss"
              >×</button>
            </div>
          </div>

          {/* Ticket numbers — only for success */}
          {topToast.type === "success" && topToast.ticketNumbers.length > 0 && (
            <div className="px-6 py-5 bg-white">
              <div className="text-[10px] uppercase tracking-widest font-bold text-amber-700 mb-2">
                Your quantum {topToast.ticketCount > 1 ? "tickets" : "ticket"}
              </div>
              <div className="space-y-1.5">
                {topToast.ticketNumbers.map((num, i) => (
                  <div
                    key={i}
                    className="font-mono font-bold text-base bg-gradient-to-r from-amber-50 to-white border border-amber-200 rounded-md px-3 py-2 break-all"
                  >
                    {num}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action */}
          {topToast.action && (
            <div className="px-6 pb-5">
              <Link
                to={topToast.action.to}
                onClick={() => dismiss(topToast.id)}
                className={`block w-full text-center font-bold py-3 rounded-lg transition active:scale-95 ${
                  topToast.type === "success"
                    ? "bg-burgundy text-white hover:bg-burgundy-dark"
                    : "bg-red-500 text-white hover:bg-red-600"
                }`}
              >
                {topToast.action.label} →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Stacked older toasts (compact, bottom right) */}
      {toasts.length > 1 && (
        <div className="fixed bottom-4 right-4 z-[9997] flex flex-col gap-2 max-w-xs">
          {toasts.slice(0, -1).map((t) => (
            <div
              key={t.id}
              className={`bg-white border-l-4 rounded-md shadow-lg px-3 py-2 text-xs flex items-center justify-between gap-2 ${
                t.type === "success" ? "border-green-500" : "border-red-500"
              }`}
            >
              <span className="font-semibold truncate">{t.title}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="text-gray-400 hover:text-gray-700"
              >×</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
