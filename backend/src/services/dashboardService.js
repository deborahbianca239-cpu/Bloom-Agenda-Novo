// Agregações do dashboard: hoje, amanhã, próximos dias e estatísticas.
const taskModel = require("../models/taskModel");

// Datas no fuso do servidor, formato YYYY-MM-DD.
function dateKey(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const today = (userId) => taskModel.findByDate(userId, dateKey(0));
const tomorrow = (userId) => taskModel.findByDate(userId, dateKey(1));
const upcoming = (userId) => taskModel.findAfter(userId, dateKey(1));
const statistics = (userId) => taskModel.statistics(userId);

module.exports = { today, tomorrow, upcoming, statistics };
