
const router = require("express").Router();
const Settings = require("../models/Settings");
const { requireAuth, requireRole } = require("../middleware/auth");

/**
 * GET /api/settings/payment-methods?country=AE
 * PUBLIC — returns the payment accounts visible to a player from a given country.
 */
router.get("/payment-methods", async (req, res, next) => {
  try {
    const country = (req.query.country || "").toUpperCase();
    const settings = await Settings.findOne();
    if (!settings) return res.json({ paymentAccounts: [] });

    const accounts = (settings.paymentAccounts || [])
      .filter((a) => a.isActive)
      .map((a) => {
        // Account is "recommended" for this user if their country matches.
        // Accounts with no country restriction are recommended for everyone.
        const countries = (a.forCountries || []).map((c) => c.toUpperCase());
        const recommended =
          countries.length === 0 ||
          (country && countries.includes(country));
        return {
          method: a.method,
          label: a.label,
          accountName: a.accountName,
          accountNumber: a.accountNumber,
          instructions: a.instructions,
          isActive: a.isActive,
          forCountries: a.forCountries || [],
          recommended,
        };
      })
      // Recommended methods first, then the rest — preserving relative order within each group
      .sort((a, b) => (b.recommended ? 1 : 0) - (a.recommended ? 1 : 0));

    res.json({ paymentAccounts: accounts });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/settings/public
 * PUBLIC — exchange rates and a few non-sensitive fields.
 */
router.get("/public", async (req, res, next) => {
  try {
    const settings = await Settings.findOne();
    if (!settings) return res.json({ settings: null });
    res.json({
      settings: {
        exchangeRates: settings.exchangeRates,
        supportEmail: settings.supportEmail,
        supportWhatsApp: settings.supportWhatsApp,
        supportTelegram: settings.supportTelegram,
        maxTicketsPerPurchase: settings.maxTicketsPerPurchase,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ===== Admin / super admin only below =====
router.use(requireAuth);
router.use(requireRole("admin", "super_admin"));

router.get("/", async (req, res, next) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create({});
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

router.patch("/", requireRole("super_admin"), async (req, res, next) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) settings = new Settings();
    Object.assign(settings, req.body);
    await settings.save();
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
