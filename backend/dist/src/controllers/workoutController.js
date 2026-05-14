"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteWorkoutHandler = exports.updateWorkoutHandler = exports.createWorkoutHandler = exports.analyzeWorkoutHandler = exports.getWorkoutByIdHandler = exports.getWorkoutsHandler = void 0;
const prisma_1 = require("../utils/prisma");
const geminiService_1 = require("../services/geminiService");
/**
 * GET /api/workouts
 * Busca treinos do usuário
 */
const getWorkoutsHandler = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const workouts = await prisma_1.prisma.workout.findMany({
            where: { userId },
            orderBy: { date: "desc" },
            take: 50, // últimos 50 treinos
        });
        res.json({ workouts });
    }
    catch (error) {
        console.error("Error fetching workouts:", error);
        res.status(500).json({ error: "Failed to fetch workouts" });
    }
};
exports.getWorkoutsHandler = getWorkoutsHandler;
/**
 * GET /api/workouts/:id
 * Busca um treino específico
 */
const getWorkoutByIdHandler = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        if (!userId) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const workout = await prisma_1.prisma.workout.findFirst({
            where: {
                id,
                userId,
            },
        });
        if (!workout) {
            return res.status(404).json({ error: "Workout not found" });
        }
        res.json({ workout });
    }
    catch (error) {
        console.error("Error fetching workout:", error);
        res.status(500).json({ error: "Failed to fetch workout" });
    }
};
exports.getWorkoutByIdHandler = getWorkoutByIdHandler;
/**
 * POST /api/workouts/:id/analyze
 * Gera análise IA para um treino
 */
const analyzeWorkoutHandler = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { mood } = req.body;
        if (!userId) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const workout = await prisma_1.prisma.workout.findFirst({
            where: {
                id,
                userId,
            },
        });
        if (!workout) {
            return res.status(404).json({ error: "Workout not found" });
        }
        // Gera análise com Gemini
        const narrative = await (0, geminiService_1.analyzeWorkoutWithGemini)(workout, mood);
        // Atualiza o treino com a narrativa
        const updatedWorkout = await prisma_1.prisma.workout.update({
            where: { id },
            data: { aiNarrative: narrative },
        });
        res.json({
            workout: updatedWorkout,
            narrative,
        });
    }
    catch (error) {
        console.error("Error analyzing workout:", error);
        res.status(500).json({ error: "Failed to analyze workout" });
    }
};
exports.analyzeWorkoutHandler = analyzeWorkoutHandler;
/**
 * POST /api/workouts
 * Cria um novo treino manual
 */
const createWorkoutHandler = async (req, res) => {
    try {
        const userId = req.userId;
        const workoutData = req.body;
        if (!userId) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const workout = await prisma_1.prisma.workout.create({
            data: {
                ...workoutData,
                userId,
            },
        });
        res.status(201).json({ workout });
    }
    catch (error) {
        console.error("Error creating workout:", error);
        res.status(500).json({ error: "Failed to create workout" });
    }
};
exports.createWorkoutHandler = createWorkoutHandler;
/**
 * PUT /api/workouts/:id
 * Atualiza um treino
 */
const updateWorkoutHandler = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const updateData = req.body;
        if (!userId) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const workout = await prisma_1.prisma.workout.findFirst({
            where: {
                id,
                userId,
            },
        });
        if (!workout) {
            return res.status(404).json({ error: "Workout not found" });
        }
        const updatedWorkout = await prisma_1.prisma.workout.update({
            where: { id },
            data: updateData,
        });
        res.json({ workout: updatedWorkout });
    }
    catch (error) {
        console.error("Error updating workout:", error);
        res.status(500).json({ error: "Failed to update workout" });
    }
};
exports.updateWorkoutHandler = updateWorkoutHandler;
/**
 * DELETE /api/workouts/:id
 * Remove um treino
 */
const deleteWorkoutHandler = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        if (!userId) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const workout = await prisma_1.prisma.workout.findFirst({
            where: {
                id,
                userId,
            },
        });
        if (!workout) {
            return res.status(404).json({ error: "Workout not found" });
        }
        await prisma_1.prisma.workout.delete({
            where: { id },
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error("Error deleting workout:", error);
        res.status(500).json({ error: "Failed to delete workout" });
    }
};
exports.deleteWorkoutHandler = deleteWorkoutHandler;
//# sourceMappingURL=workoutController.js.map