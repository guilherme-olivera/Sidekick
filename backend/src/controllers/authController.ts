import { Request, Response } from "express";
import { loginUser, registerUser } from "../services/authService";

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
    // req.userId é adicionado pelo authMiddleware
    res.json({
      success: true,
      userId: req.userId,
      message: "Autenticado com sucesso",
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao buscar usuário",
    });
  }
}
