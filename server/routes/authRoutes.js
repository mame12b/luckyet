const router = require("express").Router();
const ctrl = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { authRateLimit } = require("../middleware/rateLimit");
const {
  registerSchema,
  loginSchema,
  changePinSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateLanguageSchema,
  
} = require("../validators/authValidators");

router.post("/register", authRateLimit, validate({ body: registerSchema }), ctrl.register);
router.post("/login", authRateLimit, validate({ body: loginSchema }), ctrl.login);
router.post("/refresh", ctrl.refresh);
router.post("/logout", ctrl.logout);
router.post("/forgot-password", ctrl.requestPasswordReset);
router.post("/reset-password", ctrl.completePasswordReset);

router.get("/me", requireAuth, ctrl.me);
router.post("/change-pin", requireAuth, validate({ body: changePinSchema }), ctrl.changePin);

router.patch("/me/language", requireAuth, ctrl.updateLanguage);


// TEMPORARY — for testing email infrastructure. DELETE AFTER PHASE A VERIFICATION.
router.post("/test-email", async (req, res) => {

  const { sendOTPEmail } = require("../services/emailService");
  const { email, name } = req.body;
  if (!email) return res.status(400).json({ message: "email required" });
  const result = await sendOTPEmail(email, "123456", name || "Test User");
  res.json(result);
});

module.exports = router;
