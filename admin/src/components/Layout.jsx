
import { useState, useEffect } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/auth";

const NAV = [
  { to: "/", label: "Overview", icon: "▦" },
  { to: "/payments/pending", label: "Pending payments", icon: "◔" },
  { to: "/payments", label: "All payments", icon: "≡" },
  { to: "/draws", label: "Draws", icon: "★" },
  { to: "/settings", label: "Settings", icon: "⚙" },
];

export default function Layout({ children }) {
  const { user, clear } = useAuthStore();
  const nav = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile drawer open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  // Listen for session-expired event from API interceptor
  useEffect(() => {
    const handler = (e) => {
      const reason = e.detail?.reason;
      alert(reason === "idle"
        ? "Signed out due to inactivity. Please sign in again."
        : "Your session expired. Please sign in again.");
      nav("/login");
    };
    window.addEventListener("session-expired", handler);
    return () => window.removeEventListener("session-expired", handler);
  }, [nav]);

  const handleSignOut = () => {
    clear();
    nav("/login");
  };

  const isActive = (to) => {
    if (to === "/") return location.pathname === "/";
    return location.pathname === to || location.pathname.startsWith(to + "/");
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-30 bg-white border-b border-border flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <div className="w-7 h-7 bg-brand rounded-md flex items-center justify-center text-white text-sm font-bold">L</div>
          <span className="text-sm">LuckyET <span className="text-text-muted font-normal">· Admin</span></span>
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -mr-2 hover:bg-surface rounded-md"
          aria-label="Open menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
      </div>

      <div className="flex">
        {/* Sidebar — desktop: fixed left, mobile: slide-out drawer */}
            <aside
              className={`
                fixed md:static inset-y-0 left-0 z-50
                w-64 bg-white border-r border-border flex flex-col
                transform transition-transform duration-200
                ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
                h-screen md:min-h-screen
              `}
            >
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <div className="w-7 h-7 bg-brand rounded-md flex items-center justify-center text-white text-sm font-bold">L</div>
              <div>
                <div className="text-sm">LuckyET</div>
                <div className="text-[10px] text-text-muted font-normal -mt-0.5">Admin console</div>
              </div>
            </Link>
            <button
              onClick={() => setMobileOpen(false)}
              className="md:hidden p-1 hover:bg-surface rounded text-text-muted"
              aria-label="Close menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition ${
                  isActive(item.to)
                    ? "bg-brand-light text-brand font-medium"
                    : "text-text-muted hover:bg-surface hover:text-text"
                }`}
              >
                <span className="w-4 text-center text-xs opacity-60">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="border-t border-border p-3">
            <div className="px-2 py-2 flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-brand-light text-brand rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                {user?.fullName?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{user?.fullName}</div>
                <div className="text-[10px] text-text-muted uppercase tracking-wide truncate">{user?.role?.replace("_", " ")}</div>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full text-left text-xs text-danger hover:bg-danger-light px-3 py-2 rounded-md transition"
            >
              Sign out
            </button>
          </div>
        </aside>

        {/* Backdrop for mobile drawer */}
        {mobileOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/40 z-40"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Main */}
        <main className="flex-1 min-w-0 overflow-x-hidden">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
