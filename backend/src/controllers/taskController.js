// Controllers de tarefas. req.user.id vem do middleware authenticate.
const taskService = require("../services/taskService");
const asyncHandler = require("../utils/asyncHandler");

exports.list = asyncHandler(async (req, res) => {
  const tasks = await taskService.list(req.user.id, req.query);
  res.json({ success: true, tasks });
});

exports.getById = asyncHandler(async (req, res) => {
  const task = await taskService.getById(req.user.id, req.params.id);
  res.json({ success: true, task });
});

exports.create = asyncHandler(async (req, res) => {
  const task = await taskService.create(req.user.id, req.body);
  res.status(201).json({ success: true, message: "Tarefa criada!", task });
});

exports.update = asyncHandler(async (req, res) => {
  const task = await taskService.update(req.user.id, req.params.id, req.body);
  res.json({ success: true, message: "Tarefa atualizada!", task });
});

exports.complete = asyncHandler(async (req, res) => {
  const task = await taskService.setCompleted(req.user.id, req.params.id, true);
  res.json({ success: true, message: "Tarefa concluída!", task });
});

exports.uncomplete = asyncHandler(async (req, res) => {
  const task = await taskService.setCompleted(req.user.id, req.params.id, false);
  res.json({ success: true, message: "Tarefa reaberta!", task });
});

exports.remove = asyncHandler(async (req, res) => {
  await taskService.remove(req.user.id, req.params.id);
  res.json({ success: true, message: "Tarefa excluída!" });
});
