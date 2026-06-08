const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/.+\@.+\..+/, "Invalid email"],
    },
    // Phone in E.164 format, e.g. "+971501234567" — PRIMARY login identifier
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^\+\d{7,15}$/, "Phone must be E.164 format, e.g. +971501234567"],
    },

    // ===== Authentication =====
    // We support BOTH during transition:
    //   - passwordHash: legacy 8-char password (will be removed in Phase 7)
    //   - pinHash: new 6-digit PIN
    // Existing users still have passwordHash; new users only get pinHash.
    passwordHash: { type: String },
    pinHash: { type: String },

    // ===== Lockout =====
    loginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },

    country: {
      type: String,
      enum: ["AE", "SA", "KW", "QA", "BH", "OM", "ET", "ER", "US", "GB"],
      required: true,
    },
    language: { type: String, enum: ["en", "am", "ti", "om"], default: "en" },

    role: {
      type: String,
      enum: ["player", "streamer", "admin", "super_admin"],
      default: "player",
      index: true,
    },
    isActive: { type: Boolean, default: true },

    // Promo code attribution (when player signed up via streamer)
    referredByPromoCode: { type: String },
    referredByStreamerId: { type: mongoose.Schema.Types.ObjectId, ref: "Streamer" },
  },
  { timestamps: true }
);

// userSchema.index({ phone: 1 });
// userSchema.index({ email: 1 });

// ===== Methods =====

// Verify a PIN (or legacy password) against stored hashes.
// Returns "pin" | "password" | null
userSchema.methods.verifyCredential = async function (input) {
  if (this.pinHash) {
    const ok = await bcrypt.compare(input, this.pinHash);
    if (ok) return "pin";
  }
  if (this.passwordHash) {
    const ok = await bcrypt.compare(input, this.passwordHash);
    if (ok) return "password";
  }
  return null;
};

// Set a new PIN (clears legacy password)
userSchema.methods.setPin = async function (pin) {
  if (!/^\d{6}$/.test(pin)) throw new Error("PIN must be exactly 6 digits");
  this.pinHash = await bcrypt.hash(pin, 10);
  this.passwordHash = undefined;
};

// Check if account is locked
userSchema.methods.isLocked = function () {
  return this.lockedUntil && this.lockedUntil > new Date();
};

userSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.pinHash;
    delete ret.loginAttempts;
    delete ret.lockedUntil;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);
