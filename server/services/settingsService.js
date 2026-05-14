const Settings = require("../models/Settings");

const DEFAULT_PAYMENT_ACCOUNTS = [
  {
    method: "botim",
    label: "Botim (UAE) — Recommended for GCC",
    accountNumber: "+971 50 000 0000",
    accountName: "LuckyET (Placeholder)",
    instructions: "Send via Botim app. Include reference code in the message.",
    forCountries: ["AE", "SA", "KW", "QA", "BH", "OM"],
    isActive: true,
  },
  {
    method: "cbe",
    label: "CBE Birr (Ethiopia)",
    accountNumber: "1000 0000 0000 00",
    accountName: "LuckyET (Placeholder)",
    instructions: "Bank transfer to Commercial Bank of Ethiopia. Include reference in transfer note.",
    forCountries: ["ET"],
    isActive: true,
  },
  {
    method: "telebirr_intl",
    label: "Telebirr International",
    accountNumber: "+251 91 000 0000",
    accountName: "LuckyET (Placeholder)",
    instructions: "Send via Telebirr International transfer. Include reference code.",
    forCountries: [], // all countries
    isActive: true,
  },
];

/**
 * Get the singleton settings doc, creating it with defaults if missing.
 */
exports.getSettings = async () => {
  let settings = await Settings.findOne({ key: "main" });
  if (!settings) {
    settings = await Settings.create({
      key: "main",
      paymentAccounts: DEFAULT_PAYMENT_ACCOUNTS,
    });
    console.log("✓ Settings initialized with placeholder defaults");
  }
  return settings;
};

/**
 * Get payment accounts visible to a given country.
 */
exports.getPaymentAccountsForCountry = async (country) => {
  const settings = await exports.getSettings();
  return settings.paymentAccounts.filter(
    (acc) =>
      acc.isActive &&
      (acc.forCountries.length === 0 || acc.forCountries.includes(country))
  );
};