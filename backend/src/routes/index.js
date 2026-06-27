// Agrega todas as rotas sob /api.
const express = require("express");
const authRoutes = require("./authRoutes");
const taskRoutes = require("./taskRoutes");
const dashboardRoutes = require("./dashboardRoutes");

const router = express.Router();

router.get("/health", (_req, res) =>
  res.json({ success: true, status: "ok", service: "bloom-agenda-api" })
);

router.use("/auth", authRoutes);
router.use("/tasks", taskRoutes);
router.use("/dashboard", dashboardRoutes);

module.exports = router;
