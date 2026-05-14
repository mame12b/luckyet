const { z } = require("zod");

exports.createDrawSchema = z.object({
  title: z.string().min(3).max(200),
  slug: z.string().min(3).max(80).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  description: z.string().max(2000).optional(),
  prizeName: z.string().min(2).max(200),
  prizeDescription: z.string().max(2000).optional(),
  prizeImages: z.array(z.string().url()).optional().default([]),
  prizeEstimatedValueETB: z.number().positive(),
  ticketPriceETB: z.number().positive(),
  ticketPoolSize: z.number().int().positive().max(1_000_000),
  startDate: z.string().datetime().or(z.date()),
  endDate: z.string().datetime().or(z.date()),
  drawDate: z.string().datetime().or(z.date()).optional(),
});

exports.updateDrawSchema = exports.createDrawSchema.partial();

exports.updateStatusSchema = z.object({
  status: z.enum(["draft", "active", "closed", "cancelled"]),
});