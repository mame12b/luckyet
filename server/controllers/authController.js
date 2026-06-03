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
