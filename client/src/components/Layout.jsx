import { useState, useRef, useEffect } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/auth";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Layout({ children }) {
  const { t, i18n } = useTranslation();          // ← only change: also pull i18n
  const { user, clear } = useAuthStore();
  const nav = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const profileRef = useRef(null);

  // Nav links are derived inside the component so they re-render on language change
  const NAV_LINKS = [
    { to: "/draws",        label: t("nav.buyLotteries") },
    { to: "/results",      label: t("nav.results") },
    { to: "/how-it-works", label: t("nav.howItWorks") },
  ];

  // Close profile dropdown on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // ── FIX: close mobile drawer whenever language is switched ─────────────
  useEffect(() => {
    const onLangChange = () => setMobileOpen(false);
    i18n.on("languageChanged", onLangChange);
    return () => i18n.off("languageChanged", onLangChange);
  }, [i18n]);

  const handleSignOut = () => {
    clear();
    setProfileOpen(false);
    nav("/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      {/* Top promo banner */}
      <div className="bg-burgundy text-white text-center text-[11px] sm:text-xs py-1.5 px-3">
        <span className="hidden sm:inline">{t("banner.launchDrawFull")}</span>
        <span className="sm:hidden">{t("banner.launchDrawShort")}</span>
        <Link to="/draws" className="underline font-semibold">{t("banner.buyTicketCta")}</Link>
      </div>

      {/* Nav */}
      <nav className="border-b border-border bg-bg/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-extrabold text-lg sm:text-xl tracking-tight">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-brand to-brand-dark rounded-lg flex items-center justify-center text-white text-base font-extrabold shadow-gold">E</div>
            <span>EdilPlay</span>
          </Link>
          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6 text-sm font-semibold">
            {NAV_LINKS.map(l => (
              <NavLink key={l.to} to={l.to}
                className={({ isActive }) => isActive ? "text-brand-dark" : "text-text hover:text-brand-dark transition"}>
                {l.label}
              </NavLink>
            ))}
            {user && (
              <NavLink to="/dashboard"
                className={({ isActive }) => isActive ? "text-brand-dark" : "text-text hover:text-brand-dark transition"}>
                {t("nav.dashboard")}
              </NavLink>
            )}
          </div>
          {/* Right side */}
          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <LanguageSwitcher />
            </div>
            {user ? (
              <div className="relative" ref={profileRef}>
                <button onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface transition text-sm">
                  <div className="w-8 h-8 bg-gradient-to-br from-brand to-brand-dark text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {user.fullName.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-semibold hidden sm:inline">{user.fullName.split(" ")[0]}</span>
                  <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-border rounded-lg shadow-card overflow-hidden">
                    <div className="px-4 py-3 border-b border-border bg-surface">
                      <div className="text-sm font-semibold truncate">{user.fullName}</div>
                      <div className="text-xs text-text-muted truncate">{user.email}</div>
                    </div>
                    <div className="py-1">
                      <Link to="/dashboard" onClick={() => setProfileOpen(false)} className="block px-4 py-2 text-sm hover:bg-surface">{t("nav.dashboard")}</Link>
                      <Link to="/my-tickets" onClick={() => setProfileOpen(false)} className="block px-4 py-2 text-sm hover:bg-surface">{t("nav.myTickets")}</Link>
                      <Link to="/my-payments" onClick={() => setProfileOpen(false)} className="block px-4 py-2 text-sm hover:bg-surface">{t("nav.myPayments")}</Link>
                    </div>
                    <div className="border-t border-border py-1">
                      <button onClick={handleSignOut} className="block w-full text-left px-4 py-2 text-sm text-danger hover:bg-danger-light">
                        {t("nav.signOut")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="hidden sm:inline-block text-sm font-semibold text-text-muted hover:text-text px-3 py-2">{t("nav.login")}</Link>
                <Link to="/register" className="text-sm bg-brand text-white font-bold px-3 sm:px-4 py-2 rounded-lg hover:bg-brand-dark transition shadow-gold">
                  {t("nav.register")}
                </Link>
              </>
            )}
            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 -mr-2 hover:bg-surface rounded-md"
              aria-label={t("nav.openMenu")}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="md:hidden fixed inset-0 bg-black/40 z-50" onClick={() => setMobileOpen(false)} />
          <div className="md:hidden fixed inset-y-0 right-0 w-72 max-w-[85vw] bg-white z-50 flex flex-col animate-slideIn shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <span className="font-bold text-lg">{t("nav.menu")}</span>
              <button onClick={() => setMobileOpen(false)} className="p-1 hover:bg-surface rounded">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-2">
              {NAV_LINKS.map(l => (
                <Link key={l.to} to={l.to}
                  className={`block px-4 py-3 rounded-md text-base font-semibold transition ${
                    location.pathname.startsWith(l.to) ? "bg-brand-light text-brand-dark" : "text-text hover:bg-surface"
                  }`}>
                  {l.label}
                </Link>
              ))}
              {user && (
                <>
                  <div className="border-t border-border my-2"></div>
                  <Link to="/dashboard" className="block px-4 py-3 rounded-md text-base font-semibold text-text hover:bg-surface">{t("nav.dashboard")}</Link>
                  <Link to="/my-tickets" className="block px-4 py-3 rounded-md text-base font-semibold text-text hover:bg-surface">{t("nav.myTickets")}</Link>
                  <Link to="/my-payments" className="block px-4 py-3 rounded-md text-base font-semibold text-text hover:bg-surface">{t("nav.myPayments")}</Link>
                </>
              )}
            </nav>

            {/* Language switcher — drawer auto-closes on language change via i18n listener above */}
            <div className="border-t border-border p-4">
              <div className="text-xs text-text-muted mb-2 font-semibold uppercase tracking-wider">{t("nav.language")}</div>
              <LanguageSwitcher />
            </div>

            {user ? (
              <div className="border-t border-border p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-brand to-brand-dark text-white rounded-full flex items-center justify-center font-bold">
                    {user.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{user.fullName}</div>
                    <div className="text-xs text-text-muted truncate">{user.email}</div>
                  </div>
                </div>
                <button onClick={handleSignOut} className="w-full text-sm text-danger font-semibold py-2 hover:bg-danger-light rounded">
                  {t("nav.signOut")}
                </button>
              </div>
            ) : (
              <div className="border-t border-border p-4 space-y-2">
                <Link to="/login" className="block w-full text-center bg-white border border-border text-text font-semibold py-2.5 rounded-md hover:bg-surface">
                  {t("nav.login")}
                </Link>
                <Link to="/register" className="block w-full text-center bg-brand text-white font-bold py-2.5 rounded-md shadow-gold">
                  {t("nav.register")}
                </Link>
              </div>
            )}
          </div>
        </>
      )}

      {/* Page content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-burgundy text-white pt-10 pb-6 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-6">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-gradient-to-br from-brand to-brand-dark rounded-lg flex items-center justify-center text-white text-sm font-extrabold">E</div>
                <span className="font-extrabold">EdilPlay</span>
              </div>
              <p className="text-white/70 text-xs leading-relaxed">
                {t("footer.tagline")}
              </p>
            </div>
            <div>
              <div className="font-bold mb-2 text-amber-300 text-xs uppercase tracking-wider">{t("footer.explore")}</div>
              <ul className="space-y-1.5 text-white/80 text-sm">
                <li><Link to="/draws" className="hover:text-white">{t("footer.buy")}</Link></li>
                <li><Link to="/results" className="hover:text-white">{t("footer.results")}</Link></li>
                <li><Link to="/how-it-works" className="hover:text-white">{t("footer.howItWorks")}</Link></li>
              </ul>
            </div>
            <div>
              <div className="font-bold mb-2 text-amber-300 text-xs uppercase tracking-wider">{t("footer.help")}</div>
              <ul className="space-y-1.5 text-white/80 text-sm">
                <li>{t("footer.faq")}</li>
                <li>{t("footer.support")}</li>
                <li>{t("footer.playResponsibly")}</li>
              </ul>
            </div>
            <div>
              <div className="font-bold mb-2 text-amber-300 text-xs uppercase tracking-wider">{t("footer.connect")}</div>
              <ul className="space-y-1.5 text-white/80 text-sm">
                <li>TikTok</li>
                <li>Telegram</li>
                <li>Instagram</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-white/60">
            <div>{t("footer.copyright", { year: new Date().getFullYear() })}</div>
            <div className="flex items-center gap-3">
              <span className="bg-white/10 px-2 py-0.5 rounded font-bold">{t("footer.ageGate")}</span>
              <span>{t("footer.playResponsibly")}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}