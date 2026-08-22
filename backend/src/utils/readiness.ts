import { prisma } from "./prisma";

export async function calculateReadiness(userId: string, userProfile: any) {
  const todayStr = new Date().toISOString().split("T")[0];
  const todayDate = new Date(todayStr);

  // 1. Obter humor de hoje
  const moodCheck = await prisma.moodCheck.findUnique({
    where: {
      userId_date: {
        userId,
        date: todayDate,
      },
    },
  });

  // Fator de sono/humor (de 30 a 100)
  let sleepFactor = 75; // Padrão
  if (moodCheck?.mood) {
    const m = moodCheck.mood.toLowerCase();
    if (m === "excelente" || m.includes("happy") || m.includes("otimo") || m === "bom") {
      sleepFactor = 100;
    } else if (m === "neutro" || m.includes("normal") || m === "ok") {
      sleepFactor = 75;
    } else if (m === "cansado" || m.includes("fadiga") || m === "tired") {
      sleepFactor = 50;
    } else if (m === "esgotado" || m.includes("doente") || m === "sick") {
      sleepFactor = 30;
    }
  }

  // 2. Buscar treinos dos últimos 7 dias
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentWorkouts = await prisma.workout.findMany({
    where: {
      userId,
      date: {
        gte: sevenDaysAgo,
      },
    },
    select: {
      effortRating: true,
      sufferScore: true,
    },
  });

  const actualCount = recentWorkouts.length;
  const targetFrequency = userProfile?.weeklyFrequency || 3;

  let fatiguePenalty = 0;

  // Penalidade por sobretreinamento (treinos acima da frequência meta)
  if (actualCount > targetFrequency) {
    fatiguePenalty += (actualCount - targetFrequency) * 15;
  }

  // Penalidade por esforço (RPE)
  const workoutsWithRpe = recentWorkouts.filter((w) => w.effortRating !== null);
  if (workoutsWithRpe.length > 0) {
    const avgRpe =
      workoutsWithRpe.reduce((acc, w) => acc + (w.effortRating || 0), 0) /
      workoutsWithRpe.length;
    if (avgRpe >= 4.5) {
      fatiguePenalty += 20; // Muito exausto
    } else if (avgRpe >= 3.8) {
      fatiguePenalty += 10;
    }
  }

  // 3. Fator de lesão
  let injuryPenalty = 0;
  if (
    userProfile?.injuryNote &&
    userProfile.injuryNote.toLowerCase() !== "none" &&
    userProfile.injuryNote.toLowerCase() !== "nena" &&
    userProfile.injuryNote.trim() !== ""
  ) {
    injuryPenalty = 20;
  }

  // Fórmula final de Prontidão
  let score = sleepFactor - fatiguePenalty - injuryPenalty;
  score = Math.max(10, Math.min(100, Math.round(score)));

  let label = "Recuperação Moderada";
  let color = "#ffa94d"; // amarelo/laranja

  if (score >= 80) {
    label = "Pronto para o Desafio";
    color = "#51cf66"; // verde
  } else if (score < 50) {
    label = "Necessita Descanso";
    color = "#ff6b6b"; // vermelho
  }

  return {
    score,
    label,
    color,
    details: {
      sleepFactor,
      fatiguePenalty,
      injuryPenalty,
    },
  };
}
