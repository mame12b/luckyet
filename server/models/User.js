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
      index: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true, minlength: 8, select: false },

    // Geography & language
    country: {
      type: String,
      required: true,
      enum: [
        "ET", // Ethiopia
        "AE", // UAE
        "SA", // Saudi Arabia
        "KW", // Kuwait
        "QA", // Qatar
        "BH", // Bahrain
        "OM", // Oman
        "OTHER",
      ],
    },
    language: { type: String, enum: ["en", "am", "ti"], default: "en" },

    // Role
    role: {
      type: String,
      enum: ["player", "streamer", "admin", "super_admin"],
      default: "player",
      index: true,
    },

    // KYC (only filled when needed, e.g. for winners)
    nationalIdEncrypted: { type: String, select: false }, // AES-encrypted
    kycStatus: {
      type: String,
      enum: ["not_required", "pending", "verified", "rejected"],
      default: "not_required",
    },
    kycDocuments: [{ type: String }], // Cloudinary URLs

    // Referral
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "Streamer" },
    referredByCode: { type: String },

    // Status
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },

    // 2FA (admins only)
    twoFactorSecret: { type: String, select: false },
    twoFactorEnabled: { type: Boolean, default: false },

    // Security
    lastLoginAt: { type: Date },
    lastLoginIp: { type: String },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance method to compare password
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Hide sensitive fields in JSON
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.twoFactorSecret;
  delete obj.nationalIdEncrypted;
  delete obj.failedLoginAttempts;
  delete obj.lockedUntil;
  return obj;
};

module.exports = mongoose.model("User", userSchema);