import axios from "axios";
import jwt from "jsonwebtoken";

const STRAVA_BASE_URL = "https://www.strava.com/api/v3";
const STRAVA_OAUTH_URL = "https://www.strava.com/oauth/authorize";

const STRAVA_REDIRECT_URI =
  process.env.STRAVA_REDIRECT_URI ||
  `${process.env.SERVER_URL || "http://192.168.15.11:3000"}/api/strava/callback`;
const STRAVA_SCOPE = process.env.STRAVA_SCOPE || "activity:read_all";
const STRAVA_STATE_SECRET = process.env.JWT_SECRET || "sidekick-dev-secret-key-2026";

interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete: {
    id: number;
    username: string;
    firstname: string;
    lastname: string;
    profile: string;
  };
}

interface StravaActivity {
  id: number;
  name: string;
  type: string;
  start_date: string;
  elapsed_time: number; // seconds
  distance: number; // meters
  average_speed: number; // m/s
  average_heartrate?: number;
  max_heartrate?: number;
  workout_type?: number;
  average_cadence?: number;
  average_watts?: number;
  total_elevation_gain?: number;
  moving_time?: number;
  average_temp?: number;
  suffer_score?: number;
  splits_metric?: Array<{
    distance: number;
    elapsed_time: number;
    elevation_difference: number;
    moving_time: number;
    split: number;
    average_speed: number;
    average_heartrate?: number;
  }>;
}

/**
 * Gera URL de autorização do Strava
 */
export function createStravaState(userId: string): string {
  return jwt.sign({ userId }, STRAVA_STATE_SECRET, {
    expiresIn: "15m",
  });
}

export function verifyStravaState(state: string): { valid: boolean; userId?: string; error?: string } {
  try {
    const decoded = jwt.verify(state, STRAVA_STATE_SECRET) as { userId: string };
    return { valid: true, userId: decoded.userId };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Invalid state",
    };
  }
}

export function getStravaAuthUrl(userId: string): string {
  const clientId = process.env.STRAVA_CLIENT_ID || "your-strava-client-id";
  const redirectUri = encodeURIComponent(STRAVA_REDIRECT_URI);
  const state = encodeURIComponent(createStravaState(userId));
  const authUrl = `${STRAVA_OAUTH_URL}?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=${encodeURIComponent(
    STRAVA_SCOPE
  )}&approval_prompt=force&state=${state}`;

  console.log('[StravaService] getStravaAuthUrl', {
    clientId,
    redirectUri: STRAVA_REDIRECT_URI,
    scope: STRAVA_SCOPE,
    authUrl,
  });

  return authUrl;
}

/**
 * Troca código de autorização por tokens
 */
export async function exchangeCodeForTokens(
  code: string
): Promise<StravaTokenResponse> {
  try {
    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET must be configured");
    }

    const startTime = Date.now();
    const response = await axios.post<StravaTokenResponse>(
      "https://www.strava.com/oauth/token",
      {
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
      }
    );
    const duration = Date.now() - startTime;
    console.log(`[STRAVA] ⚡ exchangeCodeForTokens resolved in ${duration}ms`);

    return response.data;
  } catch (error) {
    console.error("[STRAVA] ❌ Token exchange error:", error);
    throw new Error("Failed to exchange Strava authorization code");
  }
}

/**
 * Busca atividades do Strava
 */
export async function fetchStravaActivities(
  accessToken: string,
  after?: number // timestamp
): Promise<StravaActivity[]> {
  try {
    const params: any = {
      per_page: 30, // máximo 200
    };

    if (after) {
      params.after = after;
    }

    const startTime = Date.now();
    const response = await axios.get<StravaActivity[]>(
      `${STRAVA_BASE_URL}/athlete/activities`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params,
      }
    );
    const duration = Date.now() - startTime;
    console.log(`[STRAVA] ⚡ fetchStravaActivities resolved in ${duration}ms`);

    return response.data;
  } catch (error) {
    console.error("[STRAVA] ❌ Activities fetch error:", error);
    throw new Error("Failed to fetch Strava activities");
  }
}

