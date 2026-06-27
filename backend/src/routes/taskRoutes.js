const express = require("express");
const ctrl = require("../controllers/taskController");
const authenticate = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const { taskRules } = require("../middlewares/validators");

const router = express.Router();

// Todas as rotas de tarefas exigem autenticação.
router.use(authenticate);

router.get("/", ctrl.list);
router.get("/:id", ctrl.getById);
router.post("/", taskRules, validate, ctrl.create);
router.put("/:id", taskRules, validate, ctrl.update);
router.patch("/:id/complete", ctrl.complete);
router.patch("/:id/uncomplete", ctrl.uncomplete);
router.delete("/:id", ctrl.remove);

module.exports = router;
