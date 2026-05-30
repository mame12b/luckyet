/**
 * Seed/replace the platform's payment accounts.
 * Run with: node scripts/seedPaymentAccounts.js
 * Safe to run multiple times — replaces the array each time.
 *
 * REPLACE THE PLACEHOLDER ACCOUNT NUMBERS with your real numbers
 * before sharing with players.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Settings = require("../models/Settings");

const ACCOUNTS = [
  // ----- Diaspora (GCC) -----
  {
    method: "botim",
    label: "Botim — Best for GCC",
    accountName: "LuckyET (Placeholder)",
    accountNumber: "+971 50 000 0000",
    forCountries: ["AE", "SA", "KW", "QA", "BH", "OM"],
    instructions: "Send via Botim app to this number. Include your reference code in the message.",
    isActive: true,
  },
  {
    method: "telebirr",
    label: "Telebirr International",
    accountName: "LuckyET (Placeholder)",
    accountNumber: "+251 91 000 0000",
    forCountries: ["AE", "SA", "KW", "QA", "BH", "OM"],
    instructions: "Send via Telebirr International. Include your reference code in the note.",
    isActive: true,
  },
  // ----- Inside Ethiopia -----
  {
    method: "cbe_bank",
    label: "CBE — Commercial Bank of Ethiopia",
    accountName: "LuckyET (Placeholder)",
    accountNumber: "1000 0000 0000 00",
    forCountries: ["ET"],
    instructions: "Transfer to this CBE account. Write your reference code in the description.",
    isActive: true,
  },
  {
    method: "awash_bank",
    label: "Awash Bank",
    accountName: "LuckyET (Placeholder)",
    accountNumber: "0130 0000 0000 00",
    forCountries: ["ET"],
    instructions: "Transfer to this Awash account. Write your reference code in the description.",
    isActive: true,
  },
];

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✓ Connected to MongoDB");

  let settings = await Settings.findOne();
  if (!settings) {
    settings = new Settings();
    console.log("→ No settings doc — creating fresh");
  } else {
    console.log("→ Updating existing settings doc");
  }

  settings.paymentAccounts = ACCOUNTS;
  await settings.save();

  console.log(`✓ Saved ${ACCOUNTS.length} payment accounts:`);
  ACCOUNTS.forEach((a) => console.log(`  · ${a.method} → ${a.label} (countries: ${a.forCountries.join(", ")})`));

  await mongoose.disconnect();
  console.log("✓ Done");
  process.exit(0);
}

main().catch((err) => {
  console.error("✗ Failed:", err);
  process.exit(1);
});
