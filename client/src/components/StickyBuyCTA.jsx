import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../lib/api";

export default function StickyBuyCTA() {
  const { t } = useTranslation();
  const location = useLocation();
  const [featuredSlug, setFeaturedSlug] = useState(null);

  useEffect(() => {
    api.get("/draws").then(({ data }) => {
      const active = (data.draws || []).find((d) => d.status === "active");
      if (active) setFeaturedSlug(active.slug);
    }).catch(() => {});
  }, []);

  const path = location.pathname;
  const hide =
    path === "/" ||
    path === "/login" ||
    path === "/register" ||
    /^\/draws\/[^/]+\/buy$/.test(path) ||
    /^\/draws\/[^/]+\/live$/.test(path) ||
    (featuredSlug && path === `/draws/${featuredSlug}`);

  if (hide) return null;

  const target = featuredSlug ? `/draws/${featuredSlug}` : "/draws";
  const label = t("sticky.buyTickets");

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
      aria-label={label}
    >
      <span className="text-lg">🎟️</span>
      <span>{label}</span>
    </Link>
  );
}
