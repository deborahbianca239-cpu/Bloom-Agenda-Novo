# 🌸 Bloom Agenda - Backend

<p align="center">
  API REST desenvolvida para a <strong>Bloom Agenda</strong>, responsável por autenticação de usuários, gerenciamento de tarefas e dashboard de produtividade.
</p>

<p align="center">

![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.x-black?logo=express)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-orange)
![License](https://img.shields.io/badge/License-MIT-green)

</p>

---

# 📖 Sobre

O **Bloom Agenda Backend** fornece toda a API da aplicação, incluindo:

- 🔐 Autenticação com JWT
- 👤 Cadastro e gerenciamento de usuários
- ✅ CRUD completo de tarefas
- 📊 Dashboard com estatísticas
- 🔑 Recuperação de senha por e-mail
- 🛡️ Validação e segurança das requisições

---

# 🚀 Tecnologias

| Tecnologia | Função |
|------------|--------|
| Node.js | Ambiente de execução |
| Express.js | Framework da API |
| PostgreSQL | Banco de dados |
| JWT | Autenticação |
| bcrypt | Hash de senhas |
| Nodemailer | Recuperação de senha |
| express-validator | Validação |
| dotenv | Variáveis de ambiente |
| CORS | Compartilhamento de recursos |

---

# 📂 Estrutura do Projeto

```text
backend/
│
├── src/
│   ├── config/
│   ├── controllers/
│   ├── database/
│   │   ├── schema.sql
│   │   ├── init.js
│   │   └── pool.js
│   ├── middlewares/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── app.js
│   └── server.js
│
├── uploads/
├── .env.example
├── package.json
└── README.md
```

---

# ⚙️ Instalação

## 1️⃣ Clone o projeto

```bash
git clone https://github.com/seu-usuario/bloom-agenda.git
```

```bash
cd bloom-agenda/backend
```

---

## 2️⃣ Instale as dependências

```bash
npm install
```

---

## 3️⃣ Configure o ambiente

Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

Configure as variáveis necessárias:

```env
PORT=3006

DB_HOST=localhost
DB_PORT=5432
DB_NAME=bloom_agenda
DB_USER=postgres
DB_PASSWORD=sua_senha

JWT_SECRET=uma_chave_super_secreta

EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=
EMAIL_PASS=
```

---

## 4️⃣ Criar o banco

```sql
CREATE DATABASE bloom_agenda;
```

---

## 5️⃣ Inicializar banco

```bash
npm run db:init
```

ou execute manualmente:

```
src/database/schema.sql
```

---

## 6️⃣ Executar

Modo desenvolvimento

```bash
npm run dev
```

Modo produção

```bash
npm start
```

Servidor:

```
http://localhost:3006
```

Health Check:

```
GET /api/health
```

---

# 🐳 Docker

Na raiz do projeto:

```bash
docker compose up --build -d
```

Serviços disponíveis

| Serviço | URL |
|----------|-----|
| Frontend | http://localhost:8080/html/index.html |
| Backend | http://localhost:3006/api/health |
| PostgreSQL | localhost:5432 |

Parar containers

```bash
docker compose down
```

Remover também o volume do banco

```bash
docker compose down -v
```

---

# 🔐 Autenticação

Todas as rotas protegidas utilizam JWT.

Header obrigatório:

```http
Authorization: Bearer <token>
```

Cada usuário possui acesso somente às próprias informações e tarefas.

---

# 📌 Endpoints

## 🔑 Autenticação

Base URL

```
/api/auth
```

| Método | Endpoint | Protegido | Descrição |
|---------|----------|-----------|-----------|
| POST | /register | ❌ | Cadastro |
| POST | /login | ❌ | Login |
| POST | /logout | ❌ | Logout |
| POST | /forgot-password | ❌ | Recuperação de senha |
| POST | /reset-password | ❌ | Redefinição de senha |
| PUT | /change-password | ✅ | Alterar senha |
| GET | /profile | ✅ | Perfil do usuário |

---

## ✅ Tarefas

Base URL

```
/api/tasks
```

| Método | Endpoint | Descrição |
|---------|----------|-----------|
| GET | / | Listar tarefas |
| GET | /:id | Buscar tarefa |
| POST | / | Criar tarefa |
| PUT | /:id | Atualizar tarefa |
| PATCH | /:id/complete | Concluir |
| PATCH | /:id/uncomplete | Reabrir |
| DELETE | /:id | Excluir |

### Exemplo

```json
{
  "title": "Reunião de equipe",
  "description": "Sprint Review",
  "task_date": "2026-06-26",
  "task_time": "14:30",
  "priority": "HIGH",
  "category": "Trabalho"
}
```

Prioridades aceitas

```
HIGH
MEDIUM
LOW
```

Filtros disponíveis

```
search
priority
category
date
completed
status
```

---

## 📊 Dashboard

Base URL

```
/api/dashboard
```

| Método | Endpoint | Descrição |
|---------|----------|-----------|
| GET | /today | Tarefas de hoje |
| GET | /tomorrow | Tarefas de amanhã |
| GET | /upcoming | Próximas tarefas |
| GET | /statistics | Estatísticas gerais |

---

# 🔒 Segurança

✔ Senhas criptografadas utilizando **bcrypt**

✔ Autenticação via **JWT**

✔ Validação de dados com **express-validator**

✔ Tokens de recuperação protegidos com **SHA-256**

✔ Tokens expiram em **30 minutos**

✔ Isolamento de dados por usuário (`user_id`)

---

# 📬 Health Check

```
GET /api/health
```

Resposta

```json
{
  "status": "OK"
}
```

---

# 👨‍💻 Desenvolvido por

**Henrique Cardoso Silva**

Projeto desenvolvido para a aplicação **Bloom Agenda**.