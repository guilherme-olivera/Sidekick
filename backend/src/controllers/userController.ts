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

    const freq = weeklyFrequency !== undefined && weeklyFrequency !== null ? Number(weeklyFrequency) : null;

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
        isConfigured: isConfigured ?? false,
        companionName: companionName !== undefined ? companionName : undefined,
        companionAvatar: companionAvatar !== undefined ? companionAvatar : undefined,
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
