const User = require("../models/User");
const Streamer = require("../models/Streamer");
const bcrypt = require("bcryptjs");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  cookieOptionsFor,
  policyFor,
} = require("../utils/tokens");
const { recordFailedAttempt, clearFailedAttempts, MAX_ATTEMPTS } = require("../services/authLockout");
const { logAudit } = require("../services/auditService");
const PasswordResetRequest = require("../models/PasswordResetRequest");
const { sendPasswordResetWhatsApp } = require("../services/whatsappService");

// Rate limit config — adjust here, not in the body
const RESET_RATE_LIMIT_PER_HOUR = 5;
const RESET_CODE_TTL_MS = 10 * 60 * 1000;    // 10 minutes
const RESET_MAX_ATTEMPTS = 5;

// ===== REGISTER =====
exports.register = async (req, res, next) => {
  try {
    const { fullName, email, phone, pin, country, language, promoCode } = req.body;

    const exists = await User.findOne({ $or: [{ email }, { phone }] });
    if (exists) {
      return res.status(409).json({
        message: exists.email === email
          ? "An account with this email already exists"
          : "An account with this phone number already exists",
      });
    }

    let referredByStreamerId, referredByPromoCode;
    if (promoCode) {
      const streamer = await Streamer.findOne({ promoCode, status: "active" });
      if (streamer) {
        referredByStreamerId = streamer._id;
        referredByPromoCode = streamer.promoCode;
      }
    }

    const user = new User({
      fullName,
      email,
      phone,
      country,
      language: language || "en",
      referredByPromoCode,
      referredByStreamerId,
    });
    await user.setPin(pin);
    await user.save();

    const accessToken = signAccessToken(user._id, user.role);
    const refreshToken = signRefreshToken(user._id, user.role);
    res.cookie("refreshToken", refreshToken, cookieOptionsFor(user.role));

    await logAudit({
      actorId: user._id,
      actorRole: user.role,
      action: "user.registered",
      targetType: "User",
      targetId: user._id,
      metadata: { country, promoCode: referredByPromoCode },
      req,
    });

    res.status(201).json({ user, accessToken });
  } catch (err) {
    if (err.message === "PIN must be exactly 6 digits") {
      return res.status(400).json({ message: err.message });
    }
    next(err);
  }
};

// ===== LOGIN =====
exports.login = async (req, res, next) => {
  try {
    const { phone, pin } = req.body;

    const user = await User.findOne({ phone });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Invalid phone or password" });
    }

    if (user.isLocked()) {
      const minutesLeft = Math.ceil((user.lockedUntil - new Date()) / 60000);
      return res.status(429).json({
        message: `Account locked. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`,
        code: "ACCOUNT_LOCKED",
        lockedUntil: user.lockedUntil,
      });
    }

    const verified = await user.verifyCredential(pin);
    if (!verified) {
      const state = await recordFailedAttempt(user);
      if (state.locked) {
        return res.status(429).json({
          message: `Too many failed attempts. Account locked for 1 hour.`,
          code: "ACCOUNT_LOCKED",
          lockedUntil: state.lockedUntil,
        });
      }
      return res.status(401).json({
        message: `Invalid phone or password. ${state.remainingAttempts} attempt${state.remainingAttempts === 1 ? "" : "s"} remaining.`,
        remainingAttempts: state.remainingAttempts,
      });
    }

    await clearFailedAttempts(user);

    const accessToken = signAccessToken(user._id, user.role);
    const refreshToken = signRefreshToken(user._id, user.role);
    res.cookie("refreshToken", refreshToken, cookieOptionsFor(user.role));

    await logAudit({
      actorId: user._id,
      actorRole: user.role,
      action: "user.login",
      targetType: "User",
      targetId: user._id,
      metadata: { credentialType: verified },
      req,
    });

    const requiresPinSetup = verified === "password";
    res.json({ user, accessToken, requiresPinSetup });
  } catch (err) {
    next(err);
  }
};

// ===== CHANGE PIN =====
exports.changePin = async (req, res, next) => {
  try {
    const { currentPin, newPin } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const verified = await user.verifyCredential(currentPin);
    if (!verified) return res.status(401).json({ message: "Current password is incorrect" });

    await user.setPin(newPin);
    await user.save();

    await logAudit({
      actorId: user._id,
      actorRole: user.role,
      action: "user.pin_changed",
      targetType: "User",
      targetId: user._id,
      req,
    });

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    next(err);
  }
};

