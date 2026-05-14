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
    elapsed_time: number;
    distance: number;
    average_speed: number;
    average_heartrate?: number;
    max_heartrate?: number;
    workout_type?: number;
}
/**
 * Gera URL de autorização do Strava
 */
export declare function getStravaAuthUrl(): string;
/**
 * Troca código de autorização por tokens
 */
export declare function exchangeCodeForTokens(code: string): Promise<StravaTokenResponse>;
/**
 * Busca atividades do Strava
 */
export declare function fetchStravaActivities(accessToken: string, after?: number): Promise<StravaActivity[]>;
/**
 * Converte atividade do Strava para formato interno
 */
export declare function convertStravaActivityToWorkout(stravaActivity: StravaActivity): {
    stravaId: string;
    title: string;
    type: "run" | "cycling" | "strength";
    date: Date;
    duration: number;
    distance: number;
    pace: number;
    avgHeartRate: number | undefined;
    maxHeartRate: number | undefined;
    intensity: "low" | "moderate" | "high";
};
/**
 * Atualiza token de acesso usando refresh token
 */
export declare function refreshStravaToken(refreshToken: string): Promise<StravaTokenResponse>;
export {};
//# sourceMappingURL=stravaService.d.ts.map