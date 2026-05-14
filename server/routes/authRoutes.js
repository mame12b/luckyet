const router = require("express").Router();

const authController = require("../controllers/authController");
const { validate } = require("../middleware/validate");
const { requireAuth } = require("../middleware/auth");
const { authRateLimit } = require("../middleware/rateLimit");
const {
  registerSchema,
  loginSchema,
} = require("../validators/authValidators");

router.post("/register", authRateLimit, validate({ body: registerSchema }), authController.register);
router.post("/login", authRateLimit, validate({ body: loginSchema }), authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.get("/me", requireAuth, authController.me);

module.exports = router;