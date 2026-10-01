require("dotenv").config();
const nodemailer = require("nodemailer");

async function main() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER || "ironstridenation@gmail.com";
  const pass = process.env.SMTP_PASS || "xrjjroaarsfaiudc";

  console.log(`📧 Testando envio de e-mail via Gmail SMTP (${host}:${port}) de ${user}...`);

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });

  try {
    const info = await transporter.sendMail({
      from: `"Sidekick" <${user}>`,
      to: "jujumaraccini@yahoo.com.br",
      subject: "Seu código de recuperação Sidekick: 123456 🔑",
      html: `<h2>Teste Sidekick</h2><p>Seu código de teste é <strong>123456</strong>.</p>`,
    });

    console.log("✅ E-mail enviado com SUCESSO via Gmail SMTP! ID:", info.messageId);
  } catch (err) {
    console.error("❌ Erro ao enviar e-mail via SMTP:", err);
  }
}

main();
