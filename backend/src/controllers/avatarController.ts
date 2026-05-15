import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import fs from "fs";
import path from "path";

/**
 * POST /api/user/avatar
 * Upload de avatar do usuário (autenticado)
 */
export async function handleUploadAvatar(req: any, res: Response) {
  try {
    const userId = req.userId;

    if (!req.file) {
      return res.status(400).json({ error: "Nenhuma arquivo foi enviado" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    // Se usuário já tem avatar, deletar o antigo
    if (user.avatar) {
      const oldPath = path.join(__dirname, "../../public", user.avatar);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    const avatarUrl = `/public/avatars/${req.file.filename}`;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        planType: true,
      },
    });

    res.json({
      success: true,
      message: "Avatar enviado com sucesso",
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao fazer upload do avatar",
    });
  }
}

/**
 * DELETE /api/user/avatar
 * Remove o avatar do usuário (autenticado)
 */
export async function handleDeleteAvatar(req: any, res: Response) {
  try {
    const userId = req.userId;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    if (!user.avatar) {
      return res.status(400).json({ error: "Usuário não possui avatar" });
    }

    // Deletar arquivo
    const avatarPath = path.join(__dirname, "../../public", user.avatar);
    if (fs.existsSync(avatarPath)) {
      fs.unlinkSync(avatarPath);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatar: null },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        planType: true,
      },
    });

    res.json({
      success: true,
      message: "Avatar removido com sucesso",
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao remover avatar",
    });
  }
}
