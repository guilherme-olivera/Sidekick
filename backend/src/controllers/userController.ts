import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { getAiUsageStatus } from "../services/usageService";

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

    const usage = await getAiUsageStatus(userId);

    res.json({ success: true, user, usage });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "Falha ao buscar perfil do usuário" });
  }
};

export const updateUserProfileHandler = async (req: any, res: Response) => {
  try {
    const userId = req.userId;
    const { trainingGoal, focusArea, injuryNote, availableTime, trainingMood } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const profile = await prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        trainingGoal,
        focusArea,
        injuryNote,
        availableTime,
        trainingMood,
      },
      update: {
        trainingGoal,
        focusArea,
        injuryNote,
        availableTime,
        trainingMood,
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
