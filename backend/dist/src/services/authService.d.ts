/**
 * Registra novo usuário (mock)
 */
export declare function registerUser(email: string, password: string, name: string): Promise<{
    success: boolean;
    userId?: string;
    error?: string;
}>;
/**
 * Faz login de usuário e retorna JWT
 */
export declare function loginUser(email: string, password: string): Promise<{
    success: boolean;
    token?: string;
    user?: {
        id: string;
        email: string;
        name: string;
    };
    error?: string;
}>;
/**
 * Valida JWT token
 */
export declare function verifyToken(token: string): {
    valid: boolean;
    userId?: string;
    error?: string;
};
/**
 * Middleware para verificar autenticação
 */
export declare function authMiddleware(req: any, res: any, next: any): any;
//# sourceMappingURL=authService.d.ts.map