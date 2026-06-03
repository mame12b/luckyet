import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../lib/api";

/**
 * Floating "Buy Tickets" call-to-action.
 * Routes the user to the DETAIL page of the active draw — one step before
 * the buy flow — so they see prize info before committing.
 * Hidden on the homepage (hero has same CTA) and during the buy/live flows.
 */
export default function StickyBuyCTA() {
  const location = useLocation();
  const [featuredSlug, setFeaturedSlug] = useState(null);

  useEffect(() => {
    api.get("/draws").then(({ data }) => {
      const active = (data.draws || []).find((d) => d.status === "active");
      if (active) setFeaturedSlug(active.slug);
    }).catch(() => {});
  }, []);

  // Routes where we suppress the floating CTA
  const path = location.pathname;
  const hide =
    path === "/" ||                                          // homepage hero has CTA
    path === "/login" ||
    path === "/register" ||
    /^\/draws\/[^/]+\/buy$/.test(path) ||                    // mid-purchase
    /^\/draws\/[^/]+\/live$/.test(path) ||                   // live broadcast
    // Also hide on the detail page we'd be linking to — redundant
    (featuredSlug && path === `/draws/${featuredSlug}`);

  if (hide) return null;

  // Link to the DETAIL page (not /buy) so user sees the prize first.
  // Fall back to /draws if no active draw.
  const target = featuredSlug ? `/draws/${featuredSlug}` : "/draws";

  return (
    <Link
      to={target}
      className="
        fixed z-40
        bottom-4 right-4 sm:bottom-6 sm:right-6
        bg-gradient-to-br from-amber-400 to-amber-600
        text-burgundy font-extrabold text-sm sm:text-base
        px-5 py-3 sm:px-6 sm:py-3.5
        rounded-full shadow-2xl shadow-amber-500/40
        flex items-center gap-2
        hover:scale-105 active:scale-95
        transition-all
        animate-bounceIn
      "
      aria-label="Buy tickets"
    >
      <span className="text-lg">🎟️</span>
      <span>Buy Tickets</span>
    </Link>
  );
}