/**
 * Converte atividade do Strava para formato interno
 */
export function convertStravaActivityToWorkout(stravaActivity: StravaActivity) {
  // Map Strava activity types to our types
  const typeMapping: { [key: string]: "run" | "cycling" | "strength" } = {
    Run: "run",
    Ride: "cycling",
    VirtualRide: "cycling",
    Workout: "strength",
    WeightTraining: "strength",
  };

  // Determine intensity based on workout_type or average speed
  let intensity: "low" | "moderate" | "high" = "moderate";

  if (stravaActivity.type === "Run") {
    // For running, use pace (faster = higher intensity)
    const pace = stravaActivity.average_speed; // m/s
    const paceMinKm = 16.666 / pace; // min/km

    if (paceMinKm < 4.5) intensity = "high"; // Very fast
    else if (paceMinKm < 5.5) intensity = "moderate";
    else intensity = "low";
  } else if (stravaActivity.type === "Ride") {
    // For cycling, use speed
    const speed = stravaActivity.average_speed * 3.6; // km/h

    if (speed > 30) intensity = "high";
    else if (speed > 20) intensity = "moderate";
    else intensity = "low";
  }

  const mappedType = typeMapping[stravaActivity.type] || "run";

  let averageCadence = stravaActivity.average_cadence ? Math.round(stravaActivity.average_cadence) : undefined;
  if (averageCadence && mappedType === "run") {
    averageCadence = averageCadence * 2;
  }

  return {
    stravaId: stravaActivity.id.toString(),
    title: stravaActivity.name,
    type: mappedType,
    date: new Date(stravaActivity.start_date),
    duration: stravaActivity.elapsed_time,
    distance: Math.round((stravaActivity.distance / 1000) * 100) / 100, // km with 2 decimals
    pace: Math.round((stravaActivity.average_speed * 3.6) * 100) / 100, // km/h with 2 decimals
    avgHeartRate: stravaActivity.average_heartrate ? Math.round(stravaActivity.average_heartrate) : undefined,
    maxHeartRate: stravaActivity.max_heartrate ? Math.round(stravaActivity.max_heartrate) : undefined,
    intensity,
    averageCadence,
    elevationGain: stravaActivity.total_elevation_gain ? Math.round(stravaActivity.total_elevation_gain) : undefined,
    averageWatts: stravaActivity.average_watts ? Math.round(stravaActivity.average_watts) : undefined,
    movingTime: stravaActivity.moving_time || undefined,
    elapsedTime: stravaActivity.elapsed_time || undefined,
    temperature: stravaActivity.average_temp || undefined,
    sufferScore: stravaActivity.suffer_score || undefined,
    splits: stravaActivity.splits_metric ? JSON.stringify(stravaActivity.splits_metric) : undefined,
  };
}

/**
 * Atualiza token de acesso usando refresh token
 */
export async function refreshStravaToken(refreshToken: string): Promise<StravaTokenResponse> {
  try {
    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET must be configured");
    }

    const startTime = Date.now();
    const response = await axios.post<StravaTokenResponse>(
      "https://www.strava.com/oauth/token",
      {
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }
    );
    const duration = Date.now() - startTime;
    console.log(`[STRAVA] ⚡ refreshStravaToken resolved in ${duration}ms`);

    return response.data;
  } catch (error) {
    console.error("[STRAVA] ❌ Token refresh error:", error);
    throw new Error("Failed to refresh Strava token");
  }
}

export async function fetchStravaStats(accessToken: string, stravaId: string): Promise<any> {
  try {
    const startTime = Date.now();
    const response = await axios.get(
      `${STRAVA_BASE_URL}/athletes/${stravaId}/stats`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    const duration = Date.now() - startTime;
    console.log(`[STRAVA] ⚡ fetchStravaStats resolved in ${duration}ms`);

    return response.data;
  } catch (error) {
    console.error("[STRAVA] ❌ Stats fetch error:", error);
    throw new Error("Failed to fetch Strava athlete stats");
  }
}
