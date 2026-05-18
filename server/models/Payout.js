
const mongoose = require("mongoose");

const payoutSchema = new mongoose.Schema(
  {
    // Unique reference shown to streamer
    referenceCode: { type: String, required: true, unique: true, index: true },

    streamerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Streamer",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    amountETB: { type: Number, required: true, min: 1 },

    // Snapshot of streamer's earnings at request time (for audit)
    snapshotAtRequest: {
      totalCommissionEarnedETB: { type: Number },
      totalPaidOutETB: { type: Number },
      availableETB: { type: Number },
    },

    method: {
      type: String,
      enum: ["botim", "bank_transfer", "telebirr"],
      required: true,
    },
    payoutAccountDetails: { type: String, required: true }, // free-form (account number, phone, etc.)
    notes: { type: String, maxlength: 500 },

    status: {
      type: String,
      enum: ["requested", "approved", "paid", "rejected", "cancelled"],
      default: "requested",
      index: true,
    },

    // Admin actions
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    paidAt: { type: Date },
    paymentProof: { type: String }, // receipt URL after admin pays
    rejectionReason: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

payoutSchema.index({ streamerId: 1, status: 1 });
payoutSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Payout", payoutSchema);
