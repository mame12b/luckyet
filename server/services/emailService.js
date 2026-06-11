/* ============================================================
   services/emailService.js   (or wherever your services live)
   ────────────────────────────────────────────────────────────
   Resend OTP email delivery. Once the LuckyET domain is verified
   in the Resend dashboard, swap the `from` address below.
============================================================ */

const { Resend } = require("resend");

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Adjust once your domain is verified in Resend
const FROM_ADDRESS = process.env.RESEND_FROM || "LuckyET <onboarding@resend.dev>";

/**
 * Sends a 6-digit password reset code to the user's email.
 * Throws if Resend isn't configured or the request fails.
 *
 * @param {Object} opts
 * @param {string} opts.to          - recipient email
 * @param {string} [opts.name]      - user's full name (for greeting)
 * @param {string} opts.code        - the 6-digit OTP
 * @param {number} [opts.expiresInMinutes=10]
 */
async function sendPasswordResetEmail({ to, name, code, expiresInMinutes = 10 }) {
  if (!resend) {
    throw new Error("RESEND_API_KEY not configured — cannot send OTP email");
  }

  const greeting = name ? `Hi ${name.split(" ")[0]},` : "Hello,";

  return resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: "Your LuckyET password reset code",
    html: `
      <!DOCTYPE html>
      <html>
        <body style="margin: 0; padding: 0; background: #faf8f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="max-width: 520px; margin: 0 auto; padding: 32px 24px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="display: inline-block; width: 48px; height: 48px; background: #f59e0b; border-radius: 10px; line-height: 48px; color: white; font-weight: 800; font-size: 22px;">L</div>
              <div style="margin-top: 8px; font-weight: 800; color: #111827; font-size: 18px;">LuckyET</div>
            </div>

            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 16px; padding: 32px 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
              <h1 style="margin: 0 0 12px; font-size: 22px; color: #111827;">Password reset code</h1>
              <p style="margin: 0 0 18px; color: #374151; font-size: 15px; line-height: 1.5;">
                ${greeting} Use this one-time code to reset your password:
              </p>

              <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0;">
                <div style="font-size: 34px; font-weight: 800; letter-spacing: 12px; font-family: 'Courier New', monospace; color: #8b1e3f;">${code}</div>
              </div>

              <p style="margin: 0 0 10px; color: #374151; font-size: 14px; line-height: 1.5;">
                This code expires in <strong>${expiresInMinutes} minutes</strong>.
                You have <strong>5 attempts</strong> to enter it correctly before it locks.
              </p>

              <p style="margin: 16px 0 0; color: #6b7280; font-size: 12px;">
                Didn't request this? Someone may have typed your phone number by mistake.
                You can safely ignore this email — your password stays the same.
              </p>
            </div>

            <p style="text-align: center; color: #9ca3af; font-size: 11px; margin-top: 16px;">
              LuckyET · Play right, play responsibly. 18+ only.
            </p>
          </div>
        </body>
      </html>
    `,
  });
}

module.exports = { sendPasswordResetEmail };