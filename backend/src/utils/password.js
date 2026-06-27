// Funções de hash e comparação de senha usando bcryptjs.
// bcryptjs é JS puro (sem binário nativo), o que evita problemas em
// ambientes serverless (Vercel) e mantém compatibilidade com o Docker.
const bcrypt = require("bcryptjs");
const config = require("../config");

const hashPassword = (plain) => bcrypt.hash(plain, config.bcryptRounds);

const comparePassword = (plain, hash) => bcrypt.compare(plain, hash);

module.exports = { hashPassword, comparePassword };
