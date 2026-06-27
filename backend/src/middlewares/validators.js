// Regras de validação (express-validator) reutilizadas pelas rotas.
const { body } = require("express-validator");

const PRIORITIES = ["HIGH", "MEDIUM", "LOW"];

const registerRules = [
  body("nome").trim().notEmpty().withMessage("Nome é obrigatório").bail()
    .isLength({ max: 120 }).withMessage("Nome muito longo"),
  body("email").trim().notEmpty().withMessage("E-mail é obrigatório").bail()
    .isEmail().withMessage("E-mail inválido"),
  body("senha").isLength({ min: 8 }).withMessage("A senha deve ter no mínimo 8 caracteres"),
];

const loginRules = [
  body("email").trim().notEmpty().withMessage("E-mail é obrigatório").bail()
    .isEmail().withMessage("E-mail inválido"),
  body("senha").notEmpty().withMessage("Senha é obrigatória"),
];

const forgotRules = [
  body("email").trim().notEmpty().withMessage("E-mail é obrigatório").bail()
    .isEmail().withMessage("E-mail inválido"),
];

const resetRules = [
  body("token").notEmpty().withMessage("Token é obrigatório"),
  body("novaSenha").isLength({ min: 8 }).withMessage("A nova senha deve ter no mínimo 8 caracteres"),
];

const updateNameRules = [
  body("nome").trim().notEmpty().withMessage("Nome é obrigatório").bail()
    .isLength({ max: 120 }).withMessage("Nome muito longo"),
];

const changePasswordRules = [
  body("senhaAtual").notEmpty().withMessage("Senha atual é obrigatória"),
  body("novaSenha").isLength({ min: 8 }).withMessage("A nova senha deve ter no mínimo 8 caracteres"),
];

const taskRules = [
  body("title").trim().notEmpty().withMessage("Título é obrigatório").bail()
    .isLength({ max: 200 }).withMessage("Título muito longo"),
  body("description").optional({ nullable: true }).isLength({ max: 2000 })
    .withMessage("Descrição muito longa"),
  body("task_date").notEmpty().withMessage("Data é obrigatória").bail()
    .isISO8601().withMessage("Data inválida (use YYYY-MM-DD)"),
  body("task_time").optional({ nullable: true, checkFalsy: true })
    .matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage("Horário inválido (use HH:MM)"),
  body("priority").optional().toUpperCase().isIn(PRIORITIES)
    .withMessage("Prioridade inválida (HIGH, MEDIUM ou LOW)"),
  body("category").optional({ nullable: true }).trim().isLength({ max: 80 })
    .withMessage("Categoria muito longa"),
  body("completed").optional().isBoolean().withMessage("completed deve ser booleano"),
];

module.exports = {
  registerRules,
  loginRules,
  forgotRules,
  resetRules,
  updateNameRules,
  changePasswordRules,
  taskRules,
};
