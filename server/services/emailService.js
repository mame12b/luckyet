const { Resend } = require("resend");

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "LuckyET <onboarding@resend.dev>";

// Initialize client only if API key is present
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

/**
 * Send a password-reset OTP email.
 * @param {string} email - Recipient email address
 * @param {string} otp - The 6-digit code to send (plaintext — not the hash)
 * @param {string} fullName - User's full name for personalization
 * @returns {Promise<{ ok: boolean, providerId?: string, error?: string }>}
 */
async function sendOTPEmail(email, otp, fullName) {
  const firstName = (fullName || "there").split(" ")[0];

  const subject = "Your LuckyET password reset code";

  const text = [
    `Hi ${firstName},`,
    "",
    "Use this code to reset your LuckyET password:",
    "",
    `    ${otp}`,
    "",
    "This code expires in 10 minutes.",
    "",
    "If you didn't request this, you can safely ignore this email.",
    "",
    "— LuckyET Team",
  ].join("\n");

  const html = `
    <div style="font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #8b1e3f; font-weight: 800; font-size: 20px; padding: 8px 16px; border-radius: 8px;">LuckyET</div>
      </div>

      <h1 style="font-size: 22px; font-weight: 800; margin: 0 0 8px 0;">Password reset code</h1>
      <p style="font-size: 15px; color: #666; margin: 0 0 24px 0;">Hi ${firstName}, use this code to reset your LuckyET password:</p>

      <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <div style="font-family: 'SF Mono', Menlo, monospace; font-size: 36px; font-weight: 800; letter-spacing: 0.3em; color: #8b1e3f;">${otp}</div>
      </div>

      <p style="font-size: 14px; color: #666; line-height: 1.6; margin: 0 0 24px 0;">
        This code expires in <strong>10 minutes</strong>. Enter it on the password reset page to set a new 6-digit password.
      </p>

      <p style="font-size: 13px; color: #999; line-height: 1.6; margin: 0; padding-top: 16px; border-top: 1px solid #eee;">
        If you didn't request a password reset, you can safely ignore this email. Your password won't change unless someone enters this code.
      </p>

      <p style="font-size: 12px; color: #bbb; text-align: center; margin-top: 32px;">
        © ${new Date().getFullYear()} LuckyET
      </p>
    </div>
  `.trim();

  // No API key configured — log the OTP so dev can still test
  if (!resend) {
    console.log("=".repeat(60));
    console.log("[EmailService] Resend not configured — logging OTP only");
    console.log(`[EmailService] To:      ${email}`);
    console.log(`[EmailService] Subject: ${subject}`);
    console.log(`[EmailService] OTP:     ${otp}`);
    console.log(`[EmailService] (Set RESEND_API_KEY in .env to send real emails)`);
    console.log("=".repeat(60));
    return { ok: true, providerId: "console-log" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: [email],
      subject,
      text,
      html,
    });

    if (error) {
      console.error("[EmailService] Resend error:", error);
      return { ok: false, error: error.message || "Email send failed" };
    }

    console.log(`[EmailService] OTP sent to ${email} — provider id ${data?.id}`);
    return { ok: true, providerId: data?.id };
  } catch (err) {
    console.error("[EmailService] Exception while sending:", err);
    return { ok: false, error: err.message || "Email send failed" };
  }
}

module.exports = { sendOTPEmail };
