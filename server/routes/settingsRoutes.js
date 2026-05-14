const router = require("express").Router();
const { requireAuth, requireRole } = require("../middleware/auth");
const { getSettings, getPaymentAccountsForCountry } = require("../services/settingsService");
const Settings = require("../models/Settings");
const { logAudit } = require("../services/auditService");

// Public: payment accounts visible to a country
router.get("/payment-accounts", async (req, res, next) => {
  try {
    const country = req.query.country || "AE";
    const accounts = await getPaymentAccountsForCountry(country);
    res.json({ accounts });
  } catch (err) {
    next(err);
  }
});

// Auth: full settings (no secrets exposed)
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const s = await getSettings();
    res.json({ settings: s });
  } catch (err) {
    next(err);
  }
});

// Super admin: update settings
router.patch("/", requireAuth, requireRole("super_admin"), async (req, res, next) => {
  try {
    const allowed = [
      "paymentAccounts",
      "exchangeRates",
      "defaultStreamerCommissionPercent",
      "paymentExpiryHours",
      "maxTicketsPerPurchase",
      "supportEmail",
      "supportWhatsApp",
      "supportTelegram",
    ];
    const updates = {};
    for (const k of allowed) if (k in req.body) updates[k] = req.body[k];
    if (updates.exchangeRates) updates.exchangeRatesUpdatedAt = new Date();

    const s = await Settings.findOneAndUpdate({ key: "main" }, updates, {
      new: true,
      upsert: true,
    });

    await logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: "settings.updated",
      targetType: "Settings",
      targetId: s._id,
      metadata: { keys: Object.keys(updates) },
      req,
    });

    res.json({ settings: s });
  } catch (err) {
    next(err);
  }
});

module.exports = router;