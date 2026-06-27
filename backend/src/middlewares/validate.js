// Coleta os erros do express-validator e devolve 400 padronizado.
const { validationResult } = require("express-validator");
const ApiError = require("../utils/ApiError");

module.exports = function validate(req, _res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const details = result.array().map((e) => ({
    field: e.path,
    message: e.msg,
  }));
  next(ApiError.badRequest("Dados inválidos", details));
};
