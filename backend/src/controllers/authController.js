// Controllers de autenticação: orquestram req/res e delegam ao service.
const authService = require("../services/authService");
const asyncHandler = require("../utils/asyncHandler");

exports.register = asyncHandler(async (req, res) => {
  const data = await authService.register(req.body);
  res.status(201).json({ success: true, message: "Cadastro realizado com sucesso!", ...data });
});

exports.login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body);
  res.json({ success: true, message: "Login realizado com sucesso!", ...data });
});

// Logout: stateless. O cliente apenas descarta o token.
exports.logout = asyncHandler(async (_req, res) => {
  res.json({ success: true, message: "Logout realizado. Remova o token no cliente." });
});

exports.profile = asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user.id);
  res.json({ success: true, user });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const user = await authService.updateName(req.user.id, req.body.nome);
  res.json({ success: true, message: "Nome atualizado!", user });
});

exports.changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user.id, req.body);
  res.json({ success: true, message: "Senha alterada com sucesso!" });
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  res.json({
    success: true,
    message: "Se o e-mail existir, enviaremos instruções de recuperação.",
  });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body);
  res.json({ success: true, message: "Senha redefinida com sucesso!" });
});
