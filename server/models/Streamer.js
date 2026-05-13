const mongoose = require("mongoose");

const streamerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    promoCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
      index: true,
    },
    tiktokHandle: { type: String, trim: true },
    instagramHandle: { type: String, trim: true },
    youtubeHandle: { type: String, trim: true },

    // Commission
    commissionPercent: { type: Number, required: true, min: 0, max: 30, default: 7 },
    playerDiscountPercent: { type: Number, default: 0, min: 0, max: 50 }, // discount given to players using their code

    // Stats (denormalized for fast dashboard reads)
    totalTicketsAttributed: { type: Number, default: 0 },
    totalSalesETB: { type: Number, default: 0 },
    totalCommissionEarnedETB: { type: Number, default: 0 },
    totalPaidOutETB: { type: Number, default: 0 },

    // Status
    status: {
      type: String,
      enum: ["pending", "active", "suspended", "terminated"],
      default: "pending",
      index: true,
    },

    // Payout preferences
    payoutMethod: { type: String, enum: ["botim", "bank_transfer", "telebirr"], default: "bank_transfer" },
    payoutAccountDetails: { type: String }, // encrypted in production

    notes: { type: String, maxlength: 1000 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Streamer", streamerSchema);