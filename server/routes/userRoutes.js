const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const User = require("../models/User");
const Ticket = require("../models/Ticket");

// Get own profile
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user: user.toJSON() });
  } catch (err) {
    next(err);
  }
});

// Get my tickets (across all draws)
router.get("/me/tickets", requireAuth, async (req, res, next) => {
  try {
    const tickets = await Ticket.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .populate("drawId", "title prizeName slug status endDate drawDate")
      .populate("paymentId", "referenceCode totalETB");
    res.json({ tickets, count: tickets.length });
  } catch (err) {
    next(err);
  }
});

module.exports = router;