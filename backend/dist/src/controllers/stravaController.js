"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStravaStatusHandler = exports.syncStravaActivitiesHandler = exports.stravaCallbackHandler = exports.getStravaAuthUrlHandler = void 0;
const stravaService_1 = require("../services/stravaService");
const prisma_1 = require("../utils/prisma");
/**
 * GET /api/strava/auth-url
 * Retorna URL de autorização do Strava
 */
const getStravaAuthUrlHandler = async (req, res) => {
    try {
        const authUrl = (0, stravaService_1.getStravaAuthUrl)();
        res.json({ authUrl });
    }
    catch (error) {
        console.error("Error generating Strava auth URL:", error);
        res.status(500).json({ error: "Failed to generate Strava auth URL" });
    }
};
exports.getStravaAuthUrlHandler = getStravaAuthUrlHandler;
/**
 * POST /api/strava/callback
 * Processa callback do OAuth do Strava
 */
const stravaCallbackHandler = async (req, res) => {
    try {
        const { code, userId } = req.body;
        if (!code || !userId) {
            return res.status(400).json({ error: "Code and userId are required" });
        }
        // Troca código por tokens
        const tokenData = await (0, stravaService_1.exchangeCodeForTokens)(code);
        // Salva ou atualiza tokens do usuário
        await prisma_1.prisma.user.update({
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
    }
    catch (error) {
        console.error("Error processing Strava callback:", error);
        res.status(500).json({ error: "Failed to process Strava callback" });
    }
};
exports.stravaCallbackHandler = stravaCallbackHandler;
/**
 * POST /api/strava/sync
 * Sincroniza atividades do Strava
 */
const syncStravaActivitiesHandler = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        // Busca dados do usuário
        const user = await prisma_1.prisma.user.findUnique({
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
            const newTokenData = await (0, stravaService_1.refreshStravaToken)(user.stravaRefreshToken);
            // Atualiza tokens no banco
            await prisma_1.prisma.user.update({
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
        const activities = await (0, stravaService_1.fetchStravaActivities)(accessToken, thirtyDaysAgo);
        // Converte e salva atividades
        const workouts = [];
        for (const activity of activities) {
            const workoutData = (0, stravaService_1.convertStravaActivityToWorkout)(activity);
            // Verifica se já existe
            const existingWorkout = await prisma_1.prisma.workout.findFirst({
                where: {
                    userId,
                    stravaId: workoutData.stravaId,
                },
            });
            if (!existingWorkout) {
                const workout = await prisma_1.prisma.workout.create({
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
    }
    catch (error) {
        console.error("Error syncing Strava activities:", error);
        res.status(500).json({ error: "Failed to sync Strava activities" });
    }
};
exports.syncStravaActivitiesHandler = syncStravaActivitiesHandler;
/**
 * GET /api/strava/status
 * Verifica status da conexão Strava do usuário
 */
const getStravaStatusHandler = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const user = await prisma_1.prisma.user.findUnique({
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
    }
    catch (error) {
        console.error("Error checking Strava status:", error);
        res.status(500).json({ error: "Failed to check Strava status" });
    }
};
exports.getStravaStatusHandler = getStravaStatusHandler;
//# sourceMappingURL=stravaController.js.map