// Carrega variáveis de ambiente e centraliza a configuração da aplicação.
require("dotenv").config();

const config = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT, 10) || 3006,

  // Origens permitidas para CORS (separadas por vírgula no .env)
  corsOrigins: (process.env.CORS_ORIGIN || "*")
    .split(",")
    .map((o) => o.trim()),

  db: {
    // Se DATABASE_URL existir (ex.: Supabase), ela tem prioridade.
    connectionString: process.env.DATABASE_URL || null,
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "bloom_agenda",
    // SSL é obrigatório no Supabase/serviços de nuvem. Defina DB_SSL=true.
    ssl:
      process.env.DB_SSL === "true" ||
      (process.env.DATABASE_URL || "").includes("supabase"),
  },

  jwt: {
    secret: process.env.JWT_SECRET || "bloom-dev-secret-change-me",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    // Token de redefinição de senha (curta duração)
    resetExpiresIn: process.env.JWT_RESET_EXPIRES_IN || "30m",
    resetSecret: process.env.JWT_RESET_SECRET || "bloom-reset-secret-change-me",
  },

  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 10,

  mail: {
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT, 10) || 587,
    secure: process.env.MAIL_SECURE === "true",
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
    from: process.env.MAIL_FROM || "Bloom Agenda <no-reply@bloom.agenda>",
  },

  // URL do frontend usada nos links de e-mail de recuperação
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5500",
};

module.exports = config;
