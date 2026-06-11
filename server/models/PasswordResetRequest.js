const mongoose = require("mongoose");
const crypto = require("crypto");

const passwordResetRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    reason: { type: String, maxlength: 500 },
    contactMethod: { type: String, maxlength: 100 },

    status: {
      type: String,
      enum: ["pending", "approved", "completed", "rejected", "expired"],
      default: "pending",
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
    rejectionReason: String,

    resetCodeHash: String,
    resetCodeExpiresAt: Date,

    completedAt: Date,
  },
  { timestamps: true }
);

// Compound index — speeds up the rate-limit query
// (countDocuments by userId + createdAt > oneHourAgo)
passwordResetRequestSchema.index({ userId: 1, createdAt: -1 });

// Static method — cryptographic 6-digit code
passwordResetRequestSchema.statics.generateCode = function () {
  const buf = crypto.randomBytes(3);
  const num = (buf.readUIntBE(0, 3) % 1000000).toString().padStart(6, "0");
  return num;
};

module.exports = mongoose.model("PasswordResetRequest", passwordResetRequestSchema);