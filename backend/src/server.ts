import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { prisma } from "./utils/prisma";
import {
  handleLogin,
  handleRegister,
  handleGetMe,
} from "./controllers/authController";
import {
  getStravaAuthUrlHandler,
  stravaCallbackHandler,
  syncStravaActivitiesHandler,
  getStravaStatusHandler,
  disconnectStravaHandler,
} from "./controllers/stravaController";
import {
  getWorkoutsHandler,
  getWorkoutByIdHandler,
  analyzeWorkoutHandler,
  createWorkoutHandler,
  updateWorkoutHandler,
  deleteWorkoutHandler,
} from "./controllers/workoutController";
import {
  getUserProfileHandler,
  updateUserProfileHandler,
  updateUserAvatarHandler,
  getUserUsageHandler,
} from "./controllers/userController";
import {
  handleUploadAvatar,
  handleDeleteAvatar,
} from "./controllers/avatarController";
import { authMiddleware } from "./services/authService";
import { uploadAvatar } from "./middleware/uploadMiddleware";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Servir arquivos estáticos (avatares, etc)
app.use("/public", express.static(path.join(__dirname, "../public")));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ===== AUTHENTICATION ROUTES =====
app.post("/api/auth/register", handleRegister);
app.post("/api/auth/login", handleLogin);
app.get("/api/auth/me", authMiddleware, handleGetMe);

// ===== STRAVA INTEGRATION ROUTES =====
app.get("/api/strava/auth-url", getStravaAuthUrlHandler);
app.post("/api/strava/callback", authMiddleware, stravaCallbackHandler);
app.post("/api/strava/sync", authMiddleware, syncStravaActivitiesHandler);
app.post("/api/strava/disconnect", authMiddleware, disconnectStravaHandler);
app.get("/api/strava/status", authMiddleware, getStravaStatusHandler);

// ===== USER PROFILE ROUTES =====
app.get("/api/user/profile", authMiddleware, getUserProfileHandler);
app.put("/api/user/profile", authMiddleware, updateUserProfileHandler);
app.post("/api/user/avatar", authMiddleware, uploadAvatar.single("avatar"), handleUploadAvatar);
app.delete("/api/user/avatar", authMiddleware, handleDeleteAvatar);
app.get("/api/user/usage", authMiddleware, getUserUsageHandler);

// ===== WORKOUT ROUTES =====
app.get("/api/workouts", authMiddleware, getWorkoutsHandler);
app.get("/api/workouts/:id", authMiddleware, getWorkoutByIdHandler);
app.post("/api/workouts/:id/analyze", authMiddleware, analyzeWorkoutHandler);
app.post("/api/workouts", authMiddleware, createWorkoutHandler);
app.put("/api/workouts/:id", authMiddleware, updateWorkoutHandler);
app.delete("/api/workouts/:id", authMiddleware, deleteWorkoutHandler);

// AI Test endpoint - simulates receiving a workout and returning IA narrative
app.post("/api/test/ai-analysis", async (req, res) => {
  try {
    const { workout } = req.body;

    if (!workout) {
      return res.status(400).json({ error: "Workout data is required" });
    }

    // Call Gemini service
    const { analyzeWorkoutWithGemini } = await import(
      "./services/geminiService"
    );
    const narrative = await analyzeWorkoutWithGemini(workout);

    res.json({
      success: true,
      narrative,
      receivedWorkout: workout,
    });
  } catch (error) {
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
  console.log(`🧠 IA powered by Gemini`);
  console.log(`💾 Database: PostgreSQL`);
  console.log(`🔐 Auth: JWT (Mock mode)`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n📴 Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

export { app, prisma };
