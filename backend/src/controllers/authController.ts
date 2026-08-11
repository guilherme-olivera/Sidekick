import { Request, Response } from "express";
import { loginUser, registerUser } from "../services/authService";
import { prisma } from "../utils/prisma";

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
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json({ success: true, user });
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

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.json({
        success: true,
        message: "Se o e-mail estiver cadastrado, o código foi enviado.",
      });
    }

    const mockCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`[RECOVERY] Código gerado para ${email}: ${mockCode}`);

    const { sendPasswordRecoveryEmail } = require("../services/emailService");
    sendPasswordRecoveryEmail(email, mockCode).catch((err: any) => 
      console.error("Failed to send recovery email:", err)
    );

    return res.json({
      success: true,
      message: "Código de recuperação enviado para o e-mail.",
      mockCode,
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

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

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
