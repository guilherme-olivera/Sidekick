import { prisma } from "./prisma";
import { calculateACWR } from "../services/analyticsService";

export async function calculateReadiness(userId: string, userProfile: any) {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const todayDate = new Date(todayStr);

  // 1. Obter humor de hoje (Status Diário)
  const moodCheck = await prisma.moodCheck.findUnique({
    where: {
      userId_date: {
        userId,
        date: todayDate,
      },
    },
  });

  // Fator de Sono/Humor Diário (35 a 100)
  let sleepFactor = 85; // Padrão "Normal" / "Neutro" / "OK"
  if (moodCheck?.mood) {
    const m = moodCheck.mood.toLowerCase();
    if (m === "excelente" || m.includes("happy") || m.includes("otimo") || m === "bom" || m.includes("incrivel")) {
      sleepFactor = 100;
    } else if (m === "neutro" || m.includes("normal") || m === "ok") {
      sleepFactor = 85;
    } else if (m === "cansado" || m.includes("fadiga") || m === "tired" || m.includes("dolorido")) {
      sleepFactor = 60;
    } else if (m === "esgotado" || m.includes("doente") || m === "sick") {
      sleepFactor = 35;
    }
  }

  // 2. Buscar treinos dos últimos 7 dias para cálculo de Fadiga Residual Progressiva
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);

  const recentWorkouts = await prisma.workout.findMany({
    where: {
      userId,
      date: {
        gte: sevenDaysAgo,
      },
    },
    select: {
      date: true,
      distance: true,
      duration: true,
      effortRating: true,
      sufferScore: true,
      intensity: true,
    },
    orderBy: {
      date: "desc",
    },
  });

  let accumulatedFatigue = 0;
  let lastWorkoutDate: Date | null = null;

  if (recentWorkouts.length > 0) {
    lastWorkoutDate = new Date(recentWorkouts[0].date);
  }

  // Calcular impacto de fadiga com decaimento por tempo (dias decorridos)
  for (const w of recentWorkouts) {
    const wDate = new Date(w.date);
    const diffHours = Math.max(0, (now.getTime() - wDate.getTime()) / (1000 * 60 * 60));
    const diffDays = diffHours / 24;

    // Se o treino tem 4 dias ou mais (>= 96h), a fadiga muscular residual é 0
    if (diffDays >= 4) continue;

    // Calcular impacto inicial do treino (I0) com base no volume e percepção de esforço (RPE)
    let initialImpact = 15; // Carga leve padrão
    const dist = w.distance || 0;
    const rpe = w.effortRating || 3;

    if (dist >= 12 || rpe >= 5 || (w.sufferScore && w.sufferScore > 100)) {
      initialImpact = 40; // Treino pesado/longão
    } else if (dist >= 5 || rpe >= 3.8 || (w.sufferScore && w.sufferScore > 50)) {
      initialImpact = 25; // Treino moderado
    }

    // Curva de decaimento fisiológico de fadiga (meia-vida):
    // 0h..24h (Dia 0): 100% da fadiga residual
    // 24h..48h (Dia 1): 50% da fadiga residual
    // 48h..72h (Dia 2): 25% da fadiga residual
    // 72h..96h (Dia 3): 10% da fadiga residual
    let retentionFactor = 1.0;
    if (diffDays >= 3) {
      retentionFactor = 0.10;
    } else if (diffDays >= 2) {
      retentionFactor = 0.25;
    } else if (diffDays >= 1) {
      retentionFactor = 0.50;
    }

    accumulatedFatigue += initialImpact * retentionFactor;
  }

  // Penalidade por sobretreinamento (frequência de treinos acima da meta da semana)
  const targetFrequency = userProfile?.weeklyFrequency || 3;
  if (recentWorkouts.length > targetFrequency) {
    accumulatedFatigue += (recentWorkouts.length - targetFrequency) * 10;
  }

  // 3. Bônus Progressivo por Dias Sem Treinar (Supercompensação & Regeneração)
  let daysWithoutWorkout = 7;
  if (lastWorkoutDate) {
    const hoursSinceLast = Math.max(0, (now.getTime() - lastWorkoutDate.getTime()) / (1000 * 60 * 60));
    daysWithoutWorkout = Math.floor(hoursSinceLast / 24);
  }

  let restBonus = 0;
  if (daysWithoutWorkout >= 7) {
    restBonus = 15; // Corpo 100% regenerado
  } else if (daysWithoutWorkout >= 5) {
    restBonus = 12;
  } else if (daysWithoutWorkout >= 4) {
    restBonus = 10;
  } else if (daysWithoutWorkout >= 3) {
    restBonus = 7;
  } else if (daysWithoutWorkout >= 2) {
    restBonus = 4;
  } else if (daysWithoutWorkout >= 1) {
    restBonus = 2;
  }

  // 4. Fator de Lesão (filtrando "nenhum", "nenhuma", "ok", etc.)
  let injuryPenalty = 0;
  const injuryNoteStr = (userProfile?.injuryNote || "").toLowerCase().trim();
  const noInjuryKeywords = [
    "none",
    "nena",
    "nenhum",
    "nenhuma",
    "não",
    "nao",
    "sem lesões",
    "sem lesoes",
    "sem lesao",
    "0",
    "zero",
    "ok",
  ];

  if (injuryNoteStr && !noInjuryKeywords.includes(injuryNoteStr)) {
    injuryPenalty = 20;
  }

  // 5. Pontuação Final de Prontidão (Limitada entre 10 e 100%)
  let score = sleepFactor - accumulatedFatigue + restBonus - injuryPenalty;
  score = Math.max(10, Math.min(100, Math.round(score)));

  let label = "Prontidão Excelente";
  let color = "#51cf66"; // verde

  if (score >= 80) {
    label = "Prontidão Excelente";
    color = "#51cf66"; // verde
  } else if (score >= 60) {
    label = "Pronto para Treinar";
    color = "#a9e34b"; // verde claro / amarelo suave
  } else {
    label = "Foco em Recuperação";
    color = "#ff6b6b"; // vermelho
  }

  // Obter dados de ACWR
  let acwrData = null;
  try {
    acwrData = await calculateACWR(userId);
  } catch (e) {
    console.error("Error calculating ACWR in readiness:", e);
  }

  return {
    score,
    label,
    color,
    acwr: acwrData,
    details: {
      sleepFactor,
      daysWithoutWorkout,
      accumulatedFatigue: Math.round(accumulatedFatigue),
      restBonus,
      injuryPenalty,
    },
  };
}
