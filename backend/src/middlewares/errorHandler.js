// Tratamento central de erros + handler 404.
const ApiError = require("../utils/ApiError");
const config = require("../config");

function notFound(_req, _res, next) {
  next(ApiError.notFound("Rota não encontrada"));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  let { statusCode = 500, message } = err;

  // Violação de UNIQUE no PostgreSQL (ex.: e-mail duplicado)
  if (err.code === "23505") {
    statusCode = 409;
    message = "Registro já existente";
  }

  if (statusCode === 500) {
    console.error("[ERRO]", err);
    if (config.env === "production") message = "Erro interno do servidor";
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(err.details ? { errors: err.details } : {}),
  });
}

module.exports = { notFound, errorHandler };
