/* ============================================================
   services/whatsappService.js
   ────────────────────────────────────────────────────────────
   Sends the password-reset OTP using whatsapp-web.js (UNOFFICIAL).

   How it works:
   - On server start, opens a Chromium-controlled WhatsApp Web
     session and prints a QR code to the server logs.
   - You scan that QR once with the LuckyET business phone's
     WhatsApp app (Settings → Linked Devices → Link Device).
   - Session is persisted to disk (.wwebjs_auth/), so subsequent
     restarts skip the QR step.
   - From then on, server can send messages programmatically.

   ⚠ This violates WhatsApp's ToS. Risk of number being banned,
   especially for OTP traffic. Fine for early testing; swap to
   Cloud API before going wide.
============================================================ */

const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

let client = null;
let isReady = false;
let initPromise = null;

function initClient() {
  if (client) return client;

  client = new Client({
    authStrategy: new LocalAuth({
      clientId: "luckyet-otp",
      dataPath: process.env.WWEBJS_AUTH_PATH || "/app/.wwebjs_auth",
    }),
    puppeteer: {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
        "--single-process",
      ],
      // Use system Chromium if present (set in Dockerfile via env var)
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    },
  });

  client.on("qr", (qr) => {
    console.log("\n========================================================");
    console.log("[whatsapp] Scan this QR with your business WhatsApp:");
    console.log("  WhatsApp → Settings → Linked Devices → Link a Device");
    console.log("========================================================\n");
    qrcode.generate(qr, { small: true });
  });

  client.on("authenticated", () => {
    console.log("[whatsapp] authenticated — session saved");
  });

  client.on("ready", () => {
    isReady = true;
    console.log("[whatsapp] ✓ client ready — OTP delivery is live");
  });

  client.on("auth_failure", (msg) => {
    console.error("[whatsapp] auth failure:", msg);
    isReady = false;
  });

  client.on("disconnected", (reason) => {
    console.warn("[whatsapp] disconnected:", reason);
    isReady = false;
    // Try to reconnect after 5s
    setTimeout(() => {
      client.initialize().catch((e) => console.error("[whatsapp] reinit failed:", e.message));
    }, 5000);
  });

  initPromise = client.initialize().catch((err) => {
    console.error("[whatsapp] init failed:", err.message);
  });

  return client;
}

// Eagerly init on module load so the QR shows up early
initClient();

/**
 * Send a 6-digit OTP via WhatsApp.
 *
 * @param {Object} opts
 * @param {string} opts.to    - phone in E.164 ("+971563561803") or digits-only
 * @param {string} opts.code  - the 6-digit code
 * @param {number} [opts.expiresInMinutes=10]
 */
async function sendPasswordResetWhatsApp({ to, code, expiresInMinutes = 10 }) {
  if (!isReady) {
    throw new Error(
      "WhatsApp client not ready. Check server logs for QR code and scan with business WhatsApp."
    );
  }
  if (!to || !code) {
    throw new Error("sendPasswordResetWhatsApp requires `to` and `code`");
  }

  // WhatsApp chat ID format: <digits>@c.us  (no + sign)
  const cleanPhone = String(to).replace(/\D/g, "");
  if (cleanPhone.length < 8) {
    throw new Error(`Invalid phone number: ${to}`);
  }
  const chatId = `${cleanPhone}@c.us`;

  // Verify the number is actually on WhatsApp before sending
  // (saves a wasted message + gives clearer error)
  const isRegistered = await client.isRegisteredUser(chatId);
  if (!isRegistered) {
    throw new Error(`${to} is not a WhatsApp number`);
  }

  const message =
    `🔐 *LuckyET password reset*\n\n` +
    `Your one-time code: *${code}*\n\n` +
    `This code expires in ${expiresInMinutes} minutes. ` +
    `For your security, do not share it with anyone.\n\n` +
    `If you didn't request this, ignore this message — your account stays safe.`;

  return client.sendMessage(chatId, message);
}

module.exports = { sendPasswordResetWhatsApp };