import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate, useLocation, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { connectSocket, disconnectSocket, onSocketEvent } from "../lib/socket";

const NAV = [
  { to: "/", label: "Overview", icon: "▦" },
  { to: "/payments/pending", label: "Pending payments", icon: "⌃" },
  { to: "/payments", label: "All payments", icon: "≡" },
  { to: "/users", label: "Users", icon: "◔" },
  { to: "/promoters", label: "Promoters", icon: "◯" },
  { to: "/payouts", label: "Payouts", icon: "$" },
  { to: "/draws", label: "Draws", icon: "✦" },
  { to: "/password-resets", label: "Password resets", icon: "🔑" },
  { to: "/settings", label: "Settings", icon: "⚙" },
];

export default function Layout({children}) {
  const { user, clear } = useAuthStore();
  const accessToken = useAuthStore((s) => s.accessToken);
  const nav = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Lock body scroll while drawer open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  // Session expired listener
  useEffect(() => {
    const handler = (e) => {
      alert(e.detail?.reason === "idle"
        ? "Signed out due to inactivity. Please sign in again."
        : "Your session expired. Please sign in again.");
      clear();
      nav("/login");
    };
    window.addEventListener("session-expired", handler);
    return () => window.removeEventListener("session-expired", handler);
  }, [nav, clear]);

  // Socket.io lifecycle: connect when authed, listen for new pending payments
// Socket.io lifecycle
useEffect(() => {
  if (!user || !accessToken) {
    disconnectSocket();
    return;
  }
  connectSocket();
}, [user, accessToken]);

// Reconnect-safe event listener for new pending payments
useEffect(() => {
  const off = onSocketEvent("payment.pending", () => {
    setPendingCount((c) => c + 1);
  });
  return off;
}, []);

  // Clear badge when admin lands on the pending payments page
  useEffect(() => {
    if (location.pathname === "/payments/pending") setPendingCount(0);
  }, [location.pathname]);

  const handleSignOut = () => {
    clear();
    disconnectSocket();
    setMobileOpen(false);
    nav("/login");
  };

  return (
    <div className="h-screen md:min-h-screen flex bg-surface">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-64 bg-white border-r border-border flex flex-col
          transform transition-transform duration-200
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          h-screen md:min-h-screen
        `}
      >
        {/* Logo + close */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand rounded-md flex items-center justify-center text-white font-bold">E</div>
            <div>
              <div className="font-semibold text-sm leading-tight">EdilPlay</div>
              <div className="text-[10px] text-text-muted uppercase tracking-wider">Admin console</div>
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1 hover:bg-surface rounded text-text-muted"
            aria-label="Close menu"
          >
            ×
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => {
            const isActive = location.pathname === item.to
              || (item.to !== "/" && location.pathname.startsWith(item.to));
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition
                  ${isActive
                    ? "bg-brand-light text-brand-dark"
                    : "text-text hover:bg-surface"}
                `}
              >
                <span className="text-xs opacity-60 w-4">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.to === "/payments/pending" && pendingCount > 0 && (
                  <span className="bg-danger text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[1.25rem] text-center">
                    {pendingCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer with user + sign out */}
        <div className="border-t border-border p-3">
          {user && (
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className="w-8 h-8 bg-brand-light text-brand-dark rounded-full flex items-center justify-center text-xs font-bold">
                {user.fullName?.charAt(0).toUpperCase() || "?"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-xs truncate">{user.fullName}</div>
                <div className="text-[10px] text-text-muted uppercase tracking-wide">{user.role?.replace("_", " ")}</div>
              </div>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="w-full text-left px-3 py-1.5 text-xs text-danger hover:bg-danger-light rounded font-semibold"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col md:ml-0 min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-border px-4 sm:px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-1.5 hover:bg-surface rounded"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
          <div className="font-semibold text-sm md:hidden">EdilPlay · Admin</div>
          <div className="w-7 md:hidden"></div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
