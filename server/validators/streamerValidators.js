
const { z } = require("zod");

exports.applySchema = z.object({
  promoCode: z
    .string()
    .toUpperCase()
    .min(3, "Promo code must be at least 3 characters")
    .max(20)
    .regex(/^[A-Z0-9]+$/, "Letters and numbers only, no spaces"),
  tiktokHandle: z.string().max(50).optional(),
  instagramHandle: z.string().max(50).optional(),
  youtubeHandle: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
  payoutMethod: z.enum(["botim", "bank_transfer", "telebirr"]).optional(),
  payoutAccountDetails: z.string().max(500).optional(),
});

exports.requestPayoutSchema = z.object({
  amountETB: z.number().int().positive(),
  method: z.enum(["botim", "bank_transfer", "telebirr"]),
  payoutAccountDetails: z.string().min(3).max(500),
  notes: z.string().max(500).optional(),
});

exports.adminApproveStreamerSchema = z.object({
  commissionPercent: z.number().min(0).max(30).optional(),
  playerDiscountPercent: z.number().min(0).max(50).optional(),
});

exports.adminPayoutActionSchema = z.object({
  action: z.enum(["approve", "mark_paid", "reject"]),
  rejectionReason: z.string().max(500).optional(),
  paymentProof: z.string().url().optional(),
});
