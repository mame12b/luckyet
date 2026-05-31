/**
 * Seed/promote the default super_admin account.
 * Run: node scripts/seedAdmin.js
 *
 * Reads from env:
 *   SEED_ADMIN_EMAIL
 *   SEED_ADMIN_PHONE
 *   SEED_ADMIN_PIN     (6 digits)
 *   SEED_ADMIN_NAME
 */
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

const EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@luckyet.com";
const PHONE = process.env.SEED_ADMIN_PHONE || "+971563561803";
const PIN = process.env.SEED_ADMIN_PIN || "122119";
const NAME = process.env.SEED_ADMIN_NAME || "Super Admin";

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✓ Connected");

  if (!/^\d{6}$/.test(PIN)) {
    console.error("✗ SEED_ADMIN_PIN must be exactly 6 digits");
    process.exit(1);
  }

  // Prefer phone match (it's the login identifier). Fall back to email.
let user = await User.findOne({ phone: PHONE });
if (!user) {
  user = await User.findOne({ email: EMAIL });
  // If found by email but phone differs, UPDATE THE PHONE
  if (user && user.phone !== PHONE) {
    console.log(`→ Existing admin found at email ${EMAIL} with phone ${user.phone}, updating phone to ${PHONE}`);
    user.phone = PHONE;
  }
}

  if (!user) {
    user = new User({
      fullName: NAME,
      email: EMAIL,
      phone: PHONE,
      country: "AE",
      role: "super_admin",
    });
    await user.setPin(PIN);
    await user.save();
    console.log(`✓ Created super_admin: ${EMAIL} (phone ${PHONE})`);
  } else {
    user.role = "super_admin";
    user.isActive = true;
    user.loginAttempts = 0;
    user.lockedUntil = undefined;
    await user.setPin(PIN);
    await user.save();
    console.log(`✓ Updated super_admin: ${EMAIL} (phone ${PHONE}) — PIN reset, lockout cleared`);
  }

  console.log("");
  console.log("=== Login credentials ===");
  console.log(`Phone: ${PHONE}`);
  console.log(`PIN:   ${PIN}`);
  console.log("");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("✗ Failed:", err);
  process.exit(1);
});
