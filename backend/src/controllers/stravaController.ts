import { Request, Response } from "express";
import {
  getStravaAuthUrl,
  exchangeCodeForTokens,
  fetchStravaActivities,
  convertStravaActivityToWorkout,
  refreshStravaToken,
  verifyStravaState,
} from "../services/stravaService";
import { prisma } from "../utils/prisma";

const STRAVA_APP_REDIRECT_URI = process.env.STRAVA_APP_REDIRECT_URI || "sidekick://strava/callback";

/**
 * GET /api/strava/auth-url
 * Retorna URL de autorização do Strava
 */
export const getStravaAuthUrlHandler = async (req: any, res: Response) => {
  try {
    const userId = req.userId;
    console.log('[StravaController] getStravaAuthUrlHandler request', { userId });
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const authUrl = getStravaAuthUrl(userId);
    console.log('[StravaController] generated authUrl', authUrl);
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
export const stravaCallbackHandler = async (req: any, res: Response) => {
  try {
    const code = (req.method === "GET" ? req.query.code : req.body.code) as string;
    const state = (req.method === "GET" ? req.query.state : req.body.state) as string;
    let userId = req.userId;

    console.log('[StravaController] callback request', {
      method: req.method,
      path: req.path,
      code: !!code,
      state: !!state,
      userId: req.userId,
    });

    if (!userId) {
      if (!state) {
        console.log('[StravaController] missing state and userId');
        return res.status(400).json({ error: "Code or state is required" });
      }
      const verification = verifyStravaState(state);
      console.log('[StravaController] state verification', verification);
      if (!verification.valid || !verification.userId) {
        return res.status(400).json({ error: verification.error || "Invalid state" });
      }
      userId = verification.userId;
    }

    if (!code || !userId) {
      console.log('[StravaController] missing code or userId after verification', { code: !!code, userId });
      return res.status(400).json({ error: "Code and user information are required" });
    }

    console.log('[StravaController] exchanging code for tokens', { userId });
    const tokenData = await exchangeCodeForTokens(code);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        stravaAccessToken: tokenData.access_token,
        stravaRefreshToken: tokenData.refresh_token,
        stravaTokenExpiresAt: new Date(tokenData.expires_at * 1000),
        stravaId: tokenData.athlete.id.toString(),
        stravaAthleteName: `${tokenData.athlete.firstname} ${tokenData.athlete.lastname}`,
        stravaAthleteUsername: tokenData.athlete.username,
        stravaAthleteProfile: tokenData.athlete.profile,
      },
    });
    console.log('[StravaController] saved Strava tokens for user', { userId, stravaId: tokenData.athlete.id });

    const responsePayload = {
      success: true,
      athlete: {
        id: tokenData.athlete.id,
        name: `${tokenData.athlete.firstname} ${tokenData.athlete.lastname}`,
        username: tokenData.athlete.username,
        profile: tokenData.athlete.profile,
      },
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
      },
    };

    if (req.method === "GET") {
      const appRedirectUrl = `${STRAVA_APP_REDIRECT_URI}?success=true`;
      return res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Strava conectado</title><script>window.location.href = ${JSON.stringify(appRedirectUrl)};</script></head><body><h1>Conexão com Strava concluída</h1><p>Se não for redirecionado automaticamente, <a href="${appRedirectUrl}">clique aqui para voltar ao app</a>.</p></body></html>`);
    }

    res.json(responsePayload);
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
        stravaId: true,
      },
    });

    if (!user || !user.stravaAccessToken) {
      return res.status(400).json({ error: "User not connected to Strava" });
    }

    let accessToken = user.stravaAccessToken;

    if (user.stravaTokenExpiresAt && user.stravaTokenExpiresAt < new Date()) {
      if (!user.stravaRefreshToken) {
        return res.status(400).json({ error: "Strava refresh token expired" });
      }

      const newTokenData = await refreshStravaToken(user.stravaRefreshToken);

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
        stravaId: true,
        stravaAthleteName: true,
        stravaAthleteUsername: true,
        stravaAthleteProfile: true,
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
      athlete: isConnected
        ? {
            id: user.stravaId,
            name: user.stravaAthleteName,
            username: user.stravaAthleteUsername,
            profile: user.stravaAthleteProfile,
          }
        : null,
    });
  } catch (error) {
    console.error("Error checking Strava status:", error);
    res.status(500).json({ error: "Failed to check Strava status" });
  }
};

export const disconnectStravaHandler = async (req: any, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        stravaAccessToken: null,
        stravaRefreshToken: null,
        stravaTokenExpiresAt: null,
        stravaId: null,
        stravaAthleteName: null,
        stravaAthleteUsername: null,
        stravaAthleteProfile: null,
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting Strava:", error);
    res.status(500).json({ error: "Failed to disconnect Strava" });
  }
};
