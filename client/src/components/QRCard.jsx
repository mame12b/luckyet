import { QRCodeSVG } from "qrcode.react";

/**
 * Display a QR code that points to a URL. Useful for posters, flyers, social posts.
 * Default points to /draws (the buy page) on whatever origin the page is loaded from.
 */
export default function QRCard({
  url,
  title = "Scan to play",
  subtitle = "Open EdilPlay on your phone",
  size = 140,
}) {
  const target = url || `${typeof window !== "undefined" ? window.location.origin : ""}/draws`;

  return (
    <div className="bg-white border border-border rounded-xl p-4 sm:p-5 inline-flex flex-col items-center gap-3 shadow-card">
      <div className="text-center">
        <div className="text-[10px] uppercase tracking-widest text-burgundy font-bold">{title}</div>
        <div className="text-xs text-text-muted">{subtitle}</div>
      </div>
      <div className="p-2 bg-white border-2 border-amber-400/50 rounded-md">
        <QRCodeSVG
          value={target}
          size={size}
          bgColor="#ffffff"
          fgColor="#8b1e3f"   /* burgundy */
          level="M"
          includeMargin={false}
        />
      </div>
      <div className="text-[10px] font-mono text-text-faint truncate max-w-[180px]">{target.replace(/^https?:\/\//, "")}</div>
    </div>
  );
}
