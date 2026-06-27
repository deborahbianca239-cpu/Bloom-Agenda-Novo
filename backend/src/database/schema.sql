-- =====================================================================
-- Bloom Agenda — Script de criação do banco de dados (PostgreSQL)
-- =====================================================================
-- Para criar o banco do zero (via psql):
--   CREATE DATABASE bloom_agenda;
--   \c bloom_agenda
--   \i schema.sql
-- =====================================================================

-- Extensão para gerar UUIDs (opcional; usamos SERIAL por padrão).
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tipo enumerado de prioridade.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_priority') THEN
    CREATE TYPE task_priority AS ENUM ('HIGH', 'MEDIUM', 'LOW');
  END IF;
END$$;

-- ---------------------------------------------------------------------
-- Tabela: users
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  email       VARCHAR(160) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ---------------------------------------------------------------------
-- Tabela: tasks
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title       VARCHAR(200) NOT NULL,
  description TEXT,
  task_date   DATE NOT NULL,
  task_time   TIME,
  priority    task_priority NOT NULL DEFAULT 'MEDIUM',
  category    VARCHAR(80) NOT NULL DEFAULT 'Outros',
  completed   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id    ON tasks (user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_task_date  ON tasks (task_date);
CREATE INDEX IF NOT EXISTS idx_tasks_completed  ON tasks (completed);
CREATE INDEX IF NOT EXISTS idx_tasks_priority   ON tasks (priority);
CREATE INDEX IF NOT EXISTS idx_tasks_user_date  ON tasks (user_id, task_date);

-- ---------------------------------------------------------------------
-- Tabela: password_resets  (tokens de recuperação de senha)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS password_resets (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets (user_id);

-- ---------------------------------------------------------------------
-- Trigger: atualiza automaticamente updated_at
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated ON users;
CREATE TRIGGER trg_users_updated
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_tasks_updated ON tasks;
CREATE TRIGGER trg_tasks_updated
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
