import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { getAiUsageStatus } from "../services/usageService";
import { calculateReadiness } from "../utils/readiness";
import {
  calculateRacePredictions,
  calculateACWR,
} from "../services/analyticsService";
import {
  saveUserPushToken,
  broadcastNotification,
} from "../services/pushNotificationService";
import { checkIsAdminUser, isExplicitAdminEmail } from "../utils/adminAuth";

export const getUserProfileHandler = async (req: any, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

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

    const usage = await getAiUsageStatus(userId, user.planType);
    const readiness = await calculateReadiness(userId, user.profile);

    res.json({
      success: true,
      user: {
        ...user,
        isAdmin: user.isAdmin || isExplicitAdminEmail(user.email),
        readiness,
      },
      usage,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "Falha ao buscar perfil do usuário" });
  }
};

export const updateUserProfileHandler = async (req: any, res: Response) => {
  try {
    const userId = req.userId;
    const {
      trainingGoal,
      focusArea,
      injuryNote,
      availableTime,
      trainingMood,
      aiGender,
      aiPersonality,
      aiTone,
      birthday,
      goalType,
      goalDistance,
      goalTargetTime,
      experienceLevel,
      weeklyFrequency,
      isConfigured,
      companionName,
      companionAvatar,
      phoneNumber,
      gender,
    } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const freq =
      weeklyFrequency !== undefined && weeklyFrequency !== null
        ? Number(weeklyFrequency)
        : null;

    const profile = await prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        trainingGoal,
        focusArea,
        injuryNote,
        availableTime,
        trainingMood,
        aiGender,
        aiPersonality,
        aiTone,
        birthday,
        goalType,
        goalDistance,
        goalTargetTime,
        experienceLevel,
        weeklyFrequency: freq,
        isConfigured: isConfigured ?? false,
        companionName: companionName !== undefined ? companionName : null,
        companionAvatar: companionAvatar !== undefined ? companionAvatar : null,
        phoneNumber: phoneNumber !== undefined ? phoneNumber : null,
        gender: gender !== undefined ? gender : null,
      },
      update: {
        trainingGoal,
        focusArea,
        injuryNote,
        availableTime,
        trainingMood,
        aiGender,
        aiPersonality,
        aiTone,
        birthday,
        goalType,
        goalDistance,
        goalTargetTime,
        experienceLevel,
        weeklyFrequency: freq,
        isConfigured: isConfigured ?? undefined,
        companionName: companionName !== undefined ? companionName : undefined,
        companionAvatar:
          companionAvatar !== undefined ? companionAvatar : undefined,
        phoneNumber: phoneNumber !== undefined ? phoneNumber : undefined,
        gender: gender !== undefined ? gender : undefined,
      },
    });

    res.json({ success: true, profile });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ error: "Falha ao atualizar perfil do usuário" });
  }
};

export const updateUserAvatarHandler = async (req: any, res: Response) => {
  try {
    const userId = req.userId;
    const { avatarUrl } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    if (!avatarUrl || typeof avatarUrl !== "string") {
      return res.status(400).json({ error: "URL de avatar inválida" });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
      select: {
        id: true,
        avatar: true,
      },
    });

    res.json({ success: true, user });
  } catch (error) {
    console.error("Error updating avatar:", error);
    res.status(500).json({ error: "Falha ao atualizar avatar" });
  }
};

export const getUserUsageHandler = async (req: any, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const usage = await getAiUsageStatus(userId);
    res.json({ success: true, usage });
  } catch (error) {
    console.error("Error fetching usage status:", error);
    res.status(500).json({ error: "Falha ao buscar cota de uso" });
  }
};

