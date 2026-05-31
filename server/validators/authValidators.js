const { z } = require("zod");

// Phone: E.164 format, +CountryCode + digits
const phoneSchema = z.string()
  .trim()
  .regex(/^\+\d{7,15}$/, "Phone must include country code, e.g. +971501234567");

// 6-digit PIN
const pinSchema = z.string()
  .regex(/^\d{6}$/, "PIN must be exactly 6 digits");

exports.registerSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().toLowerCase(),
  phone: phoneSchema,
  pin: pinSchema,
  country: z.enum(["AE", "SA", "KW", "QA", "BH", "OM", "ET", "ER", "US", "GB"]),
  language: z.enum(["en", "am", "ti"]).optional().default("en"),
  promoCode: z.string().trim().toUpperCase().optional(),
});

exports.loginSchema = z.object({
  phone: phoneSchema,
  pin: pinSchema,
});

exports.changePinSchema = z.object({
  currentPin: pinSchema,
  newPin: pinSchema,
});

// Admin-only: reset another user's PIN (no current PIN required)
exports.adminResetPinSchema = z.object({
  userId: z.string(),
  newPin: pinSchema,
});
