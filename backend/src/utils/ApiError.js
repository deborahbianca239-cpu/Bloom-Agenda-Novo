// Erro operacional com status HTTP. Capturado pelo errorHandler central.
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg = "Requisição inválida", details) {
    return new ApiError(400, msg, details);
  }
  static unauthorized(msg = "Não autorizado") {
    return new ApiError(401, msg);
  }
  static forbidden(msg = "Acesso negado") {
    return new ApiError(403, msg);
  }
  static notFound(msg = "Recurso não encontrado") {
    return new ApiError(404, msg);
  }
  static conflict(msg = "Conflito de dados") {
    return new ApiError(409, msg);
  }
}

module.exports = ApiError;
