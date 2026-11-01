import { Response } from "express";
import { generateChatResponse } from "../services/geminiService";
import { prisma } from "../utils/prisma";
import {
  assertAiAnalysisQuotaAvailable,
  commitAiAnalysisQuota,
} from "../services/usageService";

export const chatHandler = async (req: any, res: Response) => {
  try {
    const userId = req.userId;
    const { message, history } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const sanitizedMessage = message.trim().slice(0, 600);
    const sanitizedHistory = Array.isArray(history) ? history.slice(-12) : [];

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Valida disponibilidade de cota de IA antes da chamada
    await assertAiAnalysisQuotaAvailable(userId, user.planType);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const moodCheck = await prisma.moodCheck.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    });

    const recentWorkouts = await prisma.workout.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 7,
      select: {
        title: true,
        type: true,
        distance: true,
        duration: true,
        pace: true,
        sufferScore: true,
        date: true,
      },
    });

    const response = await generateChatResponse(
      sanitizedMessage,
      sanitizedHistory,
      user.profile,
      moodCheck?.mood,
      recentWorkouts
    );

    // Consome cota após sucesso
    await commitAiAnalysisQuota(userId, user.planType);

    return res.json({ success: true, response });
  } catch (error: any) {
    console.error("Error in chatHandler:", error);
    if (error?.code === "QUOTA_EXCEEDED" || error?.status === 429) {
      return res.status(429).json({
        error: error.message,
        code: "QUOTA_EXCEEDED",
      });
    }
    return res.status(500).json({ error: "Failed to generate chat response" });
  }
};
