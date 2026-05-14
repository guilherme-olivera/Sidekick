"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = exports.app = void 0;
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const { PrismaClient } = require("@prisma/client");
const authController_1 = require("./controllers/authController");
const stravaController_1 = require("./controllers/stravaController");
const workoutController_1 = require("./controllers/workoutController");
const authService_1 = require("./services/authService");
// Initialize Prisma Client
const prisma = new PrismaClient();
exports.prisma = prisma;
const app = (0, express_1.default)();
exports.app = app;
const PORT = process.env.PORT || 3000;
// Middleware
app.use(express_1.default.json());
app.use((0, cors_1.default)());
// Health check endpoint
app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});
// ===== AUTHENTICATION ROUTES =====
app.post("/api/auth/register", authController_1.handleRegister);
app.post("/api/auth/login", authController_1.handleLogin);
app.get("/api/auth/me", authService_1.authMiddleware, authController_1.handleGetMe);
// ===== STRAVA INTEGRATION ROUTES =====
app.get("/api/strava/auth-url", stravaController_1.getStravaAuthUrlHandler);
app.post("/api/strava/callback", stravaController_1.stravaCallbackHandler);
app.post("/api/strava/sync", authService_1.authMiddleware, stravaController_1.syncStravaActivitiesHandler);
app.get("/api/strava/status", authService_1.authMiddleware, stravaController_1.getStravaStatusHandler);
// ===== WORKOUT ROUTES =====
app.get("/api/workouts", authService_1.authMiddleware, workoutController_1.getWorkoutsHandler);
app.get("/api/workouts/:id", authService_1.authMiddleware, workoutController_1.getWorkoutByIdHandler);
app.post("/api/workouts/:id/analyze", authService_1.authMiddleware, workoutController_1.analyzeWorkoutHandler);
app.post("/api/workouts", authService_1.authMiddleware, workoutController_1.createWorkoutHandler);
app.put("/api/workouts/:id", authService_1.authMiddleware, workoutController_1.updateWorkoutHandler);
app.delete("/api/workouts/:id", authService_1.authMiddleware, workoutController_1.deleteWorkoutHandler);
// AI Test endpoint - simulates receiving a workout and returning IA narrative
app.post("/api/test/ai-analysis", async (req, res) => {
    try {
        const { workout } = req.body;
        if (!workout) {
            return res.status(400).json({ error: "Workout data is required" });
        }
        // Call Gemini service
        const { analyzeWorkoutWithGemini } = await Promise.resolve().then(() => __importStar(require("./services/geminiService")));
        const narrative = await analyzeWorkoutWithGemini(workout);
        res.json({
            success: true,
            narrative,
            receivedWorkout: workout,
        });
    }
    catch (error) {
        console.error("AI Analysis Error:", error);
        res.status(500).json({
            error: "Failed to analyze workout",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
// Start server
app.listen(PORT, () => {
    console.log(`🚀 Sidekick Backend running on http://localhost:${PORT}`);
    console.log(`🧠 IA powered by Gemini 1.5 Flash`);
    console.log(`💾 Database: PostgreSQL`);
    console.log(`🔐 Auth: JWT (Mock mode)`);
});
// Graceful shutdown
process.on("SIGINT", async () => {
    console.log("\n📴 Shutting down gracefully...");
    await prisma.$disconnect();
    process.exit(0);
});
//# sourceMappingURL=server.js.map