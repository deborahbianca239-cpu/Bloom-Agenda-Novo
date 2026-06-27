// Acesso a dados da tabela `users`. Apenas SQL — sem regra de negócio.
const { query } = require("../database/pool");

const SAFE_COLUMNS = "id, name, email, created_at, updated_at";

async function create({ name, email, password }) {
  const { rows } = await query(
    `INSERT INTO users (name, email, password)
     VALUES ($1, $2, $3)
     RETURNING ${SAFE_COLUMNS}`,
    [name, email, password]
  );
  return rows[0];
}

async function findByEmail(email) {
  // Inclui a senha — usado apenas internamente na autenticação.
  const { rows } = await query("SELECT * FROM users WHERE email = $1", [email]);
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await query(
    `SELECT ${SAFE_COLUMNS} FROM users WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function findByIdWithPassword(id) {
  const { rows } = await query("SELECT * FROM users WHERE id = $1", [id]);
  return rows[0] || null;
}

async function updatePassword(id, passwordHash) {
  await query("UPDATE users SET password = $1 WHERE id = $2", [
    passwordHash,
    id,
  ]);
}

async function updateName(id, name) {
  const { rows } = await query(
    `UPDATE users SET name = $1 WHERE id = $2
     RETURNING ${SAFE_COLUMNS}`,
    [name, id]
  );
  return rows[0] || null;
}

module.exports = {
  create,
  findByEmail,
  findById,
  findByIdWithPassword,
  updatePassword,
  updateName,
};
