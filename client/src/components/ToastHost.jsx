import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSocket } from "../lib/socket";

/**
 * Listens for socket events and shows toasts.
 * Mount once at the app root.
 */
export default function ToastHost() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onVerified = (data) => {
      addToast({
        id: `verified-${data.paymentId}`,
        type: "success",
        title: "🎉 Payment approved!",
        message: `Your ${data.quantity} ticket${data.quantity > 1 ? "s" : ""} for ${data.drawTitle || "the draw"} are confirmed.`,
        action: { label: "View tickets", to: "/my-tickets" },
      });
      // Refresh any data that depends on payment/ticket state
      window.dispatchEvent(new CustomEvent("data-refresh", { detail: { source: "payment.verified" } }));
    };

    const onRejected = (data) => {
      addToast({
        id: `rejected-${data.paymentId}`,
        type: "danger",
        title: "Payment couldn't be verified",
        message: data.reason || "Please contact support.",
        action: { label: "View payments", to: "/my-payments" },
      });
      window.dispatchEvent(new CustomEvent("data-refresh", { detail: { source: "payment.rejected" } }));
    };

    socket.on("payment.verified", onVerified);
    socket.on("payment.rejected", onRejected);

    return () => {
      socket.off("payment.verified", onVerified);
      socket.off("payment.rejected", onRejected);
    };
  }, []);

  function addToast(toast) {
    setToasts((prev) => {
      // Dedupe by id
      if (prev.find((t) => t.id === toast.id)) return prev;
      return [...prev, toast];
    });
    // Auto-dismiss after 8 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 8000);
  }

  function dismiss(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto bg-white border-2 rounded-xl shadow-2xl p-4 animate-slideIn ${
            t.type === "success" ? "border-success" : "border-danger"
          }`}
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="font-bold text-sm">{t.title}</div>
            <button
              onClick={() => dismiss(t.id)}
              className="text-text-faint hover:text-text-muted text-lg leading-none"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-text-muted leading-relaxed">{t.message}</p>
          {t.action && (
            <Link
              to={t.action.to}
              onClick={() => dismiss(t.id)}
              className="inline-block mt-3 text-xs font-bold text-brand-dark hover:underline"
            >
              {t.action.label} →
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
