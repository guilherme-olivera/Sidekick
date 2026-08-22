import nodemailer from "nodemailer";

// Helper to strip accidental quotes and whitespace from environment variables
const cleanEnvVar = (val: string) => {
  if (!val) return "";
  return val.replace(/^['"]|['"]$/g, "").trim();
};

const SMTP_HOST = cleanEnvVar(process.env.SMTP_HOST || "");
const SMTP_PORT = parseInt(cleanEnvVar(process.env.SMTP_PORT || "587"), 10);
const SMTP_USER = cleanEnvVar(process.env.SMTP_USER || "");
const SMTP_PASS = cleanEnvVar(process.env.SMTP_PASS || "");
const SMTP_FROM = cleanEnvVar(process.env.SMTP_FROM || "") || (SMTP_USER ? `"Sidekick" <${SMTP_USER}>` : '"Sidekick" <no-reply@sidekick.com>');

let transporter: nodemailer.Transporter | null = null;
let lastVerifyError: string | null = null;

// Initialize transporter if configuration is present
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  console.log(`[EMAIL] Inicializando SMTP Transporter para ${SMTP_HOST}:${SMTP_PORT} (${SMTP_USER})`);
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  // Verify connection config on server startup
  transporter.verify((error, success) => {
    if (error) {
      lastVerifyError = error.message || String(error);
      console.error("[EMAIL] ❌ SMTP Connection verification failed:", error);
    } else {
      lastVerifyError = null;
      console.log("[EMAIL] ✅ SMTP Server is ready to send messages!");
    }
  });
} else {
  console.log("[EMAIL] ⚠️ SMTP não configurado. O servidor usará e-mails simulados nos logs.");
}

/**
 * Returns SMTP connection error diagnostics
 */
export function getTransporterError(): string | null {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return "Variáveis de ambiente SMTP não configuradas no back-end.";
  }
  if (!transporter) {
    return "Transporter do Nodemailer não pôde ser inicializado.";
  }
  return lastVerifyError;
}

/**
 * Sends an email. Falls back to console logs in development if SMTP is not configured.
 */
export async function sendMail(to: string, subject: string, htmlContent: string, textContent?: string) {
  try {
    if (transporter) {
      const info = await transporter.sendMail({
        from: SMTP_FROM,
        to,
        subject,
        text: textContent || "Esta mensagem exige visualização em HTML.",
        html: htmlContent,
      });
      console.log(`[EMAIL] E-mail enviado com sucesso para ${to}. ID: ${info.messageId}`);
      return true;
    } else {
      console.log("=========================================");
      console.log(`[EMAIL SIMULADO - SMTP NÃO CONFIGURADO]`);
      console.log(`Para: ${to}`);
      console.log(`Assunto: ${subject}`);
      console.log(`Mensagem:`);
      console.log(textContent || htmlContent.replace(/<[^>]*>/g, "")); // strip html tags for text
      console.log("=========================================");
      return true;
    }
  } catch (error) {
    console.error("[EMAIL] Erro ao enviar e-mail:", error);
    return false;
  }
}

/**
 * Sends a welcome email to a new user
 */
export async function sendWelcomeEmail(to: string, name: string) {
  const subject = "Bem-vindo ao Sidekick! 👟🔥";
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #ff6b6b; margin: 0; font-size: 28px;">Sidekick</h1>
        <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Seu companheiro de jornada</p>
      </div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <h2 style="color: #333; margin-top: 0;">Olá, ${name}!</h2>
      <p style="color: #555; line-height: 1.6; font-size: 16px;">
        Seja muito bem-vindo ao <strong>Sidekick</strong>! Estamos muito empolgados por ter você conosco.
      </p>
      <p style="color: #555; line-height: 1.6; font-size: 16px;">
        Nosso objetivo é simplificar seus dados brutos de treino de corrida e ciclismo e te dar conselhos práticos e divertidos através do seu companheiro de treino digital inteligente!
      </p>
      <p style="color: #555; line-height: 1.6; font-size: 16px;">
        Para começar sua experiência:
      </p>
      <ol style="color: #555; line-height: 1.6; font-size: 16px;">
        <li>Abra o aplicativo móvel e conecte sua conta do <strong>Strava</strong>.</li>
        <li>Personalize o nome, gênero e personalidade do seu <strong>companheiro digital</strong> no perfil.</li>
        <li>Realize seus treinos normalmente e ouça a análise de evolução personalizada!</li>
      </ol>
      <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;" />
      <p style="color: #999; font-size: 12px; text-align: center;">
        Esta é uma mensagem automática. Por favor, não responda a este e-mail.<br />
        © 2026 Sidekick. Todos os direitos reservados.
      </p>
    </div>
  `;
  const text = `Olá, ${name}! Seja bem-vindo ao Sidekick. Conecte sua conta do Strava e personalize seu companheiro digital no app para começar a receber análises de evolução de treinos!`;
  return sendMail(to, subject, html, text);
}

/**
 * Sends a password recovery email with a 6-digit code
 */
export async function sendPasswordRecoveryEmail(to: string, code: string) {
  const subject = "Seu código de recuperação Sidekick: " + code + " 🔑";
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #ff6b6b; margin: 0; font-size: 28px;">Sidekick</h1>
        <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Recuperação de Acesso</p>
      </div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <h2 style="color: #333; margin-top: 0;">Recuperação de Senha</h2>
      <p style="color: #555; line-height: 1.6; font-size: 16px;">
        Você solicitou a redefinição de sua senha de acesso. Use o código abaixo para prosseguir com a alteração no aplicativo:
      </p>
      <div style="text-align: center; margin: 30px 0; background-color: #f7f7f9; padding: 15px; border-radius: 6px; border: 1px solid #e1e4e8;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #ff6b6b;">${code}</span>
      </div>
      <p style="color: #e03c3c; line-height: 1.6; font-size: 14px; font-weight: 500;">
        Atenção: Este código é de uso único e expira em breve. Se você não solicitou esta redefinição, apenas desconsidere esta mensagem.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;" />
      <p style="color: #999; font-size: 12px; text-align: center;">
        Esta é uma mensagem automática. Por favor, não responda a este e-mail.<br />
        © 2026 Sidekick. Todos os direitos reservados.
      </p>
    </div>
  `;
  const text = `Seu código de recuperação de senha do Sidekick é: ${code}. Insira este código no app para cadastrar uma nova senha.`;
  return sendMail(to, subject, html, text);
}
