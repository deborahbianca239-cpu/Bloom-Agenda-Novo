// const express = require("express");
// const cors = require("cors");
// const mysql = require("mysql2");
// const bcrypt = require("bcrypt");

// const app = express();

// app.use(cors());
// app.use(express.json());

// require('dotenv').config();

// const connection = mysql.createConnection({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   port: process.env.DB_PORT,
// });

// connection.connect((err) => {
//   if (err) {
//     console.log("Erro ao conectar:", err);
//   } else {
//     console.log("Conectado ao MySQL 🚀");
//   }
// });


// // ================= CADASTRO =================
// app.post("/cadastro", async (req, res) => {
//   const { nome, email, senha } = req.body;

//   const senhaHash = await bcrypt.hash(senha, 10);

//   connection.query(
//     "INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)",
//     [nome, email, senhaHash],
//     (err) => {
//       if (err) {
//         return res.status(500).json({ erro: err });
//       }
//       res.json({ success: true });
//     }
//   );
// });


// // ================= LOGIN =================
// app.post("/login", (req, res) => {
//   const { email, senha } = req.body;
//   console.log("--- TENTATIVA DE LOGIN ---");
//   console.log("Email recebido:", email);
//   console.log("Senha recebida:", senha);

//   connection.query("SELECT * FROM usuarios WHERE email = ?", [email], async (err, results) => {
//     if (err) return res.status(500).json(err);
//     if (results.length === 0) return res.status(401).json({ message: "Usuário não encontrado" });

//     const usuario = results[0];
//     console.log("Senha que está no Banco:", usuario.senha);

//     // Teste de comparação direta (apenas para debug)
//     const senhaIgualTextoPuro = (senha === usuario.senha);
//     console.log("É igual em texto puro?", senhaIgualTextoPuro);

//     const senhaValidaBcrypt = await bcrypt.compare(senha, usuario.senha);
//     console.log("O Bcrypt validou?", senhaValidaBcrypt);

//     if (!senhaValidaBcrypt) {
//       return res.status(401).json({ success: false, message: "Senha incorreta" });
//     }
//     // ... restante do código
//   });
// });

// // ================= RECUPERAR SENHA =================
// app.post("/recuperar-senha", async (req, res) => {
//   const { email, novaSenha } = req.body;

//   const senhaHash = await bcrypt.hash(novaSenha, 10);

//   connection.query(
//     "UPDATE usuarios SET senha = ? WHERE email = ?",
//     [senhaHash, email],
//     (err) => {
//       if (err) return res.status(500).json(err);

//       res.json({ success: true, message: "Senha atualizada!" });
//     }
//   );
// });


// // ================= TAREFAS =================
// app.post("/tarefas", (req, res) => {
//   const { dia, horario, tarefa } = req.body;

//   connection.query(
//     "INSERT INTO tarefas (dia, horario, tarefa, completed) VALUES (?, ?, ?, false)",
//     [dia, horario, tarefa],
//     (err) => {
//       if (err) return res.status(500).json(err);

//       res.json({ success: true });
//     }
//   );
// });  


// app.get("/tarefas", (req, res) => {
//   connection.query("SELECT * FROM tarefas", (err, results) => {
//     if (err) return res.status(500).json(err);

//     res.json(results);
//   });
// });

// connection.connect((err) => {
//   if (err) {
//     console.log("❌ Erro ao conectar no MySQL");
//     console.log(err);
//   } else {
//     console.log("✅ Conectado ao MySQL!");

//     // ================= USUÁRIOS =================
//     connection.query("SELECT * FROM usuarios", (err, results) => {
//       if (err) {
//         console.log("Erro ao buscar usuários");
//       } else {
//         console.log("\n📌 USUÁRIOS:");
//         console.table(results);
//       }
//     });

//     // ================= TAREFAS =================
//     connection.query("SELECT * FROM tarefas", (err, results) => {
//       if (err) {
//         console.log("Erro ao buscar tarefas");
//       } else {
//         console.log("\n📝 TAREFAS:");
//         console.table(results);
//       }
//     });
//   }
// });


// // ================= START =================
// const PORT = process.env.PORT || 3006;

// app.listen(PORT, () => {
//   console.log("\n ===============================");
//   console.log(` Servidor rodando em: http://localhost:${PORT}`);
//   console.log(" Ambiente: desenvolvimento");

//   connection.connect((err) => {
//     if (err) {
//       console.log(" Erro ao conectar no MySQL:");
//       console.log("", err.message);
//     } else {
//       console.log(" Banco de dados conectado com sucesso!");
//     }

//     console.log(" ===============================\n");
//   });
// });

// app.post("/cadastro", (req, res) => {
//   const { nome, email, senha } = req.body;

//   const sql = `
//     INSERT INTO usuarios (nome, email, senha)
//     VALUES (?, ?, ?)
//   `;

//   connection.query(sql, [nome, email, senha], (err, result) => {
//     if (err) {
//       console.log(err);

