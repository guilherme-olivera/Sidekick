import { Request, Response } from "express";
/**
 * GET /api/strava/auth-url
 * Retorna URL de autorização do Strava
 */
export declare const getStravaAuthUrlHandler: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/strava/callback
 * Processa callback do OAuth do Strava
 */
export declare const stravaCallbackHandler: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * POST /api/strava/sync
 * Sincroniza atividades do Strava
 */
export declare const syncStravaActivitiesHandler: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * GET /api/strava/status
 * Verifica status da conexão Strava do usuário
 */
export declare const getStravaStatusHandler: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=stravaController.d.ts.map