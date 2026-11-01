import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// 1. Configura a conexão bruta
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 2. Cria o adaptador V7
const adapter = new PrismaPg(pool);

// 3. Instância global para evitar warnings do ts-node-dev
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "production"
        ? ["warn", "error"]
        : ["query", "info", "warn", "error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

let isSchemaEnsured = false;

/**
 * Garante de forma idempotente que a tabela app_notifications e os novos índices compostos
 * existam no PostgreSQL (mesmo que o Supabase estivesse em repouso durante o boot inicial).
 */
export async function ensureDatabaseSchema(): Promise<void> {
  if (isSchemaEnsured) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "app_notifications" (
        "id" TEXT NOT NULL,
        "userId" TEXT,
        "targetPlan" TEXT NOT NULL DEFAULT 'all',
        "title" TEXT NOT NULL,
        "body" TEXT NOT NULL,
        "icon" TEXT NOT NULL DEFAULT '🔔',
        "type" TEXT NOT NULL DEFAULT 'broadcast',
        "isRead" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "app_notifications_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "app_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "app_notifications_userId_createdAt_idx" ON "app_notifications"("userId", "createdAt" DESC);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "app_notifications_targetPlan_createdAt_idx" ON "app_notifications"("targetPlan", "createdAt" DESC);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "workouts_userId_date_idx" ON "workouts"("userId", "date" DESC);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "calendar_events_userId_date_idx" ON "calendar_events"("userId", "date" DESC);
    `);
    isSchemaEnsured = true;
    console.log(
      "💾 Schema incremental (app_notifications + índices) verificado com sucesso."
    );
  } catch (err) {
    console.warn("Schema auto-sync warning:", err);
  }
}
