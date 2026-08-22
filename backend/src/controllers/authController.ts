import { Request, Response } from "express";
import { loginUser, registerUser } from "../services/authService";
import { prisma } from "../utils/prisma";
import { calculateReadiness } from "../utils/readiness";

/**
 * POST /api/auth/register
 * Registra novo usuário
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
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao registrar",
    });
  }
}

/**
 * POST /api/auth/login
 * Faz login do usuário
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
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        planType: true,
        stravaId: true,
        stravaAthleteName: true,
        stravaAthleteUsername: true,
        stravaAthleteProfile: true,
        profile: {
          select: {
            trainingGoal: true,
            focusArea: true,
            injuryNote: true,
            availableTime: true,
            trainingMood: true,
            aiGender: true,
            aiPersonality: true,
            aiTone: true,
            birthday: true,
            goalType: true,
            goalDistance: true,
            goalTargetTime: true,
            experienceLevel: true,
            weeklyFrequency: true,
            isConfigured: true,
            companionName: true,
            companionAvatar: true,
            phoneNumber: true,
            gender: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const readiness = await calculateReadiness(userId, user.profile);
    res.json({ success: true, user: { ...user, readiness } });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao buscar usuário",
    });
  }
}

/**
 * POST /api/auth/forgot-password
 * Solicita redefinição de senha
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
        message: "Se o e-mail estiver cadastrado, o código foi enviado.",
      });
    }

    const mockCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`[RECOVERY] Código gerado para ${cleanEmail}: ${mockCode}`);

    const { sendPasswordRecoveryEmail } = require("../services/emailService");
    sendPasswordRecoveryEmail(cleanEmail, mockCode).catch((err: any) => 
      console.error("Failed to send recovery email:", err)
    );

    return res.json({
      success: true,
      message: "Código de recuperação enviado para o e-mail.",
      mockCode: (process.env.NODE_ENV === "development" && !process.env.SMTP_USER) ? mockCode : undefined,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao processar recuperação",
    });
  }
}

/**
 * POST /api/auth/reset-password
 * Redefine a senha com o código
 */
export async function handleResetPassword(req: Request, res: Response) {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: "E-mail, código e nova senha são obrigatórios" });
    }

    const cleanEmail = email.trim().toLowerCase();

    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{6,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        error: "A nova senha deve conter no mínimo 6 caracteres, uma letra maiúscula e um caractere especial.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { email: cleanEmail },
      data: { password: hashedPassword },
    });

    // Send confirmation email
    const { sendMail } = require("../services/emailService");
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; background-color: #ffffff;">
        <h2 style="color: #ff6b6b; text-align: center;">Segurança da Conta Sidekick</h2>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p>Olá, ${user.name || "Atleta"}!</p>
        <p style="font-size: 16px; color: #333;">
          Informamos que a sua senha de acesso ao **Sidekick** foi alterada com sucesso.
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
    ).catch((err: any) => console.error("Failed to send password change confirmation email:", err));

    return res.json({
      success: true,
      message: "Senha redefinida com sucesso!",
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao redefinir senha",
    });
  }
}
