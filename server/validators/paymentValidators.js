const { z } = require("zod");

exports.initiatePaymentSchema = z.object({
  drawId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid draw id"),
  quantity: z.number().int().positive().max(50),
  paymentMethod: z.enum(["botim", "cbe", "awash", "dashen", "telebirr_intl", "uae_bank", "other"]),
  promoCode: z.string().toUpperCase().optional(),
});

exports.submitReceiptSchema = z.object({
  transactionNumber: z.string().min(3).max(100),
});

exports.verifyPaymentSchema = z.object({
  decision: z.enum(["verified", "rejected"]),
  rejectionReason: z.string().max(500).optional(),
});