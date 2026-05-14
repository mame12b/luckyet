const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const User = require("../models/User");

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

module.exports = router;