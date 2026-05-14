"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleRegister = handleRegister;
exports.handleLogin = handleLogin;
exports.handleGetMe = handleGetMe;
const authService_1 = require("../services/authService");
/**
 * POST /api/auth/register
 * Registra novo usuário
 */
async function handleRegister(req, res) {
    try {
        const { email, password, name } = req.body;
        const result = await (0, authService_1.registerUser)(email, password, name);
        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }
        res.status(201).json({
            success: true,
            message: "Usuário registrado com sucesso",
            userId: result.userId,
        });
    }
    catch (error) {
        res.status(500).json({
            error: error instanceof Error ? error.message : "Erro ao registrar",
        });
    }
}
/**
 * POST /api/auth/login
 * Faz login do usuário
 */
async function handleLogin(req, res) {
    try {
        const { email, password } = req.body;
        const result = await (0, authService_1.loginUser)(email, password);
        if (!result.success) {
            return res.status(401).json({ error: result.error });
        }
        res.json({
            success: true,
            token: result.token,
            user: result.user,
        });
    }
    catch (error) {
        res.status(500).json({
            error: error instanceof Error ? error.message : "Erro ao fazer login",
        });
    }
}
/**
 * GET /api/auth/me
 * Retorna dados do usuário autenticado (protegido)
 */
async function handleGetMe(req, res) {
    try {
        // req.userId é adicionado pelo authMiddleware
        res.json({
            success: true,
            userId: req.userId,
            message: "Autenticado com sucesso",
        });
    }
    catch (error) {
        res.status(500).json({
            error: error instanceof Error ? error.message : "Erro ao buscar usuário",
        });
    }
}
//# sourceMappingURL=authController.js.map