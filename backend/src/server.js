// Ponto de entrada: sobe o servidor HTTP e testa a conexão com o banco.
const app = require("./app");
const config = require("./config");
const { pool } = require("./database/pool");

async function start() {
  try {
    await pool.query("SELECT 1");
    console.log(" ✅ Banco de dados PostgreSQL conectado!");
  } catch (err) {
    console.error(" ❌ Falha ao conectar ao PostgreSQL:", err.message);
    console.error("    Verifique o .env e se o banco está rodando.");
  }

  app.listen(config.port, () => {
    console.log("\n ===============================");
    console.log(` 🌸 Bloom Agenda API`);
    console.log(` Servidor: http://localhost:${config.port}`);
    console.log(` Ambiente: ${config.env}`);
    console.log(" ===============================\n");
  });
}

start();

// Encerramento gracioso
process.on("SIGINT", async () => {
  await pool.end();
  process.exit(0);
});
