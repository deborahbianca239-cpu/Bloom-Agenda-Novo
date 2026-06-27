// Executa o schema.sql para criar tabelas, índices e triggers automaticamente.
// Uso: npm run db:init
const fs = require("fs");
const path = require("path");
const { pool } = require("./pool");

async function init() {
  const sqlPath = path.join(__dirname, "schema.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");

  console.log("[DB] Criando estrutura do banco de dados...");
  try {
    await pool.query(sql);
    console.log("[DB] ✅ Estrutura criada/atualizada com sucesso.");
  } catch (err) {
    console.error("[DB] ❌ Erro ao criar estrutura:", err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

init();
