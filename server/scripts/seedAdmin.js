/**
 * Seed a super admin user.
 * Run with: npm run seed:admin
 *
 * Reads from env:
 *   SEED_ADMIN_EMAIL
 *   SEED_ADMIN_PHONE
 *   SEED_ADMIN_PASSWORD
 *   SEED_ADMIN_NAME
 */
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const { getSettings } = require("../services/settingsService");

const email = process.env.SEED_ADMIN_EMAIL || "admin@luckyet.com";
const phone = process.env.SEED_ADMIN_PHONE || "+251911000000";
const password = process.env.SEED_ADMIN_PASSWORD || "ChangeMeNow123";
const fullName = process.env.SEED_ADMIN_NAME || "Super Admin";

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✓ Connected to MongoDB");

    // Initialize settings
    await getSettings();

    let user = await User.findOne({ email });
    if (user) {
      console.log(`✓ User ${email} already exists. Promoting to super_admin if not already.`);
      if (user.role !== "super_admin") {
        user.role = "super_admin";
        await user.save();
        console.log("✓ Promoted to super_admin");
      }
    } else {
      user = await User.create({
        fullName,
        email,
        phone,
        password,
        country: "ET",
        role: "super_admin",
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
      });
      console.log(`✓ Super admin created: ${email}`);
      console.log(`  Password: ${password}`);
      console.log(`  ⚠ Change this password after first login!`);
    }

    process.exit(0);
  } catch (err) {
    console.error("✗ Seed failed:", err);
    process.exit(1);
  }
})();