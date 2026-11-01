import { Request, Response } from "express";
import crypto from "crypto";
import {
  loginUser,
  registerUser,
  getFullAuthenticatedUser,
} from "../services/authService";
import { prisma } from "../utils/prisma";

/**
 * POST /api/auth/register
 * Registra novo usuário e já retorna token + usuário completo (login atômico)
 */
export async function handleRegister(req: Request, res: Response) {
  try {
    const { email, password, name } = req.body;

    const result = await registerUser(email, password, name);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.status(201).json({
      success: true,
      message: "Usuário registrado com sucesso",
      userId: result.userId,
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao registrar",
    });
  }
}

/**
 * POST /api/auth/login
 * Faz login do usuário e retorna perfil completo em uma única viagem
 */
export async function handleLogin(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    const result = await loginUser(email, password);

    if (!result.success) {
      return res.status(401).json({ error: result.error });
    }

    res.json({
      success: true,
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao fazer login",
    });
  }
}

/**
 * GET /api/auth/me
 * Retorna dados do usuário autenticado (protegido)
 */
export async function handleGetMe(req: any, res: Response) {
  try {
    const userId = req.userId;
    const fullUser = await getFullAuthenticatedUser(userId);

    if (!fullUser) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json({
      success: true,
      user: fullUser,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao buscar usuário",
    });
  }
}

/**
 * POST /api/auth/forgot-password
 * Solicita redefinição de senha e envia código por e-mail com 30min de validade
 */
export async function handleForgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "E-mail é obrigatório" });
    }

    const cleanEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      return res.json({
        success: true,
        emailSent: true,
        message:
          "Se o e-mail estiver cadastrado em nossa base, o código foi enviado com sucesso!",
      });
    }

    // Gera código numérico de 6 dígitos com CSPRNG (crypto.randomInt)
    const recoveryCode = crypto.randomInt(100000, 1000000).toString();

    // Validade estrita de 30 minutos
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // Salva o token de uso único no banco
    await prisma.passwordResetToken.create({
      data: {
        email: cleanEmail,
        code: recoveryCode,
        expiresAt,
        isUsed: false,
      },
    });

    console.log(
      `[RECOVERY] 📧 Solicitação de recuperação gerada para ${cleanEmail} (Validade: 30 min)`
    );

    const { sendPasswordRecoveryEmail } = require("../services/emailService");
    await sendPasswordRecoveryEmail(cleanEmail, recoveryCode).catch(
      (err: any) => {
        console.error("Failed to send recovery email:", err);
        return false;
      }
    );

    return res.json({
      success: true,
      emailSent: true,
      message: `O e-mail contendo seu código de recuperação de 6 dígitos foi enviado com sucesso para ${cleanEmail}! O código é de uso único e possui validade de 30 minutos.`,
      expiresInMinutes: 30,
      mockCode:
        process.env.NODE_ENV === "development" &&
        !process.env.SMTP_USER &&
        !process.env.RESEND_API_KEY
          ? recoveryCode
          : undefined,
    });
  } catch (error) {
    console.error("Erro em handleForgotPassword:", error);
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Erro ao processar recuperação",
    });
  }
}

/**
 * POST /api/auth/reset-password
 * Redefine a senha verificando se o código é válido (<= 30 min) e não utilizado
 */
export async function handleResetPassword(req: Request, res: Response) {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res
        .status(400)
        .json({ error: "E-mail, código e nova senha são obrigatórios" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{6,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        error:
          "A nova senha deve conter no mínimo 6 caracteres, uma letra maiúscula e um caractere especial.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    // Busca o token de recuperação mais recente para o e-mail
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        email: cleanEmail,
        code: cleanCode,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!resetToken) {
      return res
        .status(400)
        .json({ error: "Código de recuperação inválido ou não encontrado." });
    }

    // Validação 1: Verificar se já foi utilizado
    if (resetToken.isUsed) {
      return res.status(400).json({
        error:
          "Este código de recuperação já foi utilizado. Por favor, solicite um novo código.",
      });
    }

    // Validação 2: Verificar validade de 30 minutos
    if (new Date() > new Date(resetToken.expiresAt)) {
      return res.status(400).json({
        error:
          "Este código de recuperação expirou (validade de 30 minutos). Por favor, solicite um novo código.",
      });
    }

    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Atualiza senha do usuário e inativa o token (uso único)
    await prisma.$transaction([
      prisma.user.update({
        where: { email: cleanEmail },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: {
          isUsed: true,
          usedAt: new Date(),
        },
      }),
    ]);

    console.log(
      `✅ Senha alterada e token ${resetToken.id} marcado como usado para ${cleanEmail}`
    );

    // Send confirmation email
    const { sendMail } = require("../services/emailService");
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; background-color: #ffffff;">
        <h2 style="color: #ff6b6b; text-align: center;">Segurança da Conta Sidekick</h2>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p>Olá, ${user.name || "Atleta"}!</p>
        <p style="font-size: 16px; color: #333;">
          Informamos que a sua senha de acesso ao <strong>Sidekick</strong> foi alterada com sucesso.
        </p>
        <p style="color: #666; font-size: 14px;">
          Se foi você quem realizou essa alteração, nenhuma ação adicional é necessária.
        </p>
        <p style="color: #e03c3c; font-size: 14px; font-weight: bold;">
          Se você NÃO solicitou a redefinição de sua senha, entre em contato imediatamente com o suporte.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;" />
        <p style="color: #999; font-size: 12px; text-align: center;">© 2026 Sidekick. Todos os direitos reservados.</p>
      </div>
    `;

    sendMail(
      cleanEmail,
      "Sua senha foi alterada com sucesso! 🔑",
      emailHtml,
      "Sua senha do Sidekick foi alterada com sucesso. Se não foi você, entre em contato com o suporte."
    ).catch((err: any) =>
      console.error("Failed to send password change confirmation email:", err)
    );

    return res.json({
      success: true,
      message:
        "Sua senha foi redefinida com sucesso! O código de recuperação foi utilizado e invalidado.",
    });
  } catch (error) {
    console.error("Erro em handleResetPassword:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao redefinir senha",
    });
  }
}
