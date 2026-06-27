// Controllers do dashboard.
const dashboardService = require("../services/dashboardService");
const asyncHandler = require("../utils/asyncHandler");

exports.today = asyncHandler(async (req, res) => {
  const tasks = await dashboardService.today(req.user.id);
  res.json({ success: true, tasks });
});

exports.tomorrow = asyncHandler(async (req, res) => {
  const tasks = await dashboardService.tomorrow(req.user.id);
  res.json({ success: true, tasks });
});

exports.upcoming = asyncHandler(async (req, res) => {
  const tasks = await dashboardService.upcoming(req.user.id);
  res.json({ success: true, tasks });
});

exports.statistics = asyncHandler(async (req, res) => {
  const stats = await dashboardService.statistics(req.user.id);
  res.json({ success: true, statistics: stats });
});
