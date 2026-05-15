import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { analyzeWorkoutWithGemini } from "../services/geminiService";
import { consumeAiAnalysisQuota } from "../services/usageService";

/**
 * GET /api/workouts
 * Busca treinos do usuário com filtro opcional por data
 * Query params: 
 *   - date: YYYY-MM-DD (filtra por data específica)
 *   - startDate: YYYY-MM-DD (início do intervalo)
 *   - endDate: YYYY-MM-DD (fim do intervalo)
 */
export const getWorkoutsHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { date, startDate, endDate } = req.query;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    let whereClause: any = { userId };

    if (date) {
      const targetDate = new Date(date as string);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      whereClause.date = {
        gte: targetDate,
        lt: nextDay,
      };
    } else if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) {
        whereClause.date.gte = new Date(startDate as string);
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setDate(end.getDate() + 1);
        whereClause.date.lt = end;
      }
    }

    const workouts = await prisma.workout.findMany({
      where: whereClause,
      orderBy: { date: "desc" },
      take: 50, // últimos 50 treinos
    });

    res.json({ success: true, workouts });
  } catch (error) {
    console.error("Error fetching workouts:", error);
    res.status(500).json({ error: "Failed to fetch workouts" });
  }
};

/**
 * GET /api/workouts/:id
 * Busca um treino específico
 */
export const getWorkoutByIdHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const workout = await prisma.workout.findFirst({
      where: {
        id: String(id),
        userId,
      },
    });

    if (!workout) {
      return res.status(404).json({ error: "Workout not found" });
    }

    res.json({ workout });
  } catch (error) {
    console.error("Error fetching workout:", error);
    res.status(500).json({ error: "Failed to fetch workout" });
  }
};

/**
 * POST /api/workouts/:id/analyze
 * Gera análise IA para um treino
 */
export const analyzeWorkoutHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { mood } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const workout = await prisma.workout.findFirst({
      where: {
        id: String(id),
        userId,
      },
      include: {
        user: {
          select: {
            planType: true,
          },
        },
      },
    });

    if (!workout) {
      return res.status(404).json({ error: "Workout not found" });
    }

    await consumeAiAnalysisQuota(userId, workout.user?.planType);

    // Gera análise com Gemini
    const narrative = await analyzeWorkoutWithGemini(workout, mood);

    // Atualiza o treino com a narrativa
    const updatedWorkout = await prisma.workout.update({
      where: { id: String(id) },
      data: { aiNarrative: narrative },
    });

    res.json({
      workout: updatedWorkout,
      narrative,
    });
  } catch (error) {
    console.error("Error analyzing workout:", error);
    res.status(500).json({ error: "Failed to analyze workout" });
  }
};

/**
 * POST /api/workouts
 * Cria um novo treino manual
 */
export const createWorkoutHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const workoutData = req.body;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const workout = await prisma.workout.create({
      data: {
        ...workoutData,
        userId,
      },
    });

    res.status(201).json({ workout });
  } catch (error) {
    console.error("Error creating workout:", error);
    res.status(500).json({ error: "Failed to create workout" });
  }
};

/**
 * PUT /api/workouts/:id
 * Atualiza um treino
 */
export const updateWorkoutHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const updateData = req.body;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const workout = await prisma.workout.findFirst({
      where: {
        id: String(id),
        userId,
      },
    });

    if (!workout) {
      return res.status(404).json({ error: "Workout not found" });
    }

    const updatedWorkout = await prisma.workout.update({
      where: { id: String(id) },
      data: updateData,
    });

    res.json({ workout: updatedWorkout });
  } catch (error) {
    console.error("Error updating workout:", error);
    res.status(500).json({ error: "Failed to update workout" });
  }
};

/**
 * DELETE /api/workouts/:id
 * Remove um treino
 */
export const deleteWorkoutHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const workout = await prisma.workout.findFirst({
      where: {
        id: String(id),
        userId,
      },
    });

    if (!workout) {
      return res.status(404).json({ error: "Workout not found" });
    }

    await prisma.workout.delete({
      where: { id:String(id) },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting workout:", error);
    res.status(500).json({ error: "Failed to delete workout" });
  }
};
