const router = require("express").Router();
const drawCtrl = require("../controllers/drawController");
const winnerCtrl = require("../controllers/winnerController");

// Public
router.get("/", drawCtrl.listActive);
router.get("/results", winnerCtrl.listResults);
router.get("/results/:slug", winnerCtrl.getProof);
router.get("/past", drawCtrl.listPastDraws);
router.get("/slug/:slug", drawCtrl.getBySlug);
router.get("/slug/:slug/live-state", winnerCtrl.getLiveState);

module.exports = router;