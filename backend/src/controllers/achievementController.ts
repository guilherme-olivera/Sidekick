import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { calculatePersonalRecords, calculateMonthlyDistanceProgress } from "../services/achievementService";

export const getUserAchievementsHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const records = await calculatePersonalRecords(userId);
    const monthlyChallenge = await calculateMonthlyDistanceProgress(userId);

    // Fetch user details for badges
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      records,
      monthlyChallenge,
      profile: user.profile,
    });
  } catch (error) {
    console.error("Error fetching achievements:", error);
    res.status(500).json({ error: "Failed to fetch achievements" });
  }
};

export const getNewAchievementsHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { newConquestsJson: true },
    });

    let newConquests = [];
    if (profile?.newConquestsJson) {
      try {
        newConquests = JSON.parse(profile.newConquestsJson);
      } catch (e) {
        newConquests = [];
      }
    }

    res.json({
      success: true,
      newConquests,
    });
  } catch (error) {
    console.error("Error fetching new achievements:", error);
    res.status(500).json({ error: "Failed to fetch new achievements" });
  }
};

export const clearNewAchievementsHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    await prisma.userProfile.update({
      where: { userId },
      data: { newConquestsJson: null },
    });

    res.json({
      success: true,
    });
  } catch (error) {
    console.error("Error clearing new achievements:", error);
    res.status(500).json({ error: "Failed to clear new achievements" });
  }
};
