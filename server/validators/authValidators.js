const { z } = require("zod");

const phoneRegex = /^\+?[1-9]\d{7,14}$/;

exports.registerSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email().toLowerCase(),
  phone: z.string().regex(phoneRegex, "Invalid phone number"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
  country: z.enum(["ET", "AE", "SA", "KW", "QA", "BH", "OM", "OTHER"]),
  language: z.enum(["en", "am", "ti"]).optional(),
  referredByCode: z.string().toUpperCase().optional(),
});

exports.loginSchema = z.object({
  emailOrPhone: z.string().min(3),
  password: z.string().min(1),
});

exports.refreshSchema = z.object({
  refreshToken: z.string().optional(), // can also come from cookie
});