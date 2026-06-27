// Pool de conexões PostgreSQL compartilhado por toda a aplicação.
const { Pool } = require("pg");
const config = require("../config");

// Em nuvem (Supabase, Render, etc.) o certificado é gerenciado pelo provedor,
// então usamos ssl com rejectUnauthorized:false.
const ssl = config.db.ssl ? { rejectUnauthorized: false } : false;

const pool = new Pool(
  config.db.connectionString
    ? { connectionString: config.db.connectionString, ssl, max: 10, idleTimeoutMillis: 30000 }
    : {
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
        database: config.db.database,
        ssl,
        max: 10,
        idleTimeoutMillis: 30000,
      }
);

pool.on("error", (err) => {
  console.error("[DB] Erro inesperado no pool de conexões:", err.message);
});

// Helper para executar queries parametrizadas.
const query = (text, params) => pool.query(text, params);

module.exports = { pool, query };