//       return res.status(500).json({
//         success: false,
//         message: "Erro ao cadastrar usuário",
//       });
//     }

//     res.json({
//       success: true,
//       message: "Usuário cadastrado com sucesso!",
//     });
//   });
// });

// app.post("/login", (req, res) => {
//   const { email, senha } = req.body;

//   const sql = "SELECT * FROM usuarios WHERE email = ? AND senha = ?";

//   connection.query(sql, [email, senha], (err, results) => {

//     if (err) {
//       console.log(err);

//       return res.status(500).json({
//         success: false,
//         message: "Erro no servidor"
//       });
//     }

//     if (results.length > 0) {

//       res.json({
//         success: true,
//         message: "Login realizado com sucesso!",
//         usuario: results[0]
//       });

//     } else {

//       res.status(401).json({
//         success: false,
//         message: "Email ou senha inválidos"
//       });

//     }
//   });
// });

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Conexão com o Banco de Dados
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

// ================= CADASTRO (ÚNICO E COM BCRYPT) =================
app.post("/cadastro", async (req, res) => {
  const { nome, email, senha } = req.body;

  try {
    // Criptografando a senha antes de enviar para o banco
    const senhaHash = await bcrypt.hash(senha, 10);

    connection.query(
      "INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)",
      [nome, email, senhaHash],
      (err) => {
        if (err) {
          console.error("Erro ao inserir no banco:", err);
          return res.status(500).json({ success: false, erro: err });
        }
        res.json({ success: true, message: "Usuário cadastrado com sucesso!" });
      }
    );
  } catch (error) {
    res.status(500).json({ success: false, erro: "Erro ao gerar hash da senha" });
  }
});

app.post('/login', (req, res) => {
    // Ajustado para 'senha' que costuma ser o padrão do seu form
    const { email, senha } = req.body; 

    console.log("\n--- [BACKEND] TENTATIVA DE LOGIN ---");
    console.log(`[Log] Email recebido: ${email}`);
    console.log(`[Log] Senha recebida (comprimento): ${senha ? senha.length : 0} caracteres`);

    connection.query("SELECT * FROM usuarios WHERE email = ?", [email], async (err, results) => {
        if (err) {
            console.error("[Erro Banco]:", err);
            return res.status(500).json(err);
        }

        if (results.length === 0) {
            console.log(`[Login Erro] Usuário não encontrado no banco: ${email}`);
            return res.status(401).json({ success: false, message: "Usuário não encontrado" });
        }

        const usuario = results[0];
        const senhaBanco = usuario.senha || usuario.password; 
        
        console.log(`[Log] Senha no Banco: ${senhaBanco}`);

        try {
            // Se a senha recebida ou a do banco estiverem vazias/inválidas, avisa antes de quebrar
            if (!senha || !senhaBanco || senhaBanco === '123') {
                console.log("[Login Erro] Senha do banco não está criptografada ou o campo do formulário veio vazio.");
                return res.status(401).json({ success: false, message: "Dados de login inválidos estruturalmente." });
            }

            const isMatch = await bcrypt.compare(senha, senhaBanco);
            console.log(`[Log] O Bcrypt validou a senha? ${isMatch}`);

            if (!isMatch) {
                console.log(`[Login Erro] Senha incorreta para o usuário: ${email}`);
                return res.status(401).json({ success: false, message: "Senha incorreta" });
            }

            console.log(`[Login Sucesso] Usuário ${email} logado!`);
            return res.json({
                success: true,
                message: "Login realizado com sucesso!",
                usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email }
            });

        } catch (bcryptError) {
            console.error("[Erro Bcrypt]:", bcryptError);
            return res.status(500).json({ success: false, message: "Erro ao validar senha." });
        }
    });
});

// ================= TAREFAS =================
app.post("/tarefas", (req, res) => {
  const { dia, horario, tarefa } = req.body;
  connection.query(
    "INSERT INTO tarefas (dia, horario, tarefa, completed) VALUES (?, ?, ?, false)",
    [dia, horario, tarefa],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ success: true });
    }
  );
});  

app.get("/tarefas", (req, res) => {
  connection.query("SELECT * FROM tarefas", (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3006;

app.listen(PORT, () => {
  console.log("\n ===============================");
  console.log(` Servidor rodando em: http://localhost:${PORT}`);
  
  connection.connect((err) => {
    if (err) {
      console.log(" ❌ Erro ao conectar no MySQL:", err.message);
    } else {
      console.log(" ✅ Banco de dados conectado com sucesso!");
      
      // Mostrar tabelas no início para conferência de debug
      connection.query("SELECT id, nome, email FROM usuarios", (err, results) => {
        if (!err) {
          console.log("\n📌 USUÁRIOS CADASTRADOS (Sem senhas no log):");
          console.table(results);
        }
      });
    }
    console.log(" ===============================\n");
  });
});