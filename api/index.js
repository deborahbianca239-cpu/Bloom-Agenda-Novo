// Entry serverless da Vercel.
// Reaproveita a mesma aplicação Express usada no Docker/local.
// O Express é, ele próprio, um handler (req, res), então delegamos direto.
const app = require("../backend/src/app");

module.exports = (req, res) => app(req, res);
