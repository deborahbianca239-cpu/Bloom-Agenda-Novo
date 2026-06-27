# 🚀 Deploy na Vercel — Bloom Agenda

O projeto está pronto para subir como **um único projeto** na Vercel:
frontend estático + API Express rodando como **função serverless** em `/api`.

```
Bloom-Agenda/            ← raiz do projeto na Vercel
├── api/index.js         ← função serverless (carrega o Express de backend/src)
├── backend/src/         ← código da API + serve o frontend (express.static)
├── html/ css/ js/       ← frontend (empacotado na função via includeFiles)
├── package.json         ← dependências instaladas pela Vercel
└── vercel.json          ← roteia TODAS as requisições para a função Express
```

> O Express serve tanto a API (`/api/*`) quanto o frontend (`/`, `/html`,
> `/css`, `/js`). Os arquivos estáticos são embutidos na função pelo
> `includeFiles` do `vercel.json`. Isso evita os 404 de roteamento que
> acontecem quando se tenta separar estático e função manualmente.

## 1. Banco de dados (Supabase)

Em serverless **use o pooler** do Supabase (não a conexão direta na porta 5432).

1. Painel Supabase → **Project Settings → Database → Connection string → Connection pooling**.
2. Copie a URI (porta **6543**) e troque `[YOUR-PASSWORD]` pela senha do banco.

Crie as tabelas **uma vez** (a Vercel não roda `db:init` no boot):
- Painel Supabase → **SQL Editor** → cole o conteúdo de
  [`backend/src/database/schema.sql`](backend/src/database/schema.sql) → **Run**.

## 2. Variáveis de ambiente na Vercel

Em **Project → Settings → Environment Variables**, adicione:

| Nome | Valor |
|------|-------|
| `DATABASE_URL` | `postgresql://postgres.<ref>:<SENHA>@aws-0-<regiao>.pooler.supabase.com:6543/postgres` |
| `DB_SSL` | `true` |
| `JWT_SECRET` | (uma chave longa e aleatória) |
| `JWT_RESET_SECRET` | (outra chave longa e aleatória) |
| `JWT_EXPIRES_IN` | `7d` |
| `JWT_RESET_EXPIRES_IN` | `30m` |
| `BCRYPT_ROUNDS` | `10` |
| `NODE_ENV` | `production` |

> O `.env` local **não** é enviado (está no `.vercelignore`). Estas variáveis
> ficam só no painel da Vercel.
> `CORS` não é necessário (frontend e API no mesmo domínio). `FRONTEND_URL`
> só importa se você usar recuperação de senha por e-mail — aí coloque a URL
> final `https://seu-projeto.vercel.app`.

## 3. Subir

**Opção A — via GitHub:** suba o repositório e clique em *Import* na Vercel.
Defina o **Root Directory** como `Bloom-Agenda` (onde está o `vercel.json`).

**Opção B — via CLI:**
```bash
npm i -g vercel
cd Bloom-Agenda
vercel            # preview
vercel --prod     # produção
```

## 4. Testar

- Site: `https://seu-projeto.vercel.app/` (abre a tela de login)
- API:  `https://seu-projeto.vercel.app/api/health` → `{ "success": true, ... }`

Faça um cadastro e um login; as tarefas devem persistir no Supabase.

---

## Observações

- O frontend ([js/api.js](js/api.js)) detecta o ambiente automaticamente:
  em `localhost` usa `http://localhost:3006/api` (Docker/local); em produção
  usa `/api` (mesmo domínio).
- O **Docker continua funcionando** normalmente (`docker compose up`); esta
  configuração de Vercel é adicional e não interfere nele.
- Usamos `bcryptjs` (JS puro) em vez de `bcrypt` (binário nativo) para evitar
  problemas de compilação no ambiente serverless.
