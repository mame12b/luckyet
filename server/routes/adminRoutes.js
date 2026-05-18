
const router = require("express").Router();
const drawCtrl = require("../controllers/drawController");
const paymentCtrl = require("../controllers/paymentController");
const winnerCtrl = require("../controllers/winnerController");
const streamerCtrl = require("../controllers/streamerController");
const { requireAuth, requireRole } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const {
  createDrawSchema,
  updateDrawSchema,
  updateStatusSchema,
} = require("../validators/drawValidators");
const { verifyPaymentSchema } = require("../validators/paymentValidators");
const {
  adminApproveStreamerSchema,
  adminPayoutActionSchema,
} = require("../validators/streamerValidators");

router.use(requireAuth);
router.use(requireRole("admin", "super_admin"));

// Draws
router.get("/draws", drawCtrl.adminListAll);
router.post("/draws", validate({ body: createDrawSchema }), drawCtrl.adminCreate);
router.patch("/draws/:id", validate({ body: updateDrawSchema }), drawCtrl.adminUpdate);
router.patch("/draws/:id/status", validate({ body: updateStatusSchema }), drawCtrl.adminUpdateStatus);
router.get("/draws/:id/tickets", drawCtrl.adminGetTickets);
router.post("/draws/:id/start-broadcast", winnerCtrl.startDraw);

// Payments
router.get("/payments/pending", paymentCtrl.adminListPending);
router.get("/payments", paymentCtrl.adminListAll);
router.post("/payments/:id/verify", validate({ body: verifyPaymentSchema }), paymentCtrl.adminVerify);

// Streamers
router.get("/streamers", streamerCtrl.adminListStreamers);
router.get("/streamers/:id", streamerCtrl.adminGetStreamer);
router.post("/streamers/:id/approve", validate({ body: adminApproveStreamerSchema }), streamerCtrl.adminApproveStreamer);
router.post("/streamers/:id/suspend", streamerCtrl.adminSuspendStreamer);
router.patch("/streamers/:id", streamerCtrl.adminUpdateStreamer);

// Payouts
router.get("/payouts", streamerCtrl.adminListPayouts);
router.post("/payouts/:id", validate({ body: adminPayoutActionSchema }), streamerCtrl.adminPayoutAction);

module.exports = router;
