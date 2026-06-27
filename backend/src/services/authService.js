// Regras de negócio de autenticação e conta de usuário.
const crypto = require("crypto");
const userModel = require("../models/userModel");
const { query } = require("../database/pool");
const { hashPassword, comparePassword } = require("../utils/password");
const { signAccessToken, signResetToken, verifyResetToken } = require("../utils/jwt");
const { sendPasswordReset } = require("./emailService");
const ApiError = require("../utils/ApiError");
const config = require("../config");

function buildAuthResponse(user) {
  const token = signAccessToken({
    sub: user.id,
    email: user.email,
    name: user.name,
  });
  return {
    token,
    user: { id: user.id, name: user.name, email: user.email },
  };
}

async function register({ nome, email, senha }) {
  const normalizedEmail = email.toLowerCase().trim();
  const existing = await userModel.findByEmail(normalizedEmail);
  if (existing) throw ApiError.conflict("Este e-mail já está cadastrado");

  const passwordHash = await hashPassword(senha);
  const user = await userModel.create({
    name: nome.trim(),
    email: normalizedEmail,
    password: passwordHash,
  });
  return buildAuthResponse(user);
}

async function login({ email, senha }) {
  const user = await userModel.findByEmail(email.toLowerCase().trim());
  if (!user) throw ApiError.unauthorized("E-mail ou senha inválidos");

  const ok = await comparePassword(senha, user.password);
  if (!ok) throw ApiError.unauthorized("E-mail ou senha inválidos");

  return buildAuthResponse(user);
}

async function getProfile(userId) {
  const user = await userModel.findById(userId);
  if (!user) throw ApiError.notFound("Usuário não encontrado");
  return user;
}

async function updateName(userId, nome) {
  const user = await userModel.updateName(userId, nome.trim());
  if (!user) throw ApiError.notFound("Usuário não encontrado");
  return user;
}

async function changePassword(userId, { senhaAtual, novaSenha }) {
  const user = await userModel.findByIdWithPassword(userId);
  if (!user) throw ApiError.notFound("Usuário não encontrado");

  const ok = await comparePassword(senhaAtual, user.password);
  if (!ok) throw ApiError.badRequest("Senha atual incorreta");

  const passwordHash = await hashPassword(novaSenha);
  await userModel.updatePassword(userId, passwordHash);
}

// Gera token de recuperação, persiste o hash e envia e-mail.
async function forgotPassword(email) {
  const user = await userModel.findByEmail(email.toLowerCase().trim());
  // Resposta sempre genérica para não revelar se o e-mail existe.
  if (!user) return { sent: true };

  const resetToken = signResetToken({ sub: user.id, email: user.email });
  const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min

  await query(
    `INSERT INTO password_resets (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, tokenHash, expiresAt]
  );

  const resetUrl = `${config.frontendUrl}/html/esqueci-senha.html?token=${resetToken}`;
  await sendPasswordReset(user.email, user.name, resetUrl);
  return { sent: true };
}

async function resetPassword({ token, novaSenha }) {
  let payload;
  try {
    payload = verifyResetToken(token);
  } catch {
    throw ApiError.badRequest("Token inválido ou expirado");
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const { rows } = await query(
    `SELECT * FROM password_resets
     WHERE user_id = $1 AND token_hash = $2 AND used = FALSE AND expires_at > NOW()
     ORDER BY id DESC LIMIT 1`,
    [payload.sub, tokenHash]
  );
  const record = rows[0];
  if (!record) throw ApiError.badRequest("Token inválido, expirado ou já utilizado");

  const passwordHash = await hashPassword(novaSenha);
  await userModel.updatePassword(payload.sub, passwordHash);
  await query("UPDATE password_resets SET used = TRUE WHERE id = $1", [record.id]);
}

module.exports = {
  register,
  login,
  getProfile,
  updateName,
  changePassword,
  forgotPassword,
  resetPassword,
};
