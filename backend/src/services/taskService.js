// Regras de negócio de tarefas. Todas escopadas pelo usuário autenticado.
const taskModel = require("../models/taskModel");
const ApiError = require("../utils/ApiError");

function parseFilters(q = {}) {
  const filters = {};
  if (q.search) filters.search = String(q.search).trim();
  if (q.priority) filters.priority = String(q.priority).toUpperCase();
  if (q.category) filters.category = String(q.category).trim();
  if (q.date) filters.date = String(q.date).trim();
  if (q.completed === "true") filters.completed = true;
  if (q.completed === "false") filters.completed = false;
  // alias amigável: status=pending|done
  if (q.status === "pending") filters.completed = false;
  if (q.status === "done") filters.completed = true;
  return filters;
}

// Garante prioridade/categoria válidas antes de persistir.
function normalize(data) {
  const priority = String(data.priority || "MEDIUM").toUpperCase();
  return {
    ...data,
    priority: ["HIGH", "MEDIUM", "LOW"].includes(priority) ? priority : "MEDIUM",
    category: (data.category && String(data.category).trim()) || "Outros",
  };
}

const list = (userId, query) => taskModel.findAll(userId, parseFilters(query));

async function getById(userId, id) {
  const task = await taskModel.findById(userId, id);
  if (!task) throw ApiError.notFound("Tarefa não encontrada");
  return task;
}

const create = (userId, data) => taskModel.create(userId, normalize(data));

async function update(userId, id, data) {
  const existing = await taskModel.findById(userId, id);
  if (!existing) throw ApiError.notFound("Tarefa não encontrada");
  // Preserva `completed` se não vier no payload.
  const completed =
    typeof data.completed === "boolean" ? data.completed : existing.completed;
  return taskModel.update(userId, id, { ...normalize(data), completed });
}

async function setCompleted(userId, id, completed) {
  const task = await taskModel.setCompleted(userId, id, completed);
  if (!task) throw ApiError.notFound("Tarefa não encontrada");
  return task;
}

async function remove(userId, id) {
  const ok = await taskModel.remove(userId, id);
  if (!ok) throw ApiError.notFound("Tarefa não encontrada");
}

module.exports = { list, getById, create, update, setCompleted, remove };
