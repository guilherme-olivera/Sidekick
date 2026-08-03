import { Request, Response } from "express";
import { prisma } from "../utils/prisma";

export const getEventsHandler = async (req: any, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const events = await prisma.calendarEvent.findMany({
      where: { userId },
      orderBy: { date: "asc" },
    });

    return res.json({ success: true, events });
  } catch (error: any) {
    console.error("Error fetching calendar events:", error);
    return res.status(500).json({ error: "Erro interno ao buscar lembretes" });
  }
};

export const createEventHandler = async (req: any, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const { title, description, date, type } = req.body;

    if (!title || !date) {
      return res.status(400).json({ error: "Título e data são obrigatórios" });
    }

    const event = await prisma.calendarEvent.create({
      data: {
        userId,
        title,
        description: description || null,
        date: new Date(date),
        type: type || "reminder",
        completed: false,
      },
    });

    return res.status(201).json({ success: true, event });
  } catch (error: any) {
    console.error("Error creating calendar event:", error);
    return res.status(500).json({ error: "Erro interno ao criar lembrete" });
  }
};

export const updateEventHandler = async (req: any, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const { title, description, date, type, completed } = req.body;

    // Verify ownership
    const existing = await prisma.calendarEvent.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: "Lembrete não encontrado" });
    }

    if (existing.userId !== userId) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const updatedEvent = await prisma.calendarEvent.update({
      where: { id },
      data: {
        title: title !== undefined ? title : existing.title,
        description: description !== undefined ? description : existing.description,
        date: date !== undefined ? new Date(date) : existing.date,
        type: type !== undefined ? type : existing.type,
        completed: completed !== undefined ? completed : existing.completed,
      },
    });

    return res.json({ success: true, event: updatedEvent });
  } catch (error: any) {
    console.error("Error updating calendar event:", error);
    return res.status(500).json({ error: "Erro interno ao atualizar lembrete" });
  }
};

export const deleteEventHandler = async (req: any, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    // Verify ownership
    const existing = await prisma.calendarEvent.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: "Lembrete não encontrado" });
    }

    if (existing.userId !== userId) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    await prisma.calendarEvent.delete({
      where: { id },
    });

    return res.json({ success: true, message: "Lembrete deletado com sucesso" });
  } catch (error: any) {
    console.error("Error deleting calendar event:", error);
    return res.status(500).json({ error: "Erro interno ao deletar lembrete" });
  }
};
