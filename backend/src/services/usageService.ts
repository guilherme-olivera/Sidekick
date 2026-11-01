import { prisma } from "../utils/prisma";

const FEATURE_AI_ANALYSIS = "AI_ANALYSIS";
const FREE_DAILY_LIMIT = Number(process.env.FREE_AI_DAILY_LIMIT || 5);

function getTodayPeriod() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export async function checkAndNormalizeUserPlan(userId: string, fallbackPlan = "free"): Promise<{
  planType: string;
  premiumUntil: Date | null;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { planType: true, premiumUntil: true },
  });

  let currentPlan = user?.planType || fallbackPlan;
  let currentUntil = user?.premiumUntil || null;

  if (currentPlan === "premium" && currentUntil) {
    if (new Date(currentUntil) < new Date()) {
      await prisma.user.update({
        where: { id: userId },
        data: { planType: "free", premiumUntil: null },
      });
      currentPlan = "free";
      currentUntil = null;
      console.log(`⏰ Assinatura Premium expirada para o usuário ${userId}. Downgrade para Free.`);
    }
  }

  return { planType: currentPlan, premiumUntil: currentUntil };
}

export async function getAiUsageStatus(userId: string, fallbackPlan = "free") {
  const { start, end } = getTodayPeriod();
  const { planType } = await checkAndNormalizeUserPlan(userId, fallbackPlan);

  if (planType === "premium") {
    return {
      feature: FEATURE_AI_ANALYSIS,
      isPremium: true,
      limit: 999999,
      used: 0,
      remaining: 999999,
      periodStart: start,
      periodEnd: end,
    };
  }

  const quota = await prisma.usageQuota.findFirst({
    where: {
      userId,
      feature: FEATURE_AI_ANALYSIS,
      periodStart: { gte: start },
    },
  });

  if (!quota) {
    return {
      feature: FEATURE_AI_ANALYSIS,
      isPremium: false,
      limit: FREE_DAILY_LIMIT,
      used: 0,
      remaining: FREE_DAILY_LIMIT,
      periodStart: start,
      periodEnd: end,
    };
  }

  return {
    feature: FEATURE_AI_ANALYSIS,
    isPremium: false,
    limit: quota.limit,
    used: quota.used,
    remaining: Math.max(0, quota.limit - quota.used),
    periodStart: quota.periodStart,
    periodEnd: quota.periodEnd,
  };
}

/**
 * Apenas verifica se o usuário possui cota disponível antes de chamar o Gemini,
 * sem descontar ainda (evita perder cota se a API externa falhar).
 */
export async function assertAiAnalysisQuotaAvailable(userId: string, planType = "free") {
  const { planType: currentPlan } = await checkAndNormalizeUserPlan(userId, planType);

  if (currentPlan === "premium") {
    return { isPremium: true, quotaId: null as string | null };
  }

  const { start, end } = getTodayPeriod();
  const limit = FREE_DAILY_LIMIT;

  let quota = await prisma.usageQuota.findFirst({
    where: {
      userId,
      feature: FEATURE_AI_ANALYSIS,
      periodStart: { gte: start },
    },
  });

  if (!quota) {
    quota = await prisma.usageQuota.create({
      data: {
        userId,
        feature: FEATURE_AI_ANALYSIS,
        used: 0,
        limit,
        periodStart: start,
        periodEnd: end,
      },
    });
  }

  if (quota.used >= quota.limit) {
    const err = new Error(
      "Você atingiu o limite gratuito de 5 interações de IA hoje. Ative o Sidekick Premium para liberar análises e conversas ilimitadas! 👑"
    ) as any;
    err.code = "QUOTA_EXCEEDED";
    err.status = 429;
    throw err;
  }

  return { isPremium: false, quotaId: quota.id };
}

/**
 * Efetiva o desconto de 1 unidade da cota diária após sucesso do Gemini.
 */
export async function commitAiAnalysisQuota(userId: string, planType = "free") {
  const check = await assertAiAnalysisQuotaAvailable(userId, planType);

  if (check.isPremium || !check.quotaId) {
    return {
      feature: FEATURE_AI_ANALYSIS,
      isPremium: true,
      limit: 999999,
      used: 0,
      remaining: 999999,
    };
  }

  const updatedQuota = await prisma.usageQuota.update({
    where: { id: check.quotaId },
    data: {
      used: { increment: 1 },
    },
  });

  return {
    feature: FEATURE_AI_ANALYSIS,
    isPremium: false,
    limit: updatedQuota.limit,
    used: updatedQuota.used,
    remaining: Math.max(0, updatedQuota.limit - updatedQuota.used),
    periodStart: updatedQuota.periodStart,
    periodEnd: updatedQuota.periodEnd,
  };
}

// Mantém compatibilidade com chamadas antigas
export async function consumeAiAnalysisQuota(userId: string, planType = "free") {
  return commitAiAnalysisQuota(userId, planType);
}
