/**
 * Account lockout policy:
 *   - 5 failed login attempts → account locked for 60 minutes
 *   - Successful login resets the counter
 *   - Counter resets after 15 minutes of no failed attempts (rolling window)
 *
 * This is account-level. IP-level rate limiting is separate (Phase 7).
 */

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 60 * 1000; // 1 hour
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;   // 15 min rolling window

/**
 * Record a failed login attempt. Returns updated state.
 * If attempts hit the threshold, sets lockedUntil.
 */
exports.recordFailedAttempt = async (user) => {
  // If the last failure was outside the window, reset counter to 1
  const now = Date.now();
  const lastFailMs = user.updatedAt?.getTime() || 0;
  const withinWindow = (now - lastFailMs) < ATTEMPT_WINDOW_MS;

  user.loginAttempts = withinWindow ? (user.loginAttempts + 1) : 1;

  if (user.loginAttempts >= MAX_ATTEMPTS) {
    user.lockedUntil = new Date(now + LOCKOUT_DURATION_MS);
  }

  await user.save();

  const remaining = Math.max(0, MAX_ATTEMPTS - user.loginAttempts);
  return {
    locked: user.isLocked(),
    lockedUntil: user.lockedUntil,
    remainingAttempts: remaining,
  };
};

/**
 * Clear failed attempts after successful login.
 */
exports.clearFailedAttempts = async (user) => {
  if (user.loginAttempts > 0 || user.lockedUntil) {
    user.loginAttempts = 0;
    user.lockedUntil = undefined;
    await user.save();
  }
};

exports.MAX_ATTEMPTS = MAX_ATTEMPTS;
exports.LOCKOUT_DURATION_MS = LOCKOUT_DURATION_MS;
