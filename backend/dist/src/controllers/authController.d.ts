import { Request, Response } from "express";
/**
 * POST /api/auth/register
 * Registra novo usuário
 */
export declare function handleRegister(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * POST /api/auth/login
 * Faz login do usuário
 */
export declare function handleLogin(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * GET /api/auth/me
 * Retorna dados do usuário autenticado (protegido)
 */
export declare function handleGetMe(req: any, res: Response): Promise<void>;
//# sourceMappingURL=authController.d.ts.map