const { z } = require("zod");

// ====== USER applies to become a streamer ======
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

// ====== STREAMER requests a payout ======
exports.requestPayoutSchema = z.object({
  amountETB: z.number().int().positive(),
  method: z.enum(["botim", "bank_transfer", "telebirr"]),
  payoutAccountDetails: z.string().min(3).max(500),
  notes: z.string().max(500).optional(),
});

// ====== ADMIN approves an existing pending streamer ======
exports.adminApproveStreamerSchema = z.object({
  commissionPercent: z.number().min(0).max(50).optional(),
  playerDiscountPercent: z.number().min(0).max(50).optional(),
});

// ====== ADMIN creates a streamer directly (invite flow) ======
// Note: includes userId + optional commission override + standard streamer fields.
exports.adminCreateStreamerSchema = z.object({
  userId: z.string().min(1, "userId required"),
  promoCode: z
    .string()
    .toUpperCase()
    .min(3, "Promo code must be at least 3 characters")
    .max(20)
    .regex(/^[A-Z0-9]+$/, "Letters and numbers only, no spaces"),
  commissionPercent: z.number().min(0).max(50).optional(),
  tiktokHandle: z.string().max(50).optional(),
  instagramHandle: z.string().max(50).optional(),
  youtubeHandle: z.string().max(100).optional(),
  payoutMethod: z.enum(["botim", "bank_transfer", "telebirr"]).optional(),
  payoutAccountDetails: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
});

// ====== ADMIN acts on a payout request ======
// paymentProof accepts URL, transaction ID, or short note like "manual" / "cash".
// Required only when action is "mark_paid" — enforced at controller level.
exports.adminPayoutActionSchema = z.object({
  action: z.enum(["approve", "mark_paid", "reject"]),
  rejectionReason: z.string().max(500).optional(),
  paymentProof: z.string().min(1).max(500).optional(),
});
