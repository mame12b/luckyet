const router = require("express").Router();
const drawCtrl = require("../controllers/drawController");
const paymentCtrl = require("../controllers/paymentController");
const { requireAuth, requireRole } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const {
  createDrawSchema,
  updateDrawSchema,
  updateStatusSchema,
} = require("../validators/drawValidators");
const { verifyPaymentSchema } = require("../validators/paymentValidators");

// All admin routes require auth + admin/super_admin role
router.use(requireAuth);
router.use(requireRole("admin", "super_admin"));

// Draws
router.get("/draws", drawCtrl.adminListAll);
router.post("/draws", validate({ body: createDrawSchema }), drawCtrl.adminCreate);
router.patch("/draws/:id", validate({ body: updateDrawSchema }), drawCtrl.adminUpdate);
router.patch("/draws/:id/status", validate({ body: updateStatusSchema }), drawCtrl.adminUpdateStatus);
router.get("/draws/:id/tickets", drawCtrl.adminGetTickets);

// Payments
router.get("/payments/pending", paymentCtrl.adminListPending);
router.get("/payments", paymentCtrl.adminListAll);
router.post("/payments/:id/verify", validate({ body: verifyPaymentSchema }), paymentCtrl.adminVerify);

module.exports = router;