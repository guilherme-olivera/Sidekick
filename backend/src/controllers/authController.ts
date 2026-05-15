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
