// Manages the promo code captured from QR scans.
// Stored in localStorage so it persists across navigation and reloads.

const KEY = "luckyet:promo";

export function capturePromoFromUrl() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const promo = params.get("promo");
  if (!promo) return null;
  const code = promo.toUpperCase().trim();
  if (!/^[A-Z0-9]{3,20}$/.test(code)) return null;  // invalid format, ignore
  try { localStorage.setItem(KEY, code); } catch {}
  return code;
}

export function getStoredPromo() {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function clearStoredPromo() {
  try { localStorage.removeItem(KEY); } catch {}
}
