import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "../utils/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "sidekick-dev-secret-key-2026";

/**
 * Registra novo usuário
 */
export async function registerUser(
  email: string,
  password: string,
  name: string
): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    if (!email || !password || !name) {
      return { success: false, error: "Email, senha e nome são obrigatórios" };
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { success: false, error: "Este email já está registrado" };
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    console.log(`✅ Usuário registrado: ${email}`);
    return { success: true, userId: newUser.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao registrar",
    };
  }
}

/**
 * Faz login de usuário e retorna JWT
 */
export async function loginUser(
  email: string,
  password: string
): Promise<{
  success: boolean;
  token?: string;
  user?: { id: string; email: string; name: string };
  error?: string;
}> {
  try {
    if (!email || !password) {
      return { success: false, error: "Email e senha são obrigatórios" };
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      return {
        success: false,
        error: "Email ou senha inválidos",
      };
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return { success: false, error: "Email ou senha inválidos" };
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log(`✅ Login bem-sucedido: ${email}`);

    return {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || "",
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao fazer login",
    };
  }
}

/**
 * Valida JWT token
 */
export function verifyToken(
  token: string
): { valid: boolean; userId?: string; error?: string } {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
    };
    return { valid: true, userId: decoded.userId };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Token inválido",
    };
  }
}

/**
 * Middleware para verificar autenticação
 */
export function authMiddleware(req: any, res: any, next: any) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Token não fornecido" });
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
    };
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
  } catch (error) {
    res.status(401).json({
      error: error instanceof Error ? error.message : "Erro de autenticação",
    });
  }
}
