const router = require("express").Router();

const { requireAuth, requireRole } = require("../middleware/auth");
const { validate } = require("../middleware/validate");

// Controllers
const drawCtrl = require("../controllers/drawController");
const paymentCtrl = require("../controllers/paymentController");
const winnerCtrl = require("../controllers/winnerController");
const streamerController = require("../controllers/streamerController");
const authController = require("../controllers/authController");
const analyticsController = require("../controllers/analyticsController");

// Validators
const {
  createDrawSchema,
  updateDrawSchema,
  updateStatusSchema,
} = require("../validators/drawValidators");
const { verifyPaymentSchema } = require("../validators/paymentValidators");
const {
  adminApproveStreamerSchema,
  adminCreateStreamerSchema,
  adminPayoutActionSchema,
} = require("../validators/streamerValidators");

// All admin routes require an authenticated admin or super_admin
router.use(requireAuth);
router.use(requireRole("admin", "super_admin"));

/* ===========================================================
 * Draws
 * =========================================================== */
router.get("/draws", drawCtrl.adminListAll);
router.post("/draws", validate({ body: createDrawSchema }), drawCtrl.adminCreate);
router.patch("/draws/:id", validate({ body: updateDrawSchema }), drawCtrl.adminUpdate);
router.patch("/draws/:id/status", validate({ body: updateStatusSchema }), drawCtrl.adminUpdateStatus);
router.get("/draws/:id/tickets", drawCtrl.adminGetTickets);
router.post("/draws/:id/start-broadcast", winnerCtrl.startDraw);

/* ===========================================================
 * Payments
 * =========================================================== */
router.get("/payments/pending", paymentCtrl.adminListPending);
router.get("/payments", paymentCtrl.adminListAll);
router.post(
  "/payments/:id/verify",
  validate({ body: verifyPaymentSchema }),
  paymentCtrl.adminVerify
);

/* ===========================================================
 * Streamer / promoter management
 * Any admin can read; only super_admin can mutate.
 * =========================================================== */
router.get("/streamers", streamerController.adminListStreamers);
router.get("/streamers/:id", streamerController.adminGetStreamer);

router.post(
  "/streamers",
  requireRole("super_admin"),
  validate({ body: adminCreateStreamerSchema }),
  streamerController.adminCreateStreamer
);
router.patch(
  "/streamers/:id",
  requireRole("super_admin"),
  streamerController.adminUpdateStreamer
);
router.post(
  "/streamers/:id/approve",
  requireRole("super_admin"),
  validate({ body: adminApproveStreamerSchema }),
  streamerController.adminApproveStreamer
);
router.post(
  "/streamers/:id/suspend",
  requireRole("super_admin"),
  streamerController.adminSuspendStreamer
);

/* ===========================================================
 * Payouts
 * =========================================================== */
router.get("/payouts", streamerController.adminListPayouts);
router.post(
  "/payouts/:id/action",
  requireRole("super_admin"),
  validate({ body: adminPayoutActionSchema }),
  streamerController.adminPayoutAction
);

/* ===========================================================
 * Analytics
 * =========================================================== */
router.get("/analytics/kpis", analyticsController.kpis);
router.get("/analytics/daily-sales", analyticsController.dailySales);
router.get("/analytics/draws", analyticsController.drawBreakdown);
router.get("/analytics/breakdowns", analyticsController.breakdowns);
router.get("/analytics/promoters", analyticsController.promoters);

/* ===========================================================
 * Password reset requests
 * Any admin can list; only super_admin can approve/reject.
 * =========================================================== */
router.get("/password-resets", authController.adminListResetRequests);
router.post(
  "/password-resets/:id/approve",
  requireRole("super_admin"),
  authController.adminApproveResetRequest
);
router.post(
  "/password-resets/:id/reject",
  requireRole("super_admin"),
  authController.adminRejectResetRequest
);

/* ===========================================================
 * Users — list and view (inline handlers for now)
 * =========================================================== */
router.get("/users", async (req, res, next) => {
  try {
    const User = require("../models/User");
    const { search, role, limit = 50 } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (search) {
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(safe, "i");
      filter.$or = [{ fullName: re }, { email: re }, { phone: re }];
    }
    const users = await User.find(filter)
      .select("fullName email phone country role isActive loginAttempts lockedUntil createdAt")
      .sort({ createdAt: -1 })
      .limit(Math.min(parseInt(limit, 10) || 50, 200));
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

router.get("/users/:userId", async (req, res, next) => {
  try {
    const User = require("../models/User");
    const user = await User.findById(req.params.userId).select(
      "fullName email phone country role isActive loginAttempts lockedUntil createdAt updatedAt"
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
