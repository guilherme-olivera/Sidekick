"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = registerUser;
exports.loginUser = loginUser;
exports.verifyToken = verifyToken;
exports.authMiddleware = authMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const JWT_SECRET = process.env.JWT_SECRET || "sidekick-dev-secret-key-2026";
const mockUsers = [
    {
        id: "user-001",
        email: "athlete@sidekick.com",
        password: bcryptjs_1.default.hashSync("password123", 10),
        name: "João Atleta",
    },
];
/**
 * Registra novo usuário (mock)
 */
async function registerUser(email, password, name) {
    try {
        // Validações
        if (!email || !password || !name) {
            return { success: false, error: "Email, senha e nome são obrigatórios" };
        }
        // Verifica se usuário já existe
        const existingUser = mockUsers.find((u) => u.email === email);
        if (existingUser) {
            return { success: false, error: "Este email já está registrado" };
        }
        // Cria novo usuário
        const newUser = {
            id: `user-${Date.now()}`,
            email,
            password: bcryptjs_1.default.hashSync(password, 10),
            name,
        };
        mockUsers.push(newUser);
        console.log(`✅ Usuário registrado: ${email}`);
        return { success: true, userId: newUser.id };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao registrar",
        };
    }
}
/**
 * Faz login de usuário e retorna JWT
 */
async function loginUser(email, password) {
    try {
        if (!email || !password) {
            return { success: false, error: "Email e senha são obrigatórios" };
        }
        // Procura usuário
        const user = mockUsers.find((u) => u.email === email);
        if (!user) {
            return {
                success: false,
                error: "Email ou senha inválidos",
            };
        }
        // Valida senha
        const validPassword = bcryptjs_1.default.compareSync(password, user.password);
        if (!validPassword) {
            return { success: false, error: "Email ou senha inválidos" };
        }
        // Gera JWT
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            email: user.email,
        }, JWT_SECRET, { expiresIn: "7d" });
        console.log(`✅ Login bem-sucedido: ${email}`);
        return {
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
        };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao fazer login",
        };
    }
}
/**
 * Valida JWT token
 */
function verifyToken(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        return { valid: true, userId: decoded.userId };
    }
    catch (error) {
        return {
            valid: false,
            error: error instanceof Error ? error.message : "Token inválido",
        };
    }
}
/**
 * Middleware para verificar autenticação
 */
function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: "Token não fornecido" });
        }
        const token = authHeader.replace("Bearer ", "");
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const { valid, userId, error } = verifyToken(token);
        if (!valid) {
            return res.status(401).json({ error: error || "Token inválido" });
        }
        req.userId = userId;
        req.user = {
            id: userId,
            email: decoded?.email || "",
            name: "",
        };
        next();
    }
    catch (error) {
        res.status(401).json({
            error: error instanceof Error ? error.message : "Erro de autenticação",
        });
    }
}
//# sourceMappingURL=authService.js.map