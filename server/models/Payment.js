const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    // Unique reference shown to player — they include this in their transfer
    referenceCode: { type: String, required: true, unique: true, index: true },

    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    drawId: { type: mongoose.Schema.Types.ObjectId, ref: "Draw", required: true, index: true },

    // Order details
    quantity: { type: Number, required: true, min: 1, max: 100 },
    unitPriceETB: { type: Number, required: true },
    subtotalETB: { type: Number, required: true },
    discountETB: { type: Number, default: 0 },
    totalETB: { type: Number, required: true },

    // Display currency (for receipt)
    displayCurrency: { type: String, enum: ["ETB", "AED", "SAR", "USD", "KWD", "QAR", "OMR", "BHD"] },
    displayAmount: { type: Number },
    exchangeRate: { type: Number }, // ETB per 1 unit of display currency

    // Promo / referral
    promoCodeUsed: { type: String, uppercase: true, trim: true },
    streamerId: { type: mongoose.Schema.Types.ObjectId, ref: "Streamer" },

    // Payment method
    paymentMethod: {
      type: String,
      enum: ["botim", "cbe", "awash", "dashen", "telebirr_intl", "uae_bank", "other"],
      required: true,
    },
    paymentCountry: { type: String }, // where the player paid from
    transactionNumber: { type: String, trim: true }, // entered by user
    receiptImageUrl: { type: String }, // Cloudinary URL

    // Status
    status: {
      type: String,
      enum: ["pending_upload", "awaiting_verification", "verified", "rejected", "expired", "refunded"],
      default: "pending_upload",
      index: true,
    },

    // Verification
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date },
    rejectionReason: { type: String, maxlength: 500 },

    // TTL — auto-expire if not paid within 48 hours
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

paymentSchema.index({ userId: 1, status: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Payment", paymentSchema);