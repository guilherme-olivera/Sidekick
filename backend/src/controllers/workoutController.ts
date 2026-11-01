import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import {
  analyzeWorkoutWithGemini,
  analyzeHistoryWithGemini,
} from "../services/geminiService";
import {
  assertAiAnalysisQuotaAvailable,
  commitAiAnalysisQuota,
} from "../services/usageService";

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
      take: 500, // últimos 500 treinos
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
    const { mood, effortRating, userNotes } = req.body;

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
            createdAt: true,
          },
        },
      },
    });

    if (!workout) {
      return res.status(404).json({ error: "Workout not found" });
    }

    // Valida disponibilidade de cota ANTES de chamar o Gemini
    await assertAiAnalysisQuotaAvailable(userId, workout.user?.planType);

    // Atualiza esforço e notas se fornecidos (com sanitização de tamanho)
    let updatedWorkoutData: any = {};
    if (effortRating !== undefined) {
      const ratingNum = Number(effortRating);
      if (!isNaN(ratingNum) && ratingNum >= 1 && ratingNum <= 10) {
        updatedWorkoutData.effortRating = ratingNum;
      }
    }
    if (userNotes !== undefined && typeof userNotes === "string") {
      updatedWorkoutData.userNotes = userNotes.trim().slice(0, 500);
    }

    let workoutToAnalyze = workout;
    if (Object.keys(updatedWorkoutData).length > 0) {
      workoutToAnalyze = await prisma.workout.update({
        where: { id: String(id) },
        data: updatedWorkoutData,
        include: {
          user: {
            select: {
              planType: true,
              createdAt: true,
            },
          },
        },
      });
    }

    // Busca o perfil completo do usuário
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    // Busca os treinos recentes (últimos 5 antes deste treino)
    const recentWorkouts = await prisma.workout.findMany({
      where: {
        userId,
        id: { not: String(id) },
        date: { lt: workoutToAnalyze.date },
      },
      orderBy: { date: "desc" },
      take: 5,
    });

    // Gera análise com Gemini, passando perfil e histórico
    const narrative = await analyzeWorkoutWithGemini(
      workoutToAnalyze,
      mood,
      userProfile,
      recentWorkouts
    );

    // Consome a cota SOMENTE após sucesso da geração
    await commitAiAnalysisQuota(userId, workoutToAnalyze.user?.planType);

    // Atualiza o treino com a narrativa
    const updatedWorkout = await prisma.workout.update({
      where: { id: String(id) },
      data: { aiNarrative: narrative },
    });

    res.json({
      workout: updatedWorkout,
      narrative,
    });
  } catch (error: any) {
    console.error("Error analyzing workout:", error);
    if (error?.code === "QUOTA_EXCEEDED" || error?.status === 429) {
      return res.status(429).json({
        error: error.message,
        code: "QUOTA_EXCEEDED",
      });
    }
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to analyze workout",
    });
  }
};

/**
 * POST /api/user/history-analysis
 * Gera ou atualiza relatório de progresso e gamificação histórica
 */
export const getUserHistoryAnalysisHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            planType: true,
          },
        },
      },
    });

    if (!userProfile) {
      return res.status(404).json({ error: "User profile not found" });
    }

    // Busca os últimos 250 treinos do usuário para análise histórica segura
    const allWorkouts = await prisma.workout.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 250,
    });

    if (allWorkouts.length === 0) {
      return res.status(400).json({
        error: "Nenhum treino encontrado para analisar a evolução histórica.",
      });
    }

    const lastUpdate = userProfile.historyAnalysisUpdatedAt;
    const hasExistingAnalysis = !!userProfile.historyAnalysis;

    if (lastUpdate && hasExistingAnalysis) {
      const now = new Date();
      const plan = (userProfile.user?.planType || "free").toLowerCase();

      if (plan === "premium") {
        const getWeekNumber = (d: Date) => {
          const date = new Date(d.getTime());
          date.setHours(0, 0, 0, 0);
          date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
          const week1 = new Date(date.getFullYear(), 0, 4);
          return (
            1 +
            Math.round(
              ((date.getTime() - week1.getTime()) / 86400000 -
                3 +
                ((week1.getDay() + 6) % 7)) /
                7
            )
          );
        };

        const isSameWeek =
          now.getFullYear() === lastUpdate.getFullYear() &&
          getWeekNumber(now) === getWeekNumber(lastUpdate);

        if (isSameWeek) {
          return res.status(403).json({
            error:
              "Os relatórios semanais para usuários Premium são atualizados automaticamente todo domingo à noite.",
            analysis: userProfile.historyAnalysis,
            updatedAt: lastUpdate,
          });
        }
      } else {
        const isSameMonth =
          now.getFullYear() === lastUpdate.getFullYear() &&
          now.getMonth() === lastUpdate.getMonth();

        if (isSameMonth) {
          return res.status(403).json({
            error:
              "Os relatórios mensais para contas Free são gerados automaticamente no dia 1º de cada mês.",
            analysis: userProfile.historyAnalysis,
            updatedAt: lastUpdate,
          });
        }
      }
    }

    await assertAiAnalysisQuotaAvailable(userId, userProfile.user?.planType);

    // Gera análise com Gemini
    const analysis = await analyzeHistoryWithGemini(userProfile, allWorkouts);

    await commitAiAnalysisQuota(userId, userProfile.user?.planType);

    // Salva no banco de dados
    const updatedProfile = await prisma.userProfile.update({
      where: { userId },
      data: {
        historyAnalysis: analysis,
        historyAnalysisUpdatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      analysis,
      updatedAt: updatedProfile.historyAnalysisUpdatedAt,
    });
  } catch (error: any) {
    console.error("Error generating history analysis:", error);
    if (error?.code === "QUOTA_EXCEEDED" || error?.status === 429) {
      return res.status(429).json({
        error: error.message,
        code: "QUOTA_EXCEEDED",
      });
    }
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to generate history analysis",
    });
  }
};

