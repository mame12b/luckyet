const router = require("express").Router();
const ctrl = require("../controllers/paymentController");
const { requireAuth } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { uploadReceipt } = require("../middleware/upload");
const { paymentRateLimit } = require("../middleware/rateLimit");
const {
  initiatePaymentSchema,
  submitReceiptSchema,
} = require("../validators/paymentValidators");

// All payment routes require auth
router.use(requireAuth);

router.post("/initiate", paymentRateLimit, validate({ body: initiatePaymentSchema }), ctrl.initiate);
router.post(
  "/:id/receipt",
  paymentRateLimit,
  uploadReceipt,
  validate({ body: submitReceiptSchema }),
  ctrl.submitReceipt
);
router.get("/mine", ctrl.listMyPayments);

module.exports = router;