// ===== REFRESH =====
exports.refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) return res.status(401).json({ message: "Missing refresh token" });

    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) return res.status(401).json({ message: "Invalid session" });

    const policy = policyFor(user.role);
    const now = Date.now();
    const lastActivity = decoded.lastActivityAt || decoded.iat * 1000;

    if ((now - lastActivity) > policy.idleTimeoutMs) {
      res.clearCookie("refreshToken", cookieOptionsFor(user.role));
      return res.status(401).json({
        message: "Session expired due to inactivity. Please sign in again.",
        code: "IDLE_TIMEOUT",
      });
    }

    const accessToken = signAccessToken(user._id, user.role);
    const refreshToken = signRefreshToken(user._id, user.role);
    res.cookie("refreshToken", refreshToken, cookieOptionsFor(user.role));

    res.json({ accessToken });
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired refresh token" });
  }
};

// ===== LOGOUT =====
exports.logout = async (req, res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
  res.json({ message: "Logged out" });
};

// ===== ME =====
exports.me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

// ===== ADMIN: RESET USER PIN =====
exports.adminResetPin = async (req, res, next) => {
  try {
    const { userId, newPin } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        message: "Use the change password flow to update your own password.",
      });
    }
    if (user.role === "super_admin") {
      return res.status(403).json({
        message: "Cannot reset another super admin's password.",
      });
    }

    await user.setPin(newPin);
    user.loginAttempts = 0;
    user.lockedUntil = undefined;
    await user.save();

    await logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "user.pin_reset_by_admin",
      targetType: "User",
      targetId: user._id,
      metadata: { targetEmail: user.email, targetPhone: user.phone },
      req,
    });

    res.json({
      message: "Password reset successfully",
      user: { _id: user._id, fullName: user.fullName, email: user.email, phone: user.phone },
    });
  } catch (err) {
    if (err.message === "PIN must be exactly 6 digits") {
      return res.status(400).json({ message: "Password must be exactly 6 digits" });
    }
    next(err);
  }
};

// ════════════════════════════════════════════════════════════════════════════
// SELF-SERVICE PASSWORD RESET (no admin approval needed)
// ════════════════════════════════════════════════════════════════════════════

/**
 * STEP 1: User requests a reset code.
 *   - Rate limited to 5 requests per user per hour
 *   - Sends a 6-digit OTP via email (Resend)
 *   - Always responds generically (no user enumeration leak)
 */
exports.requestPasswordReset = async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone || typeof phone !== "string") {
      return res.status(400).json({ message: "Phone number is required" });
    }

    // Generic response used in all "I don't want to leak info" cases
    const generic = {
      message: "If an account exists with this phone, a one-time code has been sent.",
    };

    const user = await User.findOne({ phone });
    if (!user || !user.isActive) {
      return res.json(generic);
    }

    // ─── Rate limit: max N requests per user per hour ───
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await PasswordResetRequest.countDocuments({
      userId: user._id,
      createdAt: { $gte: oneHourAgo },
    });
    if (recentCount >= RESET_RATE_LIMIT_PER_HOUR) {
      return res.status(429).json({
        message: `Too many reset requests. Try again in an hour.`,
        code: "RATE_LIMITED",
      });
    }

    // ─── Invalidate any prior pending/approved requests ───
    await PasswordResetRequest.updateMany(
      { userId: user._id, status: { $in: ["pending", "approved"] } },
      { status: "expired" }
    );

    // ─── Generate fresh OTP, store hash ───
    const resetCode = PasswordResetRequest.generateCode();
    const resetCodeHash = await bcrypt.hash(resetCode, 10);

    await PasswordResetRequest.create({
      userId: user._id,
      status: "approved",                       // self-approved, skips admin
      resetCodeHash,
      resetCodeExpiresAt: new Date(Date.now() + RESET_CODE_TTL_MS),
      attempts: 0,
      contactMethod: "whatsapp",
    });

    // ─── Send OTP via WhatsApp ───
    try {
      await sendPasswordResetWhatsApp({
        to: user.phone,
        code: resetCode,
        expiresInMinutes: Math.floor(RESET_CODE_TTL_MS / 60000),
      });
    } catch (waErr) {
      console.error("[password_reset] WhatsApp delivery failed:", waErr.message);
      // Don't reveal the failure to the client — still respond generically.
      // The code was generated but never delivered; the user can retry.
    }

    await logAudit({
      actorId: user._id,
      actorRole: user.role,
      action: "password_reset.self_requested",
      targetType: "User",
      targetId: user._id,
      req,
    });

    return res.json(generic);
  } catch (err) {
    next(err);
  }
};

/**
 * STEP 2: User submits OTP + new PIN.
 *   - 5 wrong-attempt limit per code, then auto-expires
 *   - Respects the 10-min code expiry
 *   - Clears any account lockout on success
 */
