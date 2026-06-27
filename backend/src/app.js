// Configuração da aplicação Express (sem iniciar o servidor).
const express = require("express");
const cors = require("cors");
const path = require("path");
const config = require("./config");
const routes = require("./routes");
const { notFound, errorHandler } = require("./middlewares/errorHandler");

const app = express();

// CORS — aceita "*" ou lista de origens do .env.
app.use(
  cors({
    origin: config.corsOrigins.includes("*") ? true : config.corsOrigins,
  })
);

// Body parser tolerante a serverless: na Vercel o runtime pode já ter
// parseado o corpo (req.body definido). Nesse caso, pulamos o parser do
// Express para não tentar ler um stream já consumido. No Docker/local,
// req.body vem indefinido e o Express parseia normalmente.
const jsonParser = express.json();
const urlencodedParser = express.urlencoded({ extended: true });
app.use((req, res, next) => {
  if (req.body && typeof req.body === "object") return next();
  jsonParser(req, res, next);
});
app.use((req, res, next) => {
  if (req.body && typeof req.body === "object") return next();
  urlencodedParser(req, res, next);
});

// Arquivos enviados (futuro: avatares, anexos).
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// Respostas da API nunca são cacheadas (evita 304 servindo dados antigos).
app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// API
app.use("/api", routes);

// ---- Frontend estático ----
// Raiz do projeto (onde ficam html/, css/, js/). Em produção (Vercel) esses
// arquivos são incluídos na função via "includeFiles" no vercel.json.
// No Docker o frontend é servido pelo nginx, então estes mounts ficam ociosos.
// Silencia o pedido automático do navegador (sem arquivo de ícone).
app.get("/favicon.ico", (_req, res) => res.status(204).end());

const ROOT = path.join(__dirname, "..", "..");
app.use("/css", express.static(path.join(ROOT, "css")));
app.use("/js", express.static(path.join(ROOT, "js")));
app.use("/html", express.static(path.join(ROOT, "html")));
app.get("/", (_req, res) => res.redirect("/html/index.html"));

// 404 + tratamento central de erros
app.use(notFound);
app.use(errorHandler);

module.exports = app;
