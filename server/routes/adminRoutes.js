
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
const authController = require("../controllers/authController");
const { adminResetPinSchema } = require("../validators/authValidators");
const analyticsController = require("../controllers/analyticsController");

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

// Analytics endpoints
router.get("/analytics/kpis", analyticsController.kpis);
router.get("/analytics/daily-sales", analyticsController.dailySales);
router.get("/analytics/draws", analyticsController.drawBreakdown);
router.get("/analytics/breakdowns", analyticsController.breakdowns);
router.get("/analytics/promoters", analyticsController.promoters);


// Password reset request management
router.get(
  "/password-resets",
  requireRole("admin", "super_admin"),
  authController.adminListResetRequests
);
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

// List users (search support)
router.get("/users", requireRole("admin", "super_admin"), async (req, res, next) => {
  try {
    const User = require("../models/User");
    const { search, role, limit = 50 } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (search) {
      const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { fullName: re },
        { email: re },
        { phone: re },
      ];
    }
    const users = await User.find(filter)
      .select("fullName email phone country role isActive loginAttempts lockedUntil createdAt")
      .sort({ createdAt: -1 })
      .limit(Math.min(parseInt(limit) || 50, 200));
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

// Get one user
router.get("/users/:userId", requireRole("admin", "super_admin"), async (req, res, next) => {
  try {
    const User = require("../models/User");
    const user = await User.findById(req.params.userId)
      .select("fullName email phone country role isActive loginAttempts lockedUntil createdAt updatedAt");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
