
import { useState, useRef, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";

export default function Layout({ children }) {
  const { user, clear } = useAuthStore();
  const nav = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleSignOut = () => {
    clear();
    setMenuOpen(false);
    nav("/");
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      {/* Top promo bar */}
      <div className="bg-burgundy text-white text-center text-xs py-1.5 px-4">
        🎰 Launch draw is live — iPhone 15 Pro Max + 100k ETB · <Link to="/draws" className="underline font-semibold ml-1">Buy a ticket →</Link>
      </div>

      <nav className="border-b border-border bg-bg/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-extrabold text-xl tracking-tight">
            <div className="w-9 h-9 bg-gradient-to-br from-brand to-brand-dark rounded-lg flex items-center justify-center text-white text-base font-extrabold shadow-gold">L</div>
            <span>LuckyET</span>
          </Link>

          <div className="hidden md:flex items-center gap-6 text-sm font-semibold">
            <NavLink to="/draws" className={({ isActive }) => isActive ? "text-brand-dark" : "text-text hover:text-brand-dark"}>
              Buy Lotteries
            </NavLink>
            <NavLink to="/how-it-works" className={({ isActive }) => isActive ? "text-brand-dark" : "text-text hover:text-brand-dark"}>
              How it Works
            </NavLink>
            {user && (
              <NavLink to="/dashboard" className={({ isActive }) => isActive ? "text-brand-dark" : "text-text hover:text-brand-dark"}>
                Dashboard
              </NavLink>
            )}
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface transition text-sm"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-brand to-brand-dark text-white rounded-full flex items-center justify-center text-xs font-bold shadow-soft">
                    {user.fullName.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-semibold hidden sm:inline">{user.fullName.split(" ")[0]}</span>
                  <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-border rounded-lg shadow-card overflow-hidden">
                    <div className="px-4 py-3 border-b border-border bg-surface">
                      <div className="text-sm font-semibold truncate">{user.fullName}</div>
                      <div className="text-xs text-text-muted truncate">{user.email}</div>
                    </div>
                    <div className="py-1">
                      <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm hover:bg-surface">Dashboard</Link>
                      <Link to="/my-tickets" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm hover:bg-surface">My tickets</Link>
                      <Link to="/my-payments" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm hover:bg-surface">My payments</Link>
                    </div>
                    <div className="border-t border-border py-1">
                      <button onClick={handleSignOut} className="block w-full text-left px-4 py-2 text-sm text-danger hover:bg-danger-light">
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="text-sm font-semibold text-text-muted hover:text-text px-3 py-2">Login</Link>
                <Link to="/register" className="text-sm bg-brand text-white font-bold px-4 py-2 rounded-lg hover:bg-brand-dark transition shadow-gold">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1">{children}</main>

      <footer className="bg-burgundy text-white pt-12 pb-6 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-brand to-brand-dark rounded-lg flex items-center justify-center text-white text-sm font-extrabold">L</div>
                <span className="font-extrabold text-lg">LuckyET</span>
              </div>
              <p className="text-white/70 text-xs leading-relaxed mb-4">
                Quantum-verifiable lottery built for the Ethiopian & Eritrean diaspora across the GCC.
              </p>
              <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full text-xs">
                <span className="w-2 h-2 bg-amber-300 rounded-full"></span>
                Powered by ANU Quantum Lab
              </div>
            </div>

            <div>
              <div className="font-bold mb-3 text-amber-300 text-sm uppercase tracking-wider">Explore</div>
              <ul className="space-y-2 text-white/80 text-sm">
                <li><Link to="/draws" className="hover:text-white">Buy lotteries</Link></li>
                <li><Link to="/how-it-works" className="hover:text-white">How it works</Link></li>
                <li><Link to="/draws" className="hover:text-white">Results</Link></li>
              </ul>
            </div>

            <div>
              <div className="font-bold mb-3 text-amber-300 text-sm uppercase tracking-wider">Resources</div>
              <ul className="space-y-2 text-white/80 text-sm">
                <li>FAQ</li>
                <li>Help & support</li>
                <li>Play responsibly</li>
              </ul>
            </div>

            <div>
              <div className="font-bold mb-3 text-amber-300 text-sm uppercase tracking-wider">Languages</div>
              <ul className="space-y-2 text-white/80 text-sm">
                <li>English</li>
                <li>አማርኛ (Amharic)</li>
                <li>ትግርኛ (Tigrinya)</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-white/60">
            <div>© {new Date().getFullYear()} LuckyET. All rights reserved.</div>
            <div className="flex items-center gap-4">
              <span className="bg-white/10 px-2 py-1 rounded font-bold">18+ only</span>
              <span>Play responsibly</span>
              <span className="hover:text-white cursor-pointer">Privacy</span>
              <span className="hover:text-white cursor-pointer">Terms</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
