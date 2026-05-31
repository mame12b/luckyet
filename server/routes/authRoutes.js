const router = require("express").Router();
const ctrl = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { authRateLimit } = require("../middleware/rateLimit");
const {
  registerSchema,
  loginSchema,
  changePinSchema,
} = require("../validators/authValidators");

router.post("/register", authRateLimit, validate({ body: registerSchema }), ctrl.register);
router.post("/login", authRateLimit, validate({ body: loginSchema }), ctrl.login);
router.post("/refresh", ctrl.refresh);
router.post("/logout", ctrl.logout);

router.get("/me", requireAuth, ctrl.me);
router.post("/change-pin", requireAuth, validate({ body: changePinSchema }), ctrl.changePin);

module.exports = router;
