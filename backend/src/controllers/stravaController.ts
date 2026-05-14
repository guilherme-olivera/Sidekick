import { Request, Response } from "express";
import {
  getStravaAuthUrl,
  exchangeCodeForTokens,
  fetchStravaActivities,
  convertStravaActivityToWorkout,
  refreshStravaToken,
} from "../services/stravaService";
import { prisma } from "../utils/prisma";

/**
 * GET /api/strava/auth-url
 * Retorna URL de autorização do Strava
 */
export const getStravaAuthUrlHandler = async (req: Request, res: Response) => {
  try {
    const authUrl = getStravaAuthUrl();
    res.json({ authUrl });
  } catch (error) {
    console.error("Error generating Strava auth URL:", error);
    res.status(500).json({ error: "Failed to generate Strava auth URL" });
  }
};

/**
 * POST /api/strava/callback
 * Processa callback do OAuth do Strava
 */
export const stravaCallbackHandler = async (req: Request, res: Response) => {
  try {
    const { code, userId } = req.body;

    if (!code || !userId) {
      return res.status(400).json({ error: "Code and userId are required" });
    }

    // Troca código por tokens
    const tokenData = await exchangeCodeForTokens(code);

    // Salva ou atualiza tokens do usuário
    await prisma.user.update({
      where: { id: userId },
      data: {
        stravaAccessToken: tokenData.access_token,
        stravaRefreshToken: tokenData.refresh_token,
        stravaTokenExpiresAt: new Date(tokenData.expires_at * 1000),
        stravaAthleteId: tokenData.athlete.id,
      },
    });

    res.json({
      success: true,
      athlete: {
        id: tokenData.athlete.id,
        name: `${tokenData.athlete.firstname} ${tokenData.athlete.lastname}`,
        username: tokenData.athlete.username,
        profile: tokenData.athlete.profile,
      },
    });
  } catch (error) {
    console.error("Error processing Strava callback:", error);
    res.status(500).json({ error: "Failed to process Strava callback" });
  }
};

/**
 * POST /api/strava/sync
 * Sincroniza atividades do Strava
 */
export const syncStravaActivitiesHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Busca dados do usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        stravaAccessToken: true,
        stravaRefreshToken: true,
        stravaTokenExpiresAt: true,
        stravaAthleteId: true,
      },
    });

    if (!user || !user.stravaAccessToken) {
      return res.status(400).json({ error: "User not connected to Strava" });
    }

    let accessToken = user.stravaAccessToken;

    // Verifica se token expirou e renova se necessário
    if (user.stravaTokenExpiresAt && user.stravaTokenExpiresAt < new Date()) {
      if (!user.stravaRefreshToken) {
        return res.status(400).json({ error: "Strava refresh token expired" });
      }

      const newTokenData = await refreshStravaToken(user.stravaRefreshToken);

      // Atualiza tokens no banco
      await prisma.user.update({
        where: { id: userId },
        data: {
          stravaAccessToken: newTokenData.access_token,
          stravaRefreshToken: newTokenData.refresh_token,
          stravaTokenExpiresAt: new Date(newTokenData.expires_at * 1000),
        },
      });

      accessToken = newTokenData.access_token;
    }

    // Busca atividades mais recentes (últimos 30 dias)
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
    const activities = await fetchStravaActivities(accessToken, thirtyDaysAgo);

    // Converte e salva atividades
    const workouts = [];
    for (const activity of activities) {
      const workoutData = convertStravaActivityToWorkout(activity);

      // Verifica se já existe
      const existingWorkout = await prisma.workout.findFirst({
        where: {
          userId,
          stravaId: workoutData.stravaId,
        },
      });

      if (!existingWorkout) {
        const workout = await prisma.workout.create({
          data: {
            ...workoutData,
            userId,
          },
        });
        workouts.push(workout);
      }
    }

    res.json({
      success: true,
      syncedActivities: workouts.length,
      totalActivities: activities.length,
    });
  } catch (error) {
    console.error("Error syncing Strava activities:", error);
    res.status(500).json({ error: "Failed to sync Strava activities" });
  }
};

/**
 * GET /api/strava/status
 * Verifica status da conexão Strava do usuário
 */
export const getStravaStatusHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        stravaAccessToken: true,
        stravaTokenExpiresAt: true,
        stravaAthleteId: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isConnected = !!user.stravaAccessToken;
    const isExpired = user.stravaTokenExpiresAt ? user.stravaTokenExpiresAt < new Date() : false;

    res.json({
      isConnected,
      isExpired,
      athleteId: user.stravaAthleteId,
    });
  } catch (error) {
    console.error("Error checking Strava status:", error);
    res.status(500).json({ error: "Failed to check Strava status" });
  }
};
