// Geração e verificação de tokens JWT (acesso e redefinição de senha).
const jwt = require("jsonwebtoken");
const config = require("../config");

const signAccessToken = (payload) =>
  jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

const verifyAccessToken = (token) => jwt.verify(token, config.jwt.secret);

const signResetToken = (payload) =>
  jwt.sign(payload, config.jwt.resetSecret, {
    expiresIn: config.jwt.resetExpiresIn,
  });

const verifyResetToken = (token) => jwt.verify(token, config.jwt.resetSecret);

module.exports = {
  signAccessToken,
  verifyAccessToken,
  signResetToken,
  verifyResetToken,
};
