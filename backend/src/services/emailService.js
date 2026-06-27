// Envio de e-mails (recuperação de senha) via Nodemailer.
// Se o SMTP não estiver configurado, cai num modo de log no console (dev).
const nodemailer = require("nodemailer");
const config = require("../config");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (config.mail.host && config.mail.user) {
    transporter = nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      secure: config.mail.secure,
      auth: { user: config.mail.user, pass: config.mail.pass },
    });
  }
  return transporter;
}

async function sendPasswordReset(to, name, resetUrl) {
  const html = `
    <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 480px; margin: auto;
                background: #fff; border-radius: 16px; overflow: hidden;
                box-shadow: 0 10px 30px rgba(196,69,105,.15);">
      <div style="background: linear-gradient(135deg,#ff6b9d,#c44569); padding: 24px; color:#fff;">
        <h2 style="margin:0;">🌸 Bloom Agenda</h2>
      </div>
      <div style="padding: 24px; color:#4a3640;">
        <p>Olá, <strong>${name || "usuário"}</strong>!</p>
        <p>Recebemos um pedido para redefinir a sua senha. Clique no botão abaixo:</p>
        <p style="text-align:center; margin: 28px 0;">
          <a href="${resetUrl}" style="background: linear-gradient(135deg,#ff6b9d,#c44569);
             color:#fff; text-decoration:none; padding: 12px 28px; border-radius: 999px;
             font-weight:600; display:inline-block;">Redefinir senha</a>
        </p>
        <p style="font-size: 13px; color:#8a7680;">
          Se você não solicitou, ignore este e-mail. O link expira em breve.
        </p>
      </div>
    </div>`;

  const t = getTransporter();
  if (!t) {
    // Modo desenvolvimento: apenas loga o link.
    console.log("\n[EMAIL/DEV] Recuperação de senha para:", to);
    console.log("[EMAIL/DEV] Link:", resetUrl, "\n");
    return { devMode: true };
  }

  await t.sendMail({
    from: config.mail.from,
    to,
    subject: "Bloom Agenda — Redefinição de senha",
    html,
  });
  return { devMode: false };
}

module.exports = { sendPasswordReset };
