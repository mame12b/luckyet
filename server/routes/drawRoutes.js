const router = require("express").Router();
const ctrl = require("../controllers/drawController");

// Public
router.get("/", ctrl.listActive);
router.get("/past", ctrl.listPastDraws);
router.get("/slug/:slug", ctrl.getBySlug);

module.exports = router;