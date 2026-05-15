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

export async function getAiUsageStatus(userId: string) {
  const { start, end } = getTodayPeriod();

  const quota = await prisma.usageQuota.findFirst({
    where: {
      userId,
      feature: FEATURE_AI_ANALYSIS,
      periodStart: start,
    },
  });

  if (!quota) {
    return {
      feature: FEATURE_AI_ANALYSIS,
      limit: FREE_DAILY_LIMIT,
      used: 0,
      remaining: FREE_DAILY_LIMIT,
      periodStart: start,
      periodEnd: end,
    };
  }

  return {
    feature: FEATURE_AI_ANALYSIS,
    limit: quota.limit,
    used: quota.used,
    remaining: Math.max(0, quota.limit - quota.used),
    periodStart: quota.periodStart,
    periodEnd: quota.periodEnd,
  };
}

export async function consumeAiAnalysisQuota(userId: string, planType = "free") {
  if (planType === "premium") {
    return {
      feature: FEATURE_AI_ANALYSIS,
      limit: Infinity,
      used: 0,
      remaining: Infinity,
    };
  }

  const { start, end } = getTodayPeriod();
  const limit = FREE_DAILY_LIMIT;

  let quota = await prisma.usageQuota.findUnique({
    where: {
      userId_feature_periodStart: {
        userId,
        feature: FEATURE_AI_ANALYSIS,
        periodStart: start,
      },
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
    throw new Error(
      "Você atingiu o limite diário de IA. Atualize para o plano premium para continuar."
    );
  }

  const updatedQuota = await prisma.usageQuota.update({
    where: { id: quota.id },
    data: {
      used: {
        increment: 1,
      },
    },
  });

  return {
    feature: FEATURE_AI_ANALYSIS,
    limit: updatedQuota.limit,
    used: updatedQuota.used,
    remaining: Math.max(0, updatedQuota.limit - updatedQuota.used),
    periodStart: updatedQuota.periodStart,
    periodEnd: updatedQuota.periodEnd,
  };
}
