import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { prisma } from "./utils/prisma";
import bcrypt from "bcryptjs";
import {
  handleLogin,
  handleRegister,
  handleGetMe,
  handleForgotPassword,
  handleResetPassword,
} from "./controllers/authController";
import {
  getEventsHandler,
  createEventHandler,
  updateEventHandler,
  deleteEventHandler,
} from "./controllers/eventController";
import {
  getStravaAuthUrlHandler,
  stravaCallbackHandler,
  syncStravaActivitiesHandler,
  getStravaStatusHandler,
  disconnectStravaHandler,
  getStravaStatsHandler,
} from "./controllers/stravaController";
import {
  getWorkoutsHandler,
  getWorkoutByIdHandler,
  analyzeWorkoutHandler,
  createWorkoutHandler,
  updateWorkoutHandler,
  deleteWorkoutHandler,
  getUserHistoryAnalysisHandler,
  getUserHistoryAnalysisCachedHandler,
} from "./controllers/workoutController";
import {
  getUserProfileHandler,
  updateUserProfileHandler,
  updateUserAvatarHandler,
  getUserUsageHandler,
  handleSaveMood,
  handleGetTodayMood,
} from "./controllers/userController";
import {
  handleUploadAvatar,
  handleDeleteAvatar,
} from "./controllers/avatarController";
import {
  getUserAchievementsHandler,
  getNewAchievementsHandler,
  clearNewAchievementsHandler,
} from "./controllers/achievementController";
import { authMiddleware } from "./services/authService";
import { chatHandler } from "./controllers/chatController";
import { uploadAvatar } from "./middleware/uploadMiddleware";
import { handleDiagnosticsTest } from "./controllers/diagnosticsController";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const PUBLIC_URL = process.env.SERVER_URL || `http://${process.env.HOST || 'localhost'}:${PORT}`;

// Middleware
app.use(express.json());
app.use(cors());

// Servir arquivos estáticos (avatares, etc)
app.use("/public", express.static(path.join(process.cwd(), "public")));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ===== AUTHENTICATION ROUTES =====
app.post("/api/auth/register", handleRegister);
app.post("/api/auth/login", handleLogin);
app.get("/api/auth/me", authMiddleware, handleGetMe);
app.post("/api/auth/forgot-password", handleForgotPassword);
app.post("/api/auth/reset-password", handleResetPassword);

// ===== STRAVA INTEGRATION ROUTES =====
app.get("/api/strava/auth-url", authMiddleware, getStravaAuthUrlHandler);
app.post("/api/strava/callback", authMiddleware, stravaCallbackHandler);
app.get("/api/strava/callback", stravaCallbackHandler);
app.post("/api/strava/sync", authMiddleware, syncStravaActivitiesHandler);
app.post("/api/strava/disconnect", authMiddleware, disconnectStravaHandler);
app.get("/api/strava/status", authMiddleware, getStravaStatusHandler);
app.get("/api/strava/stats", authMiddleware, getStravaStatsHandler);

// Serve public landing page
app.use(express.static(path.join(process.cwd(), "public/landing")));

app.get("/", async (req, res, next) => {
  if (req.query.code) {
    return stravaCallbackHandler(req, res);
  }
  next();
});

// ===== CHAT ROUTES =====
app.post("/api/chat", authMiddleware, chatHandler);

// ===== CALENDAR EVENT ROUTES =====
app.get("/api/events", authMiddleware, getEventsHandler);
app.post("/api/events", authMiddleware, createEventHandler);
app.put("/api/events/:id", authMiddleware, updateEventHandler);
app.delete("/api/events/:id", authMiddleware, deleteEventHandler);

// ===== USER PROFILE ROUTES =====
app.get("/api/user/profile", authMiddleware, getUserProfileHandler);
app.put("/api/user/profile", authMiddleware, updateUserProfileHandler);
app.post("/api/user/avatar", authMiddleware, uploadAvatar.single("avatar"), handleUploadAvatar);
app.delete("/api/user/avatar", authMiddleware, handleDeleteAvatar);
app.get("/api/user/usage", authMiddleware, getUserUsageHandler);
app.post("/api/user/mood", authMiddleware, handleSaveMood);
app.get("/api/user/mood/today", authMiddleware, handleGetTodayMood);
app.get("/api/user/history-analysis", authMiddleware, getUserHistoryAnalysisCachedHandler);
app.post("/api/user/history-analysis", authMiddleware, getUserHistoryAnalysisHandler);
app.get("/api/diagnostics/test", authMiddleware, handleDiagnosticsTest);

// ===== ACHIEVEMENTS ROUTES =====
app.get("/api/user/achievements", authMiddleware, getUserAchievementsHandler);
app.get("/api/user/achievements/new", authMiddleware, getNewAchievementsHandler);
app.post("/api/user/achievements/clear-new", authMiddleware, clearNewAchievementsHandler);

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

// Start server (bind to HOST so devices on LAN can reach it)
async function ensureAdminUser() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || "adm@adm.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "adm123";

    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!existing) {
      const hashed = bcrypt.hashSync(adminPassword, 10);
      await prisma.user.create({ data: { email: adminEmail, password: hashed, name: "Administrator" } });
      console.log(`🔐 Admin user created: ${adminEmail}`);
    } else {
      console.log(`🔐 Admin user exists: ${adminEmail}`);
    }
  } catch (err) {
    console.error("Error ensuring admin user:", err);
  }
}

async function start() {
  await ensureAdminUser();

  app.listen(PORT, HOST as any, () => {
    console.log(`🚀 Sidekick Backend running on ${PUBLIC_URL}`);
    console.log(`🧠 IA powered by Gemini`);
    console.log(`💾 Database: PostgreSQL`);
    console.log(`🔐 Auth: JWT (Mock mode)`);
  });
}

start();

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n📴 Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

export { app, prisma };
