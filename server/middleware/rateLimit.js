const rateLimit = require("express-rate-limit");

const json = (msg) => ({ message: msg });
exports.globalRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 100,
  message: json("Too many requests. Try again in a minute."),
  standardHeaders: true,
  legacyHeaders: false,
});

exports.authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: json("Too many auth attempts. Try again in 15 minutes."),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});
exports.passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: json("Too many password reset requests. Try again later."),
});

exports.paymentRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: json("Too many payment submissions. Try again later."),
});

exports.adminRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  message: json("Too many requests. Try again later."),
  standardHeaders: true,
  legacyHeaders: false,
});