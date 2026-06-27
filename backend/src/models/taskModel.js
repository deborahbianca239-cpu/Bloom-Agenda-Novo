// Acesso a dados da tabela `tasks`. Todas as queries são escopadas por user_id.
const { query } = require("../database/pool");

const COLUMNS = `id, user_id, title, description,
  to_char(task_date, 'YYYY-MM-DD') AS task_date,
  to_char(task_time, 'HH24:MI')   AS task_time,
  priority, category, completed, created_at, updated_at`;

// Lista com filtros opcionais. `filters` pode conter:
// { search, priority, category, date, completed }
async function findAll(userId, filters = {}) {
  const where = ["user_id = $1"];
  const params = [userId];
  let i = 2;

  if (filters.search) {
    where.push(
      `(title ILIKE $${i} OR description ILIKE $${i} OR category ILIKE $${i})`
    );
    params.push(`%${filters.search}%`);
    i++;
  }
  if (filters.priority) {
    where.push(`priority = $${i++}`);
    params.push(filters.priority);
  }
  if (filters.category) {
    where.push(`category = $${i++}`);
    params.push(filters.category);
  }
  if (filters.date) {
    where.push(`task_date = $${i++}`);
    params.push(filters.date);
  }
  if (typeof filters.completed === "boolean") {
    where.push(`completed = $${i++}`);
    params.push(filters.completed);
  }

  const { rows } = await query(
    `SELECT ${COLUMNS} FROM tasks
     WHERE ${where.join(" AND ")}
     ORDER BY task_date ASC, task_time ASC NULLS LAST, id ASC`,
    params
  );
  return rows;
}

async function findById(userId, id) {
  const { rows } = await query(
    `SELECT ${COLUMNS} FROM tasks WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return rows[0] || null;
}

async function create(userId, data) {
  const { rows } = await query(
    `INSERT INTO tasks
       (user_id, title, description, task_date, task_time, priority, category)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${COLUMNS}`,
    [
      userId,
      data.title,
      data.description || null,
      data.task_date,
      data.task_time || null,
      data.priority,
      data.category,
    ]
  );
  return rows[0];
}

async function update(userId, id, data) {
  const { rows } = await query(
    `UPDATE tasks SET
       title = $1, description = $2, task_date = $3, task_time = $4,
       priority = $5, category = $6, completed = $7
     WHERE id = $8 AND user_id = $9
     RETURNING ${COLUMNS}`,
    [
      data.title,
      data.description || null,
      data.task_date,
      data.task_time || null,
      data.priority,
      data.category,
      data.completed,
      id,
      userId,
    ]
  );
  return rows[0] || null;
}

async function setCompleted(userId, id, completed) {
  const { rows } = await query(
    `UPDATE tasks SET completed = $1
     WHERE id = $2 AND user_id = $3
     RETURNING ${COLUMNS}`,
    [completed, id, userId]
  );
  return rows[0] || null;
}

async function remove(userId, id) {
  const { rowCount } = await query(
    "DELETE FROM tasks WHERE id = $1 AND user_id = $2",
    [id, userId]
  );
  return rowCount > 0;
}

// Tarefas por data exata (usado pelo dashboard "Hoje" e "Amanhã").
async function findByDate(userId, dateStr) {
  const { rows } = await query(
    `SELECT ${COLUMNS} FROM tasks
     WHERE user_id = $1 AND task_date = $2
     ORDER BY task_time ASC NULLS LAST, id ASC`,
    [userId, dateStr]
  );
  return rows;
}

// Tarefas com data estritamente maior que `dateStr` (próximos dias).
async function findAfter(userId, dateStr) {
  const { rows } = await query(
    `SELECT ${COLUMNS} FROM tasks
     WHERE user_id = $1 AND task_date > $2
     ORDER BY task_date ASC, task_time ASC NULLS LAST, id ASC`,
    [userId, dateStr]
  );
  return rows;
}

// Agregados para o card de estatísticas.
async function statistics(userId) {
  const { rows } = await query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE completed)::int AS completed,
       COUNT(*) FILTER (WHERE NOT completed)::int AS pending,
       COUNT(*) FILTER (WHERE priority = 'HIGH')::int AS high,
       COUNT(*) FILTER (WHERE priority = 'MEDIUM')::int AS medium,
       COUNT(*) FILTER (WHERE priority = 'LOW')::int AS low
     FROM tasks WHERE user_id = $1`,
    [userId]
  );
  return rows[0];
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  setCompleted,
  remove,
  findByDate,
  findAfter,
  statistics,
};