/**
 * GET /api/user/history-analysis
 * Busca o relatório de progresso cacheado do atleta
 */
export const getUserHistoryAnalysisCachedHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            planType: true,
          },
        },
      },
    });

    if (!userProfile) {
      return res.status(404).json({ error: "User profile not found" });
    }

    let needsUpdate = false;
    const lastUpdate = userProfile.historyAnalysisUpdatedAt;
    const hasExistingAnalysis = !!userProfile.historyAnalysis;

    if (lastUpdate && hasExistingAnalysis) {
      const now = new Date();
      const plan = (userProfile.user?.planType || "free").toLowerCase();

      if (plan === "premium") {
        const getWeekNumber = (d: Date) => {
          const date = new Date(d.getTime());
          date.setHours(0, 0, 0, 0);
          date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
          const week1 = new Date(date.getFullYear(), 0, 4);
          return (
            1 +
            Math.round(
              ((date.getTime() - week1.getTime()) / 86400000 -
                3 +
                ((week1.getDay() + 6) % 7)) /
                7
            )
          );
        };
        const isSameWeek =
          now.getFullYear() === lastUpdate.getFullYear() &&
          getWeekNumber(now) === getWeekNumber(lastUpdate);

        if (!isSameWeek) {
          needsUpdate = true;
        }
      } else {
        const isSameMonth =
          now.getFullYear() === lastUpdate.getFullYear() &&
          now.getMonth() === lastUpdate.getMonth();

        if (!isSameMonth) {
          needsUpdate = true;
        }
      }
    }

    if (needsUpdate) {
      console.log(
        `[Auto-Update History Analysis] Triggering update for user ${userId}`
      );
      const allWorkouts = await prisma.workout.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 250,
      });

      if (allWorkouts.length > 0) {
        try {
          await assertAiAnalysisQuotaAvailable(
            userId,
            userProfile.user?.planType
          );
          const analysis = await analyzeHistoryWithGemini(
            userProfile,
            allWorkouts
          );
          await commitAiAnalysisQuota(userId, userProfile.user?.planType);

          const updatedProfile = await prisma.userProfile.update({
            where: { userId },
            data: {
              historyAnalysis: analysis,
              historyAnalysisUpdatedAt: new Date(),
            },
          });

          return res.json({
            success: true,
            analysis: updatedProfile.historyAnalysis,
            updatedAt: updatedProfile.historyAnalysisUpdatedAt,
          });
        } catch (autoErr) {
          console.error("[Auto-Update History Analysis] failed:", autoErr);
        }
      }
    }

    res.json({
      success: true,
      analysis: userProfile.historyAnalysis,
      updatedAt: userProfile.historyAnalysisUpdatedAt,
    });
  } catch (error) {
    console.error("Error fetching history analysis cache:", error);
    res.status(500).json({ error: "Failed to fetch history analysis cache" });
  }
};

/**
 * POST /api/workouts
 * Cria um novo treino manual
 */
export const createWorkoutHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id: _ignoreId, userId: _ignoreUserId, user: _ignoreUser, ...workoutData } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (typeof workoutData.userNotes === "string") {
      workoutData.userNotes = workoutData.userNotes.trim().slice(0, 500);
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
    const { id: _ignoreId, userId: _ignoreUserId, user: _ignoreUser, ...updateData } = req.body;

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

    if (typeof updateData.userNotes === "string") {
      updateData.userNotes = updateData.userNotes.trim().slice(0, 500);
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
      where: { id: String(id) },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting workout:", error);
    res.status(500).json({ error: "Failed to delete workout" });
  }
};
