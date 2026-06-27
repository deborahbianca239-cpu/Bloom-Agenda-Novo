// Middleware de autenticação: valida o JWT do header Authorization.
const { verifyAccessToken } = require("../utils/jwt");
const ApiError = require("../utils/ApiError");

module.exports = function authenticate(req, _res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(ApiError.unauthorized("Token não fornecido"));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email, name: payload.name };
    next();
  } catch (err) {
    next(ApiError.unauthorized("Token inválido ou expirado"));
  }
};
