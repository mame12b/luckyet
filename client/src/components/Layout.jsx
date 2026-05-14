
import { Link, NavLink } from "react-router-dom";
import { useAuthStore } from "../store/auth";

export default function Layout({ children }) {
  const { user, clear } = useAuthStore();

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      <nav className="border-b border-border bg-bg/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold text-lg tracking-tight">
            <div className="w-7 h-7 bg-brand rounded-md flex items-center justify-center text-white text-sm font-bold">L</div>
            <span>LuckyET</span>
          </Link>

          <div className="hidden md:flex items-center gap-7 text-sm font-medium">
            <NavLink to="/draws" className={({ isActive }) => isActive ? "text-brand" : "text-text-muted hover:text-text"}>
              Active Draws
            </NavLink>
            <NavLink to="/how-it-works" className={({ isActive }) => isActive ? "text-brand" : "text-text-muted hover:text-text"}>
              How it Works
            </NavLink>
            {user && (
              <NavLink to="/my-tickets" className={({ isActive }) => isActive ? "text-brand" : "text-text-muted hover:text-text"}>
                My Tickets
              </NavLink>
            )}
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="text-sm text-text-muted hidden md:block">{user.fullName.split(" ")[0]}</span>
                <button onClick={clear} className="text-sm px-3.5 py-1.5 text-text-muted hover:text-text rounded-md transition">
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm text-text-muted hover:text-text px-3.5 py-1.5">Sign in</Link>
                <Link to="/register" className="text-sm bg-brand text-white font-medium px-4 py-2 rounded-md hover:bg-brand-dark transition">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border py-10 px-6 bg-surface">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8 text-sm">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-brand rounded flex items-center justify-center text-white text-xs font-bold">L</div>
              <span className="font-semibold">LuckyET</span>
            </div>
            <p className="text-text-muted text-xs leading-relaxed">
              Quantum-verifiable lottery built for the Ethiopian & Eritrean diaspora.
            </p>
          </div>
          <div>
            <div className="font-medium mb-3">Platform</div>
            <ul className="space-y-2 text-text-muted text-xs">
              <li><Link to="/draws" className="hover:text-text">Active draws</Link></li>
              <li><Link to="/how-it-works" className="hover:text-text">How it works</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-medium mb-3">Legal</div>
            <ul className="space-y-2 text-text-muted text-xs">
              <li>Terms of service</li>
              <li>Privacy policy</li>
              <li>Play responsibly — 18+ only</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-border text-xs text-text-faint">
          © {new Date().getFullYear()} LuckyET. All rights reserved.
        </div>
      </footer>
    </div>
  );
}