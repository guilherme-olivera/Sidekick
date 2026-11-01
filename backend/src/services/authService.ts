import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "../utils/prisma";
import { calculateReadiness } from "../utils/readiness";
import { isExplicitAdminEmail } from "../utils/adminAuth";
import { getAiUsageStatus } from "./usageService";

const JWT_SECRET = process.env.JWT_SECRET || "sidekick-dev-secret-key-2026";

/**
 * Busca objeto completo do usuário autenticado (com profile, readiness, plano normalizado e uso de IA)
 */
export async function getFullAuthenticatedUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      planType: true,
      premiumUntil: true,
      isAdmin: true,
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

  if (!user) return null;

  let finalPlanType = user.planType;
  let finalPremiumUntil = user.premiumUntil;
  let finalIsAdmin = user.isAdmin || isExplicitAdminEmail(user.email);

  // Auto-downgrade se premium expirou (exceto admin explícito sem data de expiração)
  if (
    user.planType === "premium" &&
    user.premiumUntil &&
    new Date(user.premiumUntil) < new Date()
  ) {
    await prisma.user.update({
      where: { id: userId },
      data: { planType: "free", premiumUntil: null },
    });
    finalPlanType = "free";
    finalPremiumUntil = null;
  }

  const [readiness, aiUsage] = await Promise.all([
    calculateReadiness(userId, user.profile),
    getAiUsageStatus(userId, finalPlanType),
  ]);

  return {
    ...user,
    isAdmin: finalIsAdmin,
    planType: finalPlanType,
    premiumUntil: finalPremiumUntil,
    readiness,
    aiUsage,
  };
}

/**
 * Registra novo usuário e já retorna token + usuário completo para login atômico
 */
export async function registerUser(
  email: string,
  password: string,
  name: string
): Promise<{
  success: boolean;
  userId?: string;
  token?: string;
  user?: any;
  error?: string;
}> {
  try {
    if (!email || !password || !name) {
      return { success: false, error: "Email, senha e nome são obrigatórios" };
    }

    const cleanEmail = email.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return { success: false, error: "Formato de e-mail inválido" };
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{6,}$/;
    if (!passwordRegex.test(password)) {
      return {
        success: false,
        error:
          "A senha deve conter no mínimo 6 caracteres, uma letra maiúscula e um caractere especial.",
      };
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return { success: false, error: "Este email já está registrado" };
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const isOwner = isExplicitAdminEmail(cleanEmail);

    const newUser = await prisma.user.create({
      data: {
        email: cleanEmail,
        password: hashedPassword,
        name: name.trim(),
        isAdmin: isOwner,
        planType: isOwner ? "premium" : "free",
      },
    });

    const token = jwt.sign(
      {
        userId: newUser.id,
        email: newUser.email,
      },
      JWT_SECRET,
      { expiresIn: "365d" }
    );

    console.log(`✅ Usuário registrado: ${cleanEmail}`);

    // Import dynamically to avoid circular dependencies
    const { sendWelcomeEmail } = require("./emailService");
    sendWelcomeEmail(cleanEmail, name).catch((err: any) =>
      console.error("Failed to send welcome email:", err)
    );

    const fullUser = await getFullAuthenticatedUser(newUser.id);

    return {
      success: true,
      userId: newUser.id,
      token,
      user: fullUser,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao registrar",
    };
  }
}

/**
 * Faz login de usuário e retorna JWT + perfil completo em uma única chamada
 */
export async function loginUser(
  email: string,
  password: string
): Promise<{
  success: boolean;
  token?: string;
  user?: any;
  error?: string;
}> {
  try {
    if (!email || !password) {
      return { success: false, error: "Email e senha são obrigatórios" };
    }

    const cleanEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user || !user.password) {
      return {
        success: false,
        error: "Email ou senha inválidos",
      };
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return { success: false, error: "Email ou senha inválidos" };
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: "365d" }
    );

    console.log(`✅ Login bem-sucedido: ${cleanEmail}`);

    const fullUser = await getFullAuthenticatedUser(user.id);

    return {
      success: true,
      token,
      user: fullUser || {
        id: user.id,
        email: user.email,
        name: user.name || "",
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao fazer login",
    };
  }
}

/**
 * Valida JWT token
 */
export function verifyToken(
  token: string
): { valid: boolean; userId?: string; email?: string; error?: string } {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
    };
    return { valid: true, userId: decoded.userId, email: decoded.email };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Token inválido",
    };
  }
}

/**
 * Middleware para verificar autenticação
 */
export function authMiddleware(req: any, res: any, next: any) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Token não fornecido" });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const { valid, userId, email, error } = verifyToken(token);

    if (!valid || !userId) {
      const userFriendlyError =
        error && error.includes("jwt expired")
          ? "Sua sessão expirou. Por favor, faça login novamente."
          : error || "Token inválido";
      return res.status(401).json({ error: userFriendlyError });
    }

    req.userId = userId;
    req.user = {
      id: userId,
      email: email || "",
      name: "",
    };
    next();
  } catch (error: any) {
    const errorMsg =
      error instanceof Error ? error.message : "Erro de autenticação";
    const userFriendlyError = errorMsg.includes("jwt expired")
      ? "Sua sessão expirou. Por favor, faça login novamente."
      : errorMsg;
    res.status(401).json({
      error: userFriendlyError,
    });
  }
}
