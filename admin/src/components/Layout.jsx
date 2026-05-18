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

  const handleSignOut = () => {
    clear();
    nav("/login");
  };

  // Custom active check — /draws should also light up on /draws/:id and /draws/new
  const isActive = (to) => {
    if (to === "/") return location.pathname === "/";
    return location.pathname === to || location.pathname.startsWith(to + "/");
  };

  return (
    <div className="min-h-screen flex bg-surface">
      <aside className="w-60 bg-white border-r border-border flex flex-col">
        <div className="px-5 py-4 border-b border-border">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <div className="w-7 h-7 bg-brand rounded-md flex items-center justify-center text-white text-sm font-bold">L</div>
            <div>
              <div className="text-sm">LuckyET</div>
              <div className="text-[10px] text-text-muted font-normal -mt-0.5">Admin console</div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition ${
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
            <div className="w-8 h-8 bg-brand-light text-brand rounded-full flex items-center justify-center text-xs font-semibold">
              {user?.fullName?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{user?.fullName}</div>
              <div className="text-[10px] text-text-muted uppercase tracking-wide">{user?.role?.replace("_", " ")}</div>
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

      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}