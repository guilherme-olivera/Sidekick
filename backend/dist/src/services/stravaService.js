"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStravaAuthUrl = getStravaAuthUrl;
exports.exchangeCodeForTokens = exchangeCodeForTokens;
exports.fetchStravaActivities = fetchStravaActivities;
exports.convertStravaActivityToWorkout = convertStravaActivityToWorkout;
exports.refreshStravaToken = refreshStravaToken;
const axios_1 = __importDefault(require("axios"));
const STRAVA_BASE_URL = "https://www.strava.com/api/v3";
const STRAVA_OAUTH_URL = "https://www.strava.com/oauth/authorize";
/**
 * Gera URL de autorização do Strava
 */
function getStravaAuthUrl() {
    const clientId = process.env.STRAVA_CLIENT_ID || "your-strava-client-id";
    const redirectUri = encodeURIComponent(process.env.STRAVA_REDIRECT_URI || "sidekick://strava/callback");
    return `${STRAVA_OAUTH_URL}?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=read,activity:read&approval_prompt=force`;
}
/**
 * Troca código de autorização por tokens
 */
async function exchangeCodeForTokens(code) {
    try {
        const clientId = process.env.STRAVA_CLIENT_ID;
        const clientSecret = process.env.STRAVA_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
            throw new Error("STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET must be configured");
        }
        const response = await axios_1.default.post("https://www.strava.com/oauth/token", {
            client_id: clientId,
            client_secret: clientSecret,
            code,
            grant_type: "authorization_code",
        });
        return response.data;
    }
    catch (error) {
        console.error("Strava token exchange error:", error);
        throw new Error("Failed to exchange Strava authorization code");
    }
}
/**
 * Busca atividades do Strava
 */
async function fetchStravaActivities(accessToken, after // timestamp
) {
    try {
        const params = {
            per_page: 30, // máximo 200
        };
        if (after) {
            params.after = after;
        }
        const response = await axios_1.default.get(`${STRAVA_BASE_URL}/athlete/activities`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            params,
        });
        return response.data;
    }
    catch (error) {
        console.error("Strava activities fetch error:", error);
        throw new Error("Failed to fetch Strava activities");
    }
}
/**
 * Converte atividade do Strava para formato interno
 */
function convertStravaActivityToWorkout(stravaActivity) {
    // Map Strava activity types to our types
    const typeMapping = {
        Run: "run",
        Ride: "cycling",
        VirtualRide: "cycling",
        Workout: "strength",
        WeightTraining: "strength",
    };
    // Determine intensity based on workout_type or average speed
    let intensity = "moderate";
    if (stravaActivity.type === "Run") {
        // For running, use pace (faster = higher intensity)
        const pace = stravaActivity.average_speed; // m/s
        const paceMinKm = 16.666 / pace; // min/km
        if (paceMinKm < 4.5)
            intensity = "high"; // Very fast
        else if (paceMinKm < 5.5)
            intensity = "moderate";
        else
            intensity = "low";
    }
    else if (stravaActivity.type === "Ride") {
        // For cycling, use speed
        const speed = stravaActivity.average_speed * 3.6; // km/h
        if (speed > 30)
            intensity = "high";
        else if (speed > 20)
            intensity = "moderate";
        else
            intensity = "low";
    }
    return {
        stravaId: stravaActivity.id.toString(),
        title: stravaActivity.name,
        type: typeMapping[stravaActivity.type] || "run",
        date: new Date(stravaActivity.start_date),
        duration: stravaActivity.elapsed_time,
        distance: Math.round((stravaActivity.distance / 1000) * 100) / 100, // km with 2 decimals
        pace: Math.round((stravaActivity.average_speed * 3.6) * 100) / 100, // km/h with 2 decimals
        avgHeartRate: stravaActivity.average_heartrate ? Math.round(stravaActivity.average_heartrate) : undefined,
        maxHeartRate: stravaActivity.max_heartrate ? Math.round(stravaActivity.max_heartrate) : undefined,
        intensity,
    };
}
/**
 * Atualiza token de acesso usando refresh token
 */
async function refreshStravaToken(refreshToken) {
    try {
        const clientId = process.env.STRAVA_CLIENT_ID;
        const clientSecret = process.env.STRAVA_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
            throw new Error("STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET must be configured");
        }
        const response = await axios_1.default.post("https://www.strava.com/oauth/token", {
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
        });
        return response.data;
    }
    catch (error) {
        console.error("Strava token refresh error:", error);
        throw new Error("Failed to refresh Strava token");
    }
}
//# sourceMappingURL=stravaService.js.map