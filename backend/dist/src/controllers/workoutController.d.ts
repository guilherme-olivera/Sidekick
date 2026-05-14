import { Request, Response } from "express";
/**
 * GET /api/workouts
 * Busca treinos do usuário
 */
export declare const getWorkoutsHandler: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * GET /api/workouts/:id
 * Busca um treino específico
 */
export declare const getWorkoutByIdHandler: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * POST /api/workouts/:id/analyze
 * Gera análise IA para um treino
 */
export declare const analyzeWorkoutHandler: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * POST /api/workouts
 * Cria um novo treino manual
 */
export declare const createWorkoutHandler: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * PUT /api/workouts/:id
 * Atualiza um treino
 */
export declare const updateWorkoutHandler: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * DELETE /api/workouts/:id
 * Remove um treino
 */
export declare const deleteWorkoutHandler: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=workoutController.d.ts.map