const rateLimit = require("express-rate-limit");

exports.globalRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 100,
  message: { message: "Too many requests. Try again in a minute." },
  standardHeaders: true,
  legacyHeaders: false,
});

exports.authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: { message: "Too many auth attempts. Try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

exports.paymentRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { message: "Too many payment submissions. Try again later." },
});