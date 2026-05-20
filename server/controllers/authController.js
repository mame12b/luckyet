const User = require("../models/User");
const Streamer = require("../models/Streamer");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  cookieOptionsFor,
  policyFor,
} = require("../utils/tokens");
const { logAudit } = require("../services/auditService");

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

exports.register = async (req, res, next) => {
  try {
    const { fullName, email, phone, password, country, language, referredByCode } = req.body;

    // Look up referrer if provided
    let referrer = null;
    if (referredByCode) {
      referrer = await Streamer.findOne({
        promoCode: referredByCode.toUpperCase(),
        status: "active",
      });
    }

    const user = await User.create({
      fullName,
      email,
      phone,
      password,
      country,
      language: language || "en",
      referredBy: referrer?._id,
      referredByCode: referrer ? referredByCode.toUpperCase() : undefined,
    });

const accessToken = signAccessToken(user._id, user.role);
const refreshToken = signRefreshToken(user._id, user.role);

res.cookie("refreshToken", refreshToken, cookieOptionsFor(user.role));

    await logAudit({
      actorId: user._id,
      actorRole: user.role,
      action: "auth.register",
      targetType: "User",
      targetId: user._id,
      metadata: { email, country, referredByCode: referrer ? referredByCode : null },
      req,
    });

    res.status(201).json({
      user: user.toJSON(),
      accessToken,
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { emailOrPhone, password } = req.body;

    const user = await User.findOne({
      $or: [{ email: emailOrPhone.toLowerCase() }, { phone: emailOrPhone }],
    }).select("+password");

    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    if (!user.isActive) return res.status(403).json({ message: "Account disabled" });

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutes = Math.ceil((user.lockedUntil - new Date()) / 60000);
      return res.status(429).json({ message: `Account locked. Try again in ${minutes} minutes.` });
    }

    const ok = await user.comparePassword(password);
    if (!ok) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= MAX_FAILED) {
        user.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
        user.failedLoginAttempts = 0;
      }
      await user.save();
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Success — reset counters
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    user.lastLoginAt = new Date();
    user.lastLoginIp = req.ip;
    await user.save();

const accessToken = signAccessToken(user._id, user.role);
const refreshToken = signRefreshToken(user._id, user.role);

res.cookie("refreshToken", refreshToken, cookieOptionsFor(user.role));

    await logAudit({
      actorId: user._id,
      actorRole: user.role,
      action: "auth.login",
      targetType: "User",
      targetId: user._id,
      req,
    });

    res.json({ user: user.toJSON(), accessToken });
  } catch (err) {
    next(err);
  }
};

exports.refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) return res.status(401).json({ message: "Missing refresh token" });

    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) return res.status(401).json({ message: "Invalid session" });

    // ENFORCE IDLE TIMEOUT: no activity for X minutes → kick out
    const policy = policyFor(user.role);
    const now = Date.now();
    const lastActivity = decoded.lastActivityAt || decoded.iat * 1000;
    const idle = now - lastActivity;

    if (idle > policy.idleTimeoutMs) {
      // Clear the cookie so the client knows to log in again
      res.clearCookie("refreshToken", cookieOptionsFor(user.role));
      return res.status(401).json({
        message: "Session expired due to inactivity. Please sign in again.",
        code: "IDLE_TIMEOUT",
      });
    }

    // Mint new tokens and update lastActivityAt
    const accessToken = signAccessToken(user._id, user.role);
    const refreshToken = signRefreshToken(user._id, user.role);
    res.cookie("refreshToken", refreshToken, cookieOptionsFor(user.role));

    res.json({ accessToken });
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired refresh token" });
  }
};

exports.logout = async (req, res) => {
  // Clear with default options — works regardless of role
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
  res.json({ message: "Logged out" });
};

exports.me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user: user.toJSON() });
  } catch (err) {
    next(err);
  }
};