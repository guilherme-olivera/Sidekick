import { Response } from "express";
import { generateChatResponse } from "../services/geminiService";
import { prisma } from "../utils/prisma";

export const chatHandler = async (req: any, res: Response) => {
  try {
    const userId = req.userId;
    const { message, history } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

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

    const response = await generateChatResponse(message, history || [], user.profile, moodCheck?.mood);
    
    return res.json({ success: true, response });
  } catch (error) {
    console.error("Error in chatHandler:", error);
    return res.status(500).json({ error: "Failed to generate chat response" });
  }
};
