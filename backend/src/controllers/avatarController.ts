import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import fs from "fs";
import path from "path";

/**
 * POST /api/user/avatar
 * Upload de avatar do usuário (autenticado)
 * Converte a imagem para Base64 Data URI e salva diretamente no PostgreSQL
 * para sobreviver a reinicializações/redeploys em disco efêmero (ex: Render).
 */
export async function handleUploadAvatar(req: any, res: Response) {
  try {
    const userId = req.userId;

    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo foi enviado" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    // Lê os bytes do arquivo enviado e converte em Data URI Base64
    const fileBuffer = fs.readFileSync(req.file.path);
    const mimeType = req.file.mimetype || "image/jpeg";
    const avatarDataUri = `data:${mimeType};base64,${fileBuffer.toString("base64")}`;

    // Remove o arquivo temporário do disco local
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    // Se o avatar antigo era um arquivo legado em /public/avatars, limpa do disco
    if (user.avatar && user.avatar.startsWith("/public/")) {
      const oldPath = path.join(process.cwd(), user.avatar);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarDataUri },
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
      error:
        error instanceof Error
          ? error.message
          : "Erro ao fazer upload do avatar",
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

    if (user.avatar.startsWith("/public/")) {
      const avatarPath = path.join(process.cwd(), user.avatar);
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
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
      error:
        error instanceof Error ? error.message : "Erro ao remover avatar",
    });
  }
}