export const handleSaveMood = async (req: any, res: Response) => {
  try {
    const userId = req.userId;
    const { mood } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    if (!mood) {
      return res.status(400).json({ error: "Humor não informado" });
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const todayDate = new Date(todayStr);

    const moodCheck = await prisma.moodCheck.upsert({
      where: {
        userId_date: {
          userId,
          date: todayDate,
        },
      },
      create: {
        userId,
        date: todayDate,
        mood,
      },
      update: {
        mood,
      },
    });

    res.json({ success: true, moodCheck });
  } catch (error) {
    console.error("Error saving mood:", error);
    res.status(500).json({ error: "Falha ao salvar humor" });
  }
};

export const handleGetTodayMood = async (req: any, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const todayDate = new Date(todayStr);

    const moodCheck = await prisma.moodCheck.findUnique({
      where: {
        userId_date: {
          userId,
          date: todayDate,
        },
      },
    });

    res.json({ success: true, mood: moodCheck?.mood || null });
  } catch (error) {
    console.error("Error fetching today mood:", error);
    res.status(500).json({ error: "Falha ao buscar humor de hoje" });
  }
};

export const getUserAnalyticsHandler = async (req: any, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const predictions = await calculateRacePredictions(userId);
    const acwr = await calculateACWR(userId);

    res.json({ success: true, predictions, acwr });
  } catch (error) {
    console.error("Error fetching user analytics:", error);
    res.status(500).json({ error: "Falha ao calcular análises do usuário" });
  }
};

export const savePushTokenHandler = async (req: any, res: Response) => {
  try {
    const userId = req.userId;
    const { pushToken } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    if (!pushToken || typeof pushToken !== "string") {
      return res.status(400).json({ error: "Token de push inválido" });
    }

    const saved = await saveUserPushToken(userId, pushToken);
    res.json({ success: saved });
  } catch (error) {
    console.error("Error saving push token:", error);
    res.status(500).json({ error: "Falha ao salvar token de notificação" });
  }
};

export const broadcastNotificationHandler = async (
  req: any,
  res: Response
) => {
  try {
    const isAdmin = await checkIsAdminUser(req.userId);
    if (!isAdmin) {
      return res.status(403).json({
        error: "Acesso negado. Apenas administradores podem enviar avisos.",
      });
    }

    const { title, body, filter, extraData } = req.body;

    if (!title || !body) {
      return res
        .status(400)
        .json({ error: "Título e mensagem são obrigatórios" });
    }

    const result = await broadcastNotification(title, body, filter, extraData);
    res.json({ success: true, result });
  } catch (error) {
    console.error("Error sending broadcast notification:", error);
    res
      .status(500)
      .json({ error: "Falha ao enviar notificação de transmissão" });
  }
};

/**
 * GET /api/user/notifications
 * Busca notificações In-App do usuário (pessoais + avisos gerais do Admin)
 */
export const getNotificationsHandler = async (req: any, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { planType: true, createdAt: true },
    });

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const notifications = await prisma.appNotification.findMany({
      where: {
        OR: [
          { userId },
          {
            userId: null,
            targetPlan: { in: ["all", user.planType || "free"] },
            createdAt: { gte: thirtyDaysAgo },
          },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    });

    res.json({ success: true, notifications });
  } catch (error) {
    console.error("Error fetching user notifications:", error);
    res.status(500).json({ error: "Falha ao buscar notificações" });
  }
};

/**
 * POST /api/user/notifications/read
 * Marca as notificações pessoais do usuário como lidas
 */
export const markNotificationsReadHandler = async (
  req: any,
  res: Response
) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    await prisma.appNotification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error marking notifications read:", error);
    res.status(500).json({ error: "Falha ao atualizar notificações" });
  }
};

/**
 * DELETE /api/user/account
 * Exclui permanentemente a conta do usuário e todos os seus dados (LGPD / Lojas / Strava)
 */
export const deleteAccountHandler = async (req: any, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    // Exclusão em cascata (User tem onDelete: Cascade nos relacionamentos e limpamos tokens de reset por email)
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { email: user.email } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);

    console.log(`🗑️ Conta excluída permanentemente pelo titular: ${user.email}`);

    res.json({
      success: true,
      message: "Sua conta e todos os dados associados foram excluídos permanentemente.",
    });
  } catch (error) {
    console.error("Error deleting user account:", error);
    res.status(500).json({ error: "Falha ao excluir conta do usuário" });
  }
};
