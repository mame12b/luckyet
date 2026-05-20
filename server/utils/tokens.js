
const jwt = require("jsonwebtoken");

// Session policy per role
const SESSION_POLICY = {
  super_admin: { accessExpires: "10m", refreshExpires: "8h", idleTimeoutMs: 10 * 60 * 1000 },
  admin:       { accessExpires: "15m", refreshExpires: "12h", idleTimeoutMs: 15 * 60 * 1000 },
  streamer:    { accessExpires: "15m", refreshExpires: "24h", idleTimeoutMs: 30 * 60 * 1000 },
  player:      { accessExpires: "15m", refreshExpires: "7d",  idleTimeoutMs: 30 * 60 * 1000 },
};

function policyFor(role) {
  return SESSION_POLICY[role] || SESSION_POLICY.player;
}

function signAccessToken(userId, role) {
  const policy = policyFor(role);
  return jwt.sign({ userId, role, iat: Math.floor(Date.now() / 1000) }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: policy.accessExpires,
  });
}

function signRefreshToken(userId, role) {
  const policy = policyFor(role);
  // Include lastActivityAt so we can enforce idle timeout
  return jwt.sign(
    {
      userId,
      role,
      lastActivityAt: Date.now(),
      sessionStartedAt: Date.now(),
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: policy.refreshExpires }
  );
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

function cookieOptionsFor(role) {
  const policy = policyFor(role);
  // Convert "8h"/"7d" etc. to milliseconds
  const ms = parseExpires(policy.refreshExpires);
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: ms,
  };
}

function parseExpires(s) {
  const match = String(s).match(/^(\d+)([smhd])$/);
  if (!match) return 24 * 60 * 60 * 1000;
  const n = parseInt(match[1]);
  const unit = match[2];
  return n * { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit];
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  cookieOptionsFor,
  policyFor,
  SESSION_POLICY,
};
