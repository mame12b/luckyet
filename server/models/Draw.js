
const mongoose = require("mongoose");

// Sub-schema for each prize tier
const prizeSchema = new mongoose.Schema(
  {
    tier: { type: Number, required: true, min: 1, max: 5 },
    name: { type: String, required: true, maxlength: 200 },
    description: { type: String, maxlength: 1000 },
    imageUrl: { type: String },
    estimatedValueETB: { type: Number, min: 0 },
  },
  { _id: true }
);

// Sub-schema for each tier's winner + quantum proof
const winnerSchema = new mongoose.Schema(
  {
    tier: { type: Number, required: true },
    ticketId: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    quantumProof: {
      seed: String,
      apiResponseHash: String,
      algorithm: { type: String, default: "modulo-v1" },
      algorithmDescription: String,
      source: String,
      sourceLabel: String,
      sourceAttempts: mongoose.Schema.Types.Mixed,
      selectedIndex: Number,
      totalEligibleAtPick: Number, // how many tickets were in the running for this tier
      drawnAt: Date,
    },
  },
  { _id: true }
);

const drawSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    description: { type: String, maxlength: 2000 },

    // === LEGACY single-prize fields (kept for old draws) ===
    prizeName: { type: String }, // optional — only used if prizes[] is empty
    prizeDescription: { type: String },
    prizeImages: [{ type: String }],
    prizeEstimatedValueETB: { type: Number, min: 0 },

    heroImageUrl: { type: String, trim: true },

    // === NEW: multi-tier prize structure ===
    prizes: { type: [prizeSchema], default: [] },

    ticketPriceETB: { type: Number, required: true, min: 1 },
    ticketPoolSize: { type: Number, required: true, min: 1 },
    ticketsSold: { type: Number, default: 0, min: 0 },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    drawDate: { type: Date },

    status: {
      type: String,
      enum: ["draft", "active", "sold_out", "closed", "drawing", "drawn", "cancelled"],
      default: "draft",
      index: true,
    },

    drawAnimation: {
      startedAt: Date,
      durationMs: { type: Number, default: 20000 },
      phase: { type: String, enum: ["idle", "running", "complete"], default: "idle" },
      sampleTicketNumbers: [String],
      tierDurations: [{
        tier: Number,
        durationMs: Number,
      }],
    },

    // === NEW: array of winners, ordered by tier ascending (tier 1 = grand prize) ===
    winners: { type: [winnerSchema], default: [] },

    // === LEGACY single-winner fields (kept for old draws) ===
    winnerTicketId: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket" },
    winnerUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    quantumProof: {
      seed: String,
      apiResponseHash: String,
      algorithm: String,
      algorithmDescription: String,
      source: String,
      sourceLabel: String,
      sourceAttempts: mongoose.Schema.Types.Mixed,
      selectedIndex: Number,
      totalTicketsAtDraw: Number,
      drawnAt: Date,
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    drawnBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

drawSchema.index({ status: 1, endDate: 1 });

drawSchema.virtual("percentSold").get(function () {
  return this.ticketPoolSize > 0
    ? Math.round((this.ticketsSold / this.ticketPoolSize) * 100)
    : 0;
});

// Helper: normalized prize list (works for both old + new draws)
drawSchema.virtual("effectivePrizes").get(function () {
  if (this.prizes?.length) return this.prizes.sort((a, b) => a.tier - b.tier);
  if (this.prizeName) {
    return [
      {
        tier: 1,
        name: this.prizeName,
        description: this.prizeDescription,
        imageUrl: this.prizeImages?.[0],
        estimatedValueETB: this.prizeEstimatedValueETB,
      },
    ];
  }
  return [];
});

drawSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Draw", drawSchema);
