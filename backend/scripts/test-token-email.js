require("dotenv").config();
const { sendPasswordRecoveryEmail, sendMail } = require("../dist/src/services/emailService");

async function main() {
  console.log("📧 Testando envio de e-mail de recuperação de token via Gmail SMTP...");
  const targetEmail = "jujumaraccini@yahoo.com.br";
  const mockCode = "987654";

  const success = await sendPasswordRecoveryEmail(targetEmail, mockCode);
  if (success) {
    console.log(`✅ E-mail de recuperação enviado com sucesso para ${targetEmail}!`);
  } else {
    console.error(`❌ Falha ao enviar e-mail de recuperação para ${targetEmail}.`);
  }

  const vipCode = "SIDEKICK-VIP-TEST99";
  const vipMessage = `Parabéns, seu premium chegou, utilize o token ${vipCode} e aproveite o máximo`;
  const emailHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; background-color: #ffffff;">
      <h2 style="color: #ffd700; text-align: center; background-color: #1a1a1a; padding: 15px; border-radius: 6px;">👑 Parabéns! Seu Premium Chegou!</h2>
      <p style="font-size: 16px; color: #333;">Você recebeu acesso ao plano <strong>Sidekick Premium</strong>!</p>
      <div style="text-align: center; margin: 25px 0; background-color: #fff9db; padding: 15px; border-radius: 6px; border: 1.5px solid #ffd700;">
        <span style="font-size: 28px; font-weight: bold; letter-spacing: 3px; color: #d9480f;">${vipCode}</span>
      </div>
      <p style="font-size: 14px; color: #333; text-align: center;">"${vipMessage}"</p>
    </div>
  `;

  const vipSuccess = await sendMail(
    targetEmail,
    "Parabéns! Seu Premium Sidekick chegou! 👑",
    emailHtml,
    vipMessage
  );

  if (vipSuccess) {
    console.log(`✅ E-mail de Token VIP enviado com sucesso para ${targetEmail}!`);
  } else {
    console.error(`❌ Falha ao enviar e-mail de Token VIP para ${targetEmail}.`);
  }
}

main();
