const mongoose = require("mongoose");
const crypto = require("crypto");

const passwordResetRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // What the user told us when they submitted the request
    reason: { type: String, maxlength: 500 },
    contactMethod: { type: String, maxlength: 100 }, // "WhatsApp", "phone call", etc.

    status: {
      type: String,
      enum: ["pending", "approved", "completed", "rejected", "expired"],
      default: "pending",
      index: true,
    },

    // Admin who reviewed
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
    rejectionReason: String,

    // Once approved: a single-use code the user types into the reset page.
    // Stored as bcrypt hash; never logged.
    resetCodeHash: String,
    resetCodeExpiresAt: Date,

    completedAt: Date,
  },
  { timestamps: true }
);

// Generate a random 6-digit code (string) for the reset
passwordResetRequestSchema.statics.generateCode = function () {
  // Cryptographic random — not Math.random
  const buf = crypto.randomBytes(3);
  const num = (buf.readUIntBE(0, 3) % 1000000).toString().padStart(6, "0");
  return num;
};

module.exports = mongoose.model("PasswordResetRequest", passwordResetRequestSchema);
