
const { z } = require("zod");

const prizeSchema = z.object({
  tier: z.number().int().min(1).max(5),
  name: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  estimatedValueETB: z.number().positive().optional(),
});

exports.createDrawSchema = z.object({
  title: z.string().min(3).max(200),
  slug: z.string().min(3).max(80).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  description: z.string().max(2000).optional(),

  // Multi-tier prizes (new approach)
  prizes: z.array(prizeSchema).min(1).max(5).optional(),

  // Legacy single-prize fields (still accepted for backward compatibility)
  prizeName: z.string().min(2).max(200).optional(),
  prizeDescription: z.string().max(2000).optional(),
  prizeImages: z.array(z.string().url()).optional().default([]),
  prizeEstimatedValueETB: z.number().positive().optional(),

  ticketPriceETB: z.number().positive(),
  ticketPoolSize: z.number().int().positive().max(1_000_000),
  startDate: z.string().datetime().or(z.date()),
  endDate: z.string().datetime().or(z.date()),
  drawDate: z.string().datetime().or(z.date()).optional(),
}).refine(
  (data) => (data.prizes?.length > 0) || !!data.prizeName,
  { message: "Either prizes[] or prizeName is required" }
);

exports.updateDrawSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(2000).optional(),
  prizes: z.array(prizeSchema).min(1).max(5).optional(),
  prizeName: z.string().min(2).max(200).optional(),
  prizeDescription: z.string().max(2000).optional(),
  prizeImages: z.array(z.string().url()).optional(),
  prizeEstimatedValueETB: z.number().positive().optional(),
  drawDate: z.string().datetime().or(z.date()).optional(),
});

exports.updateStatusSchema = z.object({
  status: z.enum(["draft", "active", "closed", "cancelled"]),
});