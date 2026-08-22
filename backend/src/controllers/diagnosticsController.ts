import { Response } from "express";
import { prisma } from "../utils/prisma";
import { testGeminiConnection } from "../services/geminiService";
import { sendMail, getTransporterError } from "../services/emailService";

/**
 * GET /api/diagnostics/test
 * Executa testes de integridade do backend (Banco de Dados, Gemini e SMTP de E-mail)
 */
export async function handleDiagnosticsTest(req: any, res: Response) {
  const results = {
    db: { success: false, error: null as string | null },
    gemini: { success: false, result: null as string | null, error: null as string | null },
    email: { success: false, error: null as string | null },
  };

  // 1. Testar Banco de Dados
  try {
    await prisma.$queryRaw`SELECT 1`;
    results.db.success = true;
  } catch (err: any) {
    results.db.error = err instanceof Error ? err.message : String(err);
  }

  // 2. Testar API do Gemini
  try {
    const geminiResult = await testGeminiConnection();
    results.gemini.success = true;
    results.gemini.result = geminiResult;
  } catch (err: any) {
    results.gemini.error = err instanceof Error ? err.message : String(err);
  }

  // 3. Testar Envio de E-mail
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { email: true, name: true },
    });

    if (!user) {
      throw new Error("Usuário autenticado não encontrado no banco.");
    }

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; background-color: #ffffff;">
        <h2 style="color: #ff6b6b; text-align: center;">Teste de Diagnóstico Sidekick 👟</h2>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p>Olá, <strong>${user.name || "Atleta"}</strong>!</p>
        <p>Este é um e-mail de teste de diagnóstico enviado para confirmar que o seu serviço de e-mail está configurado e funcionando corretamente a partir do servidor.</p>
        <div style="background-color: #f7f7f9; padding: 15px; border-radius: 6px; border: 1px solid #e1e4e8; margin: 20px 0;">
          <span style="font-size: 14px; font-family: monospace; color: #555;">Status: Conexão E-mail (SMTP/Resend) Estabelecida!</span>
        </div>
        <p style="color: #666; font-size: 13px;">Se você recebeu este e-mail, as configurações de envio de e-mails estão 100% corretas!</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;" />
        <p style="color: #999; font-size: 11px; text-align: center;">ID do usuário solicitante: ${req.userId}</p>
      </div>
    `;

    // Dispara o e-mail de forma síncrona para pegar o erro imediato se falhar
    const sent = await sendMail(
      user.email,
      "Teste de Diagnóstico Sidekick 👟",
      emailHtml,
      "Este é um e-mail de teste de diagnóstico."
    );

    if (sent) {
      results.email.success = true;
    } else {
      const smtpError = getTransporterError();
      throw new Error(smtpError || "O envio de e-mail falhou. Verifique os logs de erro ou API Key do Resend no servidor.");
    }
  } catch (err: any) {
    results.email.error = err instanceof Error ? err.message : String(err);
  }

  return res.json({
    success: true,
    results,
  });
}