exports.completePasswordReset = async (req, res, next) => {
  try {
    const { phone, resetCode, newPin } = req.body;

    const user = await User.findOne({ phone });
    if (!user) return res.status(400).json({ message: "Invalid reset code" });

    const request = await PasswordResetRequest.findOne({
      userId: user._id,
      status: "approved",
    }).sort({ createdAt: -1 });

    if (!request) {
      return res.status(400).json({ message: "No active reset code. Request a new one." });
    }

    if (request.resetCodeExpiresAt < new Date()) {
      request.status = "expired";
      await request.save();
      return res.status(400).json({ message: "Reset code expired. Request a new one." });
    }

    // ─── Attempt limit ───
    if ((request.attempts || 0) >= RESET_MAX_ATTEMPTS) {
      request.status = "expired";
      await request.save();
      return res.status(429).json({
        message: "Too many wrong attempts. Request a new code.",
        code: "TOO_MANY_ATTEMPTS",
      });
    }

    const ok = await bcrypt.compare(resetCode, request.resetCodeHash);
    if (!ok) {
      request.attempts = (request.attempts || 0) + 1;
      await request.save();
      const remaining = RESET_MAX_ATTEMPTS - request.attempts;
      return res.status(400).json({
        message: remaining > 0
          ? `Invalid code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
          : "Too many wrong attempts. Request a new code.",
        remainingAttempts: Math.max(0, remaining),
      });
    }

    // ─── Success — set new PIN + clear lockouts ───
    await user.setPin(newPin);
    user.loginAttempts = 0;
    user.lockedUntil = undefined;
    await user.save();

    request.status = "completed";
    request.completedAt = new Date();
    await request.save();

    await logAudit({
      actorId: user._id,
      actorRole: user.role,
      action: "password_reset.completed",
      targetType: "User",
      targetId: user._id,
      metadata: { requestId: request._id, attemptsUsed: request.attempts },
      req,
    });

    res.json({ message: "Password updated. You can now log in." });
  } catch (err) {
    if (err.message === "PIN must be exactly 6 digits") {
      return res.status(400).json({ message: "Password must be exactly 6 digits" });
    }
    next(err);
  }
};

// ════════════════════════════════════════════════════════════════════════════
// LEGACY ADMIN APPROVAL ENDPOINTS — kept for emergency / manual recovery
// (e.g. user has no email access). Not the primary flow anymore.
// ════════════════════════════════════════════════════════════════════════════

exports.adminListResetRequests = async (req, res, next) => {
  try {
    const { status = "pending" } = req.query;
    const requests = await PasswordResetRequest.find({ status })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("userId", "fullName email phone country")
      .populate("reviewedBy", "fullName");
    res.json({ requests });
  } catch (err) {
    next(err);
  }
};

exports.adminApproveResetRequest = async (req, res, next) => {
  try {
    const request = await PasswordResetRequest.findById(req.params.id).populate("userId");
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.status !== "pending") {
      return res.status(400).json({ message: `Request is already ${request.status}` });
    }

    if (request.userId.role === "super_admin" && request.userId._id.toString() !== req.user.id) {
      return res.status(403).json({ message: "Cannot approve password reset for another super admin." });
    }

    const resetCode = PasswordResetRequest.generateCode();
    request.resetCodeHash = await bcrypt.hash(resetCode, 10);
    request.resetCodeExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
    request.status = "approved";
    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();
    request.attempts = 0;
    await request.save();

    await logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "password_reset.approved",
      targetType: "PasswordResetRequest",
      targetId: request._id,
      metadata: { targetUserId: request.userId._id },
      req,
    });

    res.json({
      message: "Reset request approved. Share the code with the user securely.",
      resetCode,
      expiresAt: request.resetCodeExpiresAt,
      user: { fullName: request.userId.fullName, phone: request.userId.phone },
    });
  } catch (err) {
    next(err);
  }
};

exports.adminRejectResetRequest = async (req, res, next) => {
  try {
    const { rejectionReason } = req.body;
    const request = await PasswordResetRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.status !== "pending") {
      return res.status(400).json({ message: `Request is already ${request.status}` });
    }

    request.status = "rejected";
    request.rejectionReason = rejectionReason?.trim().slice(0, 500);
    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();
    await request.save();

    await logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "password_reset.rejected",
      targetType: "PasswordResetRequest",
      targetId: request._id,
      metadata: { rejectionReason },
      req,
    });

    res.json({ message: "Reset request rejected." });
  } catch (err) {
    next(err);
  }
};

// ===== UPDATE LANGUAGE =====
exports.updateLanguage = async (req, res, next) => {
  try {
    const { language } = req.body;
    if (!["en", "am", "ti", "om"].includes(language)) {
      return res.status(400).json({ message: "Invalid language" });
    }
    await User.findByIdAndUpdate(req.user.id, { language });
    res.json({ language });
  } catch (err) {
    next(err);
  }
};