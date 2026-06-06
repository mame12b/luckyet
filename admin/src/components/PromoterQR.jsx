import { useRef, useState } from "react";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";

export default function PromoterQR({ promoCode, playerOrigin }) {
  const origin = playerOrigin
    || import.meta.env.VITE_PLAYER_ORIGIN
    || (typeof window !== "undefined" ? window.location.origin.replace(":8081", ":8080") : "")
    || "http://localhost:8080";

  const targetUrl = `${origin}/?promo=${encodeURIComponent(promoCode)}`;

  const [copied, setCopied] = useState(false);
  const canvasRef = useRef(null);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      const tmp = document.createElement("input");
      tmp.value = targetUrl;
      document.body.appendChild(tmp);
      tmp.select();
      document.execCommand("copy");
      document.body.removeChild(tmp);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadPNG = () => {
    const canvas = canvasRef.current?.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `luckyet-promo-${promoCode.toLowerCase()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const shareWhatsApp = () => {
    const text = `Hey! Buy a LuckyET ticket using my link — quantum-verified lotteries from the diaspora:\n\n${targetUrl}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener");
  };

  return (
    <div className="bg-white border border-border rounded-xl p-5">
      <header className="mb-3">
        <h2 className="font-bold text-sm">Promoter QR code</h2>
        <p className="text-[11px] text-text-muted">
          Send this to the promoter. Anyone who scans it will land on LuckyET with{" "}
          <span className="font-mono font-bold">{promoCode}</span> applied automatically.
        </p>
      </header>

      <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
        <div className="bg-white p-3 border-2 border-border-strong rounded-lg flex-shrink-0">
          <QRCodeSVG
            value={targetUrl}
            size={160}
            level="M"
            includeMargin={false}
            bgColor="#ffffff"
            fgColor="#0f172a"
          />
        </div>

        <div ref={canvasRef} className="hidden">
          <QRCodeCanvas
            value={targetUrl}
            size={512}
            level="M"
            includeMargin={true}
            bgColor="#ffffff"
            fgColor="#0f172a"
          />
        </div>

        <div className="flex-1 min-w-0 w-full">
          <div className="text-[10px] uppercase tracking-wider font-bold text-text-muted mb-1">Referral link</div>
          <div className="font-mono text-[11px] bg-surface border border-border rounded-md px-2.5 py-2 mb-3 break-all">
            {targetUrl}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={copyUrl}
              className="text-xs bg-brand text-white font-semibold px-3 py-2 rounded-md hover:bg-brand-dark transition"
            >
              {copied ? "✓ Copied" : "📋 Copy link"}
            </button>
            <button
              onClick={downloadPNG}
              className="text-xs bg-white border border-border-strong text-text font-semibold px-3 py-2 rounded-md hover:bg-surface transition"
            >
              ⬇ Download PNG
            </button>
            <button
              onClick={shareWhatsApp}
              className="text-xs bg-green-600 text-white font-semibold px-3 py-2 rounded-md hover:bg-green-700 transition"
            >
              📱 WhatsApp
            </button>
          </div>

          <p className="text-[10px] text-text-faint mt-3 leading-relaxed">
            💡 Tip: download the PNG, share via WhatsApp/Telegram, or print it on a poster.
            The QR code is permanent — works for any draw the promoter wants to sell tickets for.
          </p>
        </div>
      </div>
    </div>
  );
}
