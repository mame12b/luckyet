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

// ===== REGISTER =====
exports.register = async (req, res, next) => {
  try {
    const { fullName, email, phone, pin, country, language, promoCode } = req.body;

    // Check uniqueness
    const exists = await User.findOne({ $or: [{ email }, { phone }] });
    if (exists) {
      return res.status(409).json({
        message: exists.email === email
          ? "An account with this email already exists"
          : "An account with this phone number already exists",
      });
    }

    // Resolve promo code (optional)
    let referredByStreamerId, referredByPromoCode;
    if (promoCode) {
      const streamer = await Streamer.findOne({ promoCode, status: "active" });
      if (streamer) {
        referredByStreamerId = streamer._id;
        referredByPromoCode = streamer.promoCode;
      }
      // Silently ignore invalid codes — no need to block registration
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

    // Issue tokens
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
      // Don't reveal whether the phone is registered
      return res.status(401).json({ message: "Invalid phone or password" });
    }

    // Check lockout
    if (user.isLocked()) {
      const minutesLeft = Math.ceil((user.lockedUntil - new Date()) / 60000);
      return res.status(429).json({
        message: `Account locked. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`,
        code: "ACCOUNT_LOCKED",
        lockedUntil: user.lockedUntil,
      });
    }

    // Verify credential — accepts PIN OR legacy password during transition
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

    // Successful login — clear failed attempts
    await clearFailedAttempts(user);

    // Issue tokens
    const accessToken = signAccessToken(user._id, user.role);
    const refreshToken = signRefreshToken(user._id, user.role);
    res.cookie("refreshToken", refreshToken, cookieOptionsFor(user.role));

    await logAudit({
      actorId: user._id,
      actorRole: user.role,
      action: "user.login",
      targetType: "User",
      targetId: user._id,
      metadata: { credentialType: verified }, // "pin" or "password" (legacy)
      req,
    });

    // If user logged in with legacy password, hint that they should set a PIN
    const requiresPinSetup = verified === "password";

    res.json({ user, accessToken, requiresPinSetup });
  } catch (err) {
    next(err);
  }
};

// ===== CHANGE PIN (self-service) =====
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
// Super admin only. Resets a user's PIN to a new value, clears lockout/attempts.
exports.adminResetPin = async (req, res, next) => {
  try {
    const { userId, newPin } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Prevent admin from resetting their own PIN via this route (use change-pin instead)
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        message: "Use the change password flow to update your own password.",
      });
    }

    // Optional safety: prevent resetting another super_admin's PIN.
    // Keeps the "no admin can lock out another admin" property.
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
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (err) {
    if (err.message === "PIN must be exactly 6 digits") {
      return res.status(400).json({ message: "Password must be exactly 6 digits" });
    }
    next(err);
  }
};

// ===== USER: request password reset =====
exports.requestPasswordReset = async (req, res, next) => {
  try {
    const { phone, reason, contactMethod } = req.body;

    // Lookup user but DON'T reveal whether the phone exists
    const user = await User.findOne({ phone });

    // Always respond with the same generic message — prevents user enumeration
    if (!user || !user.isActive) {
      return res.json({
        message: "If an account exists with this phone, your reset request has been recorded. Contact support to verify your identity.",
      });
    }

    // Cancel any prior pending requests (so we don't pile up)
    await PasswordResetRequest.updateMany(
      { userId: user._id, status: "pending" },
      { status: "expired" }
    );

    await PasswordResetRequest.create({
      userId: user._id,
      reason: reason?.trim().slice(0, 500),
      contactMethod: contactMethod?.trim().slice(0, 100),
      status: "pending",
    });

    await logAudit({
      actorId: user._id,
      actorRole: user.role,
      action: "password_reset.requested",
      targetType: "User",
      targetId: user._id,
      metadata: { reason, contactMethod },
      req,
    });

    res.json({
      message: "If an account exists with this phone, your reset request has been recorded. Contact support to verify your identity.",
    });
  } catch (err) {
    next(err);
  }
};

// ===== USER: complete password reset with code =====
exports.completePasswordReset = async (req, res, next) => {
  try {
    const { phone, resetCode, newPin } = req.body;

    const user = await User.findOne({ phone });
    if (!user) return res.status(400).json({ message: "Invalid reset code" });

    // Find the most recent approved request for this user
    const request = await PasswordResetRequest.findOne({
      userId: user._id,
      status: "approved",
    }).sort({ reviewedAt: -1 });

    if (!request) {
      return res.status(400).json({ message: "No approved reset request found. Contact support." });
    }

    if (request.resetCodeExpiresAt < new Date()) {
      request.status = "expired";
      await request.save();
      return res.status(400).json({ message: "Reset code expired. Request a new one." });
    }

    const ok = await bcrypt.compare(resetCode, request.resetCodeHash);
    if (!ok) {
      return res.status(400).json({ message: "Invalid reset code" });
    }

    // All checks pass — set the new PIN
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
      metadata: { requestId: request._id },
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

// ===== ADMIN: list reset requests =====
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

// ===== ADMIN: approve reset request — generates code, shown ONCE =====
exports.adminApproveResetRequest = async (req, res, next) => {
  try {
    const request = await PasswordResetRequest.findById(req.params.id).populate("userId");
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.status !== "pending") {
      return res.status(400).json({ message: `Request is already ${request.status}` });
    }

    // Don't allow approving a reset for another super_admin (prevent coups)
    if (request.userId.role === "super_admin" && request.userId._id.toString() !== req.user.id) {
      return res.status(403).json({ message: "Cannot approve password reset for another super admin." });
    }

    // Generate a fresh 6-digit code
    const resetCode = PasswordResetRequest.generateCode();
    request.resetCodeHash = await bcrypt.hash(resetCode, 10);
    request.resetCodeExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min
    request.status = "approved";
    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();
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
      resetCode, // shown ONCE — never returned again
      expiresAt: request.resetCodeExpiresAt,
      user: {
        fullName: request.userId.fullName,
        phone: request.userId.phone,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ===== ADMIN: reject reset request =====
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
