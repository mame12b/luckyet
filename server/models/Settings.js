const mongoose = require("mongoose");

const paymentAccountSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: ["botim", "cbe", "awash", "dashen", "telebirr_intl", "uae_bank"],
      required: true,
    },
    label: { type: String, required: true }, // "Botim (UAE)"
    accountNumber: { type: String, required: true },
    accountName: { type: String, required: true },
    instructions: { type: String }, // optional extra notes
    forCountries: [{ type: String }], // ["AE", "SA"] — empty = all
    isActive: { type: Boolean, default: true },
  },
  { _id: true }
);

const settingsSchema = new mongoose.Schema(
  {
    // Single-document pattern: key = "main"
    key: { type: String, default: "main", unique: true },

    // Payment accounts
    paymentAccounts: [paymentAccountSchema],

    // Exchange rates (ETB per 1 unit of foreign currency)
    // e.g. 1 AED = 15 ETB → exchangeRates.AED = 15
    exchangeRates: {
      AED: { type: Number, default: 15 },
      SAR: { type: Number, default: 14.7 },
      USD: { type: Number, default: 55 },
      KWD: { type: Number, default: 178 },
      QAR: { type: Number, default: 15.1 },
      OMR: { type: Number, default: 143 },
      BHD: { type: Number, default: 146 },
    },
    exchangeRatesUpdatedAt: { type: Date, default: Date.now },

    // Platform config
    defaultStreamerCommissionPercent: { type: Number, default: 7 },
    paymentExpiryHours: { type: Number, default: 48 },
    maxTicketsPerPurchase: { type: Number, default: 50 },

    // Support contacts
    supportEmail: { type: String, default: "support@luckyet.com" },
    supportWhatsApp: { type: String, default: "+971500000000" },
    supportTelegram: { type: String, default: "@luckyet_support" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Settings", settingsSchema);