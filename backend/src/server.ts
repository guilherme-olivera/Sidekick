import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { prisma, ensureDatabaseSchema } from "./utils/prisma";
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
  getUserAnalyticsHandler,
  savePushTokenHandler,
  broadcastNotificationHandler,
  getNotificationsHandler,
  markNotificationsReadHandler,
  deleteAccountHandler,
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
import {
  grantRevokePremiumHandler,
  generateVipCodeHandler,
  getAdminOverviewHandler,
  redeemVipCodeHandler,
} from "./controllers/adminController";
import { authMiddleware } from "./services/authService";
import { chatHandler } from "./controllers/chatController";
import { uploadAvatar } from "./middleware/uploadMiddleware";
import { handleDiagnosticsTest } from "./controllers/diagnosticsController";
import { createRateLimiter } from "./middleware/rateLimitMiddleware";
import { checkIsAdminUser, EXPLICIT_ADMIN_EMAILS } from "./utils/adminAuth";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const PUBLIC_URL =
  process.env.SERVER_URL || `http://${process.env.HOST || "localhost"}:${PORT}`;

// Rate Limiters para proteção contra força bruta
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 25,
  keyPrefix: "auth",
  message:
    "Muitas tentativas de autenticação. Por favor, aguarde alguns minutos e tente novamente.",
});

const recoveryLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 8,
  keyPrefix: "recovery",
  message:
    "Muitas solicitações de recuperação de senha. Aguarde 15 minutos antes de tentar novamente.",
});

const vipRedeemLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyPrefix: "vip_redeem",
  message:
    "Muitas tentativas de resgate de código VIP. Aguarde alguns minutos.",
});

// Middleware
app.use(express.json({ limit: "2mb" }));
app.use(cors());

// Servir arquivos estáticos (avatares legados, etc)
app.use("/public", express.static(path.join(process.cwd(), "public")));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ===== AUTHENTICATION ROUTES =====
app.post("/api/auth/register", authLimiter, handleRegister);
app.post("/api/auth/login", authLimiter, handleLogin);
app.get("/api/auth/me", authMiddleware, handleGetMe);
app.post("/api/auth/forgot-password", recoveryLimiter, handleForgotPassword);
app.post("/api/auth/reset-password", recoveryLimiter, handleResetPassword);

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

// ===== USER PROFILE & ACCOUNT ROUTES =====
app.get("/api/user/profile", authMiddleware, getUserProfileHandler);
app.put("/api/user/profile", authMiddleware, updateUserProfileHandler);
app.post(
  "/api/user/avatar",
  authMiddleware,
  uploadAvatar.single("avatar"),
  handleUploadAvatar
);
app.delete("/api/user/avatar", authMiddleware, handleDeleteAvatar);
app.get("/api/user/usage", authMiddleware, getUserUsageHandler);
app.post("/api/user/mood", authMiddleware, handleSaveMood);
app.get("/api/user/mood/today", authMiddleware, handleGetTodayMood);
app.get(
  "/api/user/history-analysis",
  authMiddleware,
  getUserHistoryAnalysisCachedHandler
);
app.get("/api/user/analytics", authMiddleware, getUserAnalyticsHandler);
app.post("/api/user/push-token", authMiddleware, savePushTokenHandler);
app.get("/api/user/notifications", authMiddleware, getNotificationsHandler);
app.post(
  "/api/user/notifications/read",
  authMiddleware,
  markNotificationsReadHandler
);
app.delete("/api/user/account", authMiddleware, deleteAccountHandler);

// ===== ADMIN & VIP PREMIUM ROUTES =====
app.post(
  "/api/admin/broadcast-notification",
  authMiddleware,
  broadcastNotificationHandler
);
app.post("/api/admin/user/premium", authMiddleware, grantRevokePremiumHandler);
app.post(
  "/api/admin/vip-code/generate",
  authMiddleware,
  generateVipCodeHandler
);
app.get("/api/admin/vip-overview", authMiddleware, getAdminOverviewHandler);
app.post(
  "/api/user/redeem-vip",
  authMiddleware,
  vipRedeemLimiter,
  redeemVipCodeHandler
);

app.post(
  "/api/user/history-analysis",
  authMiddleware,
  getUserHistoryAnalysisHandler
);
app.get("/api/diagnostics/test", authMiddleware, handleDiagnosticsTest);

// ===== ACHIEVEMENTS ROUTES =====
app.get("/api/user/achievements", authMiddleware, getUserAchievementsHandler);
app.get(
  "/api/user/achievements/new",
  authMiddleware,
  getNewAchievementsHandler
);
app.post(
  "/api/user/achievements/clear-new",
  authMiddleware,
  clearNewAchievementsHandler
);

// ===== WORKOUT ROUTES =====
app.get("/api/workouts", authMiddleware, getWorkoutsHandler);
app.get("/api/workouts/:id", authMiddleware, getWorkoutByIdHandler);
app.post("/api/workouts/:id/analyze", authMiddleware, analyzeWorkoutHandler);
app.post("/api/workouts", authMiddleware, createWorkoutHandler);
app.put("/api/workouts/:id", authMiddleware, updateWorkoutHandler);
app.delete("/api/workouts/:id", authMiddleware, deleteWorkoutHandler);

// AI Test endpoint - protegido para administradores
app.post("/api/test/ai-analysis", authMiddleware, async (req: any, res) => {
  try {
    const isAdmin = await checkIsAdminUser(req.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Acesso restrito a administradores." });
    }

    const { workout } = req.body;

    if (!workout) {
      return res.status(400).json({ error: "Workout data is required" });
    }

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

// Garante apenas as contas explícitas de administrador no startup (sem correspondência parcial de substring)
async function ensureAdminUser() {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || "adm@adm.com")
      .trim()
      .toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || "Adm@2026";

    const existing = await prisma.user.findUnique({
      where: { email: adminEmail },
    });
    if (!existing) {
      const hashed = bcrypt.hashSync(adminPassword, 10);
      await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashed,
          name: "Administrator",
          isAdmin: true,
          planType: "premium",
        },
      });
      console.log(`🔐 Admin user created: ${adminEmail}`);
    }

    await prisma.user.updateMany({
      where: {
        email: { in: EXPLICIT_ADMIN_EMAILS },
      },
      data: { isAdmin: true, planType: "premium" },
    });
    console.log(`🔐 Permissões explícitas de Admin verificadas com sucesso.`);
  } catch (err) {
    console.error("Error ensuring admin user:", err);
  }
}

async function start() {
  await ensureDatabaseSchema();
  await ensureAdminUser();

  app.listen(PORT, HOST as any, () => {
    console.log(`🚀 Sidekick Backend running on ${PUBLIC_URL}`);
    console.log(`🧠 IA powered by Gemini`);
    console.log(`💾 Database: PostgreSQL`);
    console.log(`🔐 Auth: JWT & Rate Limiting Active`);
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
