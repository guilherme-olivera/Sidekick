import { prisma } from "../utils/prisma";

export interface RacePrediction {
  distance: string; // "5k" | "10k" | "21k" | "42k"
  label: string;
  predictedTimeSeconds: number; // in seconds
  formattedTime: string;
  paceMinPerKm: string;
}

export interface ACWRData {
  acuteLoadKm: number; // current week volume
  chronicLoadKm: number; // 4-week average volume
  ratio: number; // ACWR ratio
  status: "optimal" | "warning" | "danger";
  label: string;
  color: string;
  recommendation: string;
}

/**
 * Formats seconds into HH:MM:SS or MM:SS
 */
function formatSeconds(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds <= 0) return "00:00";
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.round(totalSeconds % 60);

  const pad = (n: number) => String(n).padStart(2, "0");
  if (hrs > 0) {
    return `${hrs}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

/**
 * Formats pace in mm:ss /km
 */
function formatPace(paceSecPerKm: number): string {
  if (isNaN(paceSecPerKm) || paceSecPerKm <= 0) return "00:00 /km";
  const mins = Math.floor(paceSecPerKm / 60);
  const secs = Math.round(paceSecPerKm % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")} /km`;
}

/**
 * Calculates Race Predictions (5k, 10k, 21k, 42k) using Riegel's Formula:
 * T2 = T1 * (D2 / D1) ^ 1.06
 */
export async function calculateRacePredictions(userId: string): Promise<RacePrediction[]> {
  const workouts = await prisma.workout.findMany({
    where: {
      userId,
      type: "run",
    },
    orderBy: { date: "desc" },
    take: 30, // recent 30 runs
  });

  const targets = [
    { id: "5k", label: "5 km", distKm: 5.0 },
    { id: "10k", label: "10 km", distKm: 10.0 },
    { id: "21k", label: "21.1 km (Meia)", distKm: 21.0975 },
    { id: "42k", label: "42.2 km (Maratona)", distKm: 42.195 },
  ];

  if (workouts.length === 0) {
    return targets.map(t => ({
      distance: t.id,
      label: t.label,
      predictedTimeSeconds: 0,
      formattedTime: "--:--",
      paceMinPerKm: "--:-- /km",
    }));
  }

  // Find best baseline effort (best pace run >= 1km)
  let bestRun = workouts[0];
  let bestPace = Infinity;

  for (const w of workouts) {
    const dist = w.distance || 0;
    const dur = w.duration || 0;
    if (dist >= 1.0 && dur > 0) {
      const pace = dur / dist;
      if (pace < bestPace) {
        bestPace = pace;
        bestRun = w;
      }
    }
  }

  const d1 = bestRun.distance || 5.0;
  const t1 = bestRun.duration || 1500;

  return targets.map(t => {
    const d2 = t.distKm;
    // Riegel's Formula: T2 = T1 * (D2 / D1)^1.06
    const predictedSec = Math.round(t1 * Math.pow(d2 / d1, 1.06));
    const paceSec = Math.round(predictedSec / d2);

    return {
      distance: t.id,
      label: t.label,
      predictedTimeSeconds: predictedSec,
      formattedTime: formatSeconds(predictedSec),
      paceMinPerKm: formatPace(paceSec),
    };
  });
}

/**
 * Calculates Scientific ACWR (Acute:Chronic Workload Ratio)
 * Acute: Current week running volume (km)
 * Chronic: Average weekly running volume over last 4 weeks (km)
 */
export async function calculateACWR(userId: string): Promise<ACWRData> {
  const now = new Date();
  const startOfCurrentWeek = new Date(now);
  const dayOffset = now.getDay() === 0 ? -6 : 1 - now.getDay();
  startOfCurrentWeek.setDate(now.getDate() + dayOffset);
  startOfCurrentWeek.setHours(0, 0, 0, 0);

  const startOf4WeeksAgo = new Date(startOfCurrentWeek);
  startOf4WeeksAgo.setDate(startOfCurrentWeek.getDate() - 28);

  const workouts = await prisma.workout.findMany({
    where: {
      userId,
      type: "run",
      date: {
        gte: startOf4WeeksAgo,
      },
    },
    select: {
      date: true,
      distance: true,
    },
  });

  let acuteLoad = 0; // current week
  let chronicLoadTotal = 0; // last 4 weeks total

  for (const w of workouts) {
    const dist = w.distance || 0;
    const wDate = new Date(w.date);

    chronicLoadTotal += dist;
    if (wDate >= startOfCurrentWeek) {
      acuteLoad += dist;
    }
  }

  const chronicLoadAvg = Number((chronicLoadTotal / 4).toFixed(2));
  const acuteLoadKm = Number(acuteLoad.toFixed(2));

  let ratio = 1.0;
  if (chronicLoadAvg > 0) {
    ratio = Number((acuteLoadKm / chronicLoadAvg).toFixed(2));
  } else if (acuteLoadKm > 0) {
    ratio = 1.4; // Initial ramp up warning
  }

  let status: "optimal" | "warning" | "danger" = "optimal";
  let label = "Adaptação Ótima (Seguro)";
  let color = "#51cf66"; // Green
  let recommendation = "Carga de treino em nível ideal para evolução contínua sem risco de sobrecarga.";

  if (ratio > 1.5) {
    status = "danger";
    label = "Risco Crítico de Lesão!";
    color = "#ff6b6b"; // Red
    recommendation = "Carga aguda muito alta em relação às últimas 4 semanas. Reduza a intensidade para evitar lesões musculares.";
  } else if (ratio > 1.3) {
    status = "warning";
    label = "Zona de Atenção";
    color = "#ffd700"; // Yellow
    recommendation = "Aumento considerável de volume. Mantenha boa hidratação e monitore dores articulares.";
  } else if (ratio < 0.8 && acuteLoadKm > 0) {
    status = "warning";
    label = "Carga Baixa (Destreino)";
    color = "#a5d8ff"; // Light Blue
    recommendation = "Seu volume atual está abaixo da sua média crônica. Boa oportunidade para recuperar ou intensificar ritmos.";
  }

  return {
    acuteLoadKm,
    chronicLoadKm: chronicLoadAvg,
    ratio,
    status,
    label,
    color,
    recommendation,
  };
}
