const express = require("express");
const ctrl = require("../controllers/dashboardController");
const authenticate = require("../middlewares/auth");

const router = express.Router();

router.use(authenticate);

router.get("/today", ctrl.today);
router.get("/tomorrow", ctrl.tomorrow);
router.get("/upcoming", ctrl.upcoming);
router.get("/statistics", ctrl.statistics);

module.exports = router;
