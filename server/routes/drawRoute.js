const router = require("express").Router();
const Draw = require("../models/Draw");

// Public: list active draws
router.get("/", async (req, res, next) => {
  try {
    const draws = await Draw.find({ status: { $in: ["active", "sold_out"] } })
      .sort({ endDate: 1 })
      .select("-quantumProof"); // hide proof until drawn
    res.json({ draws });
  } catch (err) {
    next(err);
  }
});

// Public: get one draw by slug
router.get("/:slug", async (req, res, next) => {
  try {
    const draw = await Draw.findOne({ slug: req.params.slug });
    if (!draw) return res.status(404).json({ message: "Draw not found" });
    res.json({ draw });
  } catch (err) {
    next(err);
  }
});

module.exports = router;