
const router = require("express").Router();
const ctrl = require("../controllers/streamerController");
const { requireAuth } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { applySchema, requestPayoutSchema } = require("../validators/streamerValidators");

// Public: validate a promo code (called from buy-ticket page)
router.get("/validate/:code", ctrl.validatePromoCode);

// Auth required
router.use(requireAuth);

router.post("/apply", validate({ body: applySchema }), ctrl.apply);
router.get("/me", ctrl.getMyDashboard);
router.post("/me/payouts", validate({ body: requestPayoutSchema }), ctrl.requestPayout);

module.exports = router;
