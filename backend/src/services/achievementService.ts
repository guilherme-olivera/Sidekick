import { prisma } from "../utils/prisma";

export interface PersonalRecordInfo {
  distance: string; // "1k" | "5k" | "10k" | "21k" | "42k"
  rank: number; // 1 = Gold, 2 = Silver, 3 = Bronze
  time: number; // in seconds
  workoutId: string;
  workoutTitle: string;
  date: Date;
}

// Classical distances to evaluate
const MILESTONES = [
  { id: "1k", distanceKm: 1.0 },
  { id: "5k", distanceKm: 5.0 },
  { id: "10k", distanceKm: 10.0 },
  { id: "21k", distanceKm: 21.0975 }, // Half Marathon
  { id: "42k", distanceKm: 42.195 },  // Marathon
];

/**
 * Calculates all personal records (1st, 2nd, 3rd) for run workouts
 */
export async function calculatePersonalRecords(userId: string): Promise<PersonalRecordInfo[]> {
  const workouts = await prisma.workout.findMany({
    where: {
      userId,
      type: "run",
    },
    orderBy: { date: "desc" },
  });

  const records: PersonalRecordInfo[] = [];

  for (const milestone of MILESTONES) {
    const qualifyingWorkouts: { workout: any; estimatedTime: number }[] = [];

    for (const w of workouts) {
      const distance = w.distance || 0;
      const duration = w.duration || 0;

      // Ensure workout is long enough for this milestone
      if (distance >= milestone.distanceKm) {
        let estimatedTime = duration;

        // If splits are present, look for split data
        if (w.splits && Array.isArray(w.splits) && milestone.id === "1k") {
          // Find fastest 1k split
          let fastestSplit = Infinity;
          const splitsList = w.splits as any[];
          for (const split of splitsList) {
            if (!split) continue;
            const splitDist = split.distance || 0;
            const splitTime = split.movingTime || split.elapsedTime || 0;
            if (splitDist >= 950 && splitDist <= 1050) {
              if (splitTime < fastestSplit) {
                fastestSplit = splitTime;
              }
            }
          }
          if (fastestSplit !== Infinity) {
            estimatedTime = fastestSplit;
          } else {
            estimatedTime = (duration / distance) * milestone.distanceKm;
          }
        } else {
          // Proportionate estimation
          estimatedTime = (duration / distance) * milestone.distanceKm;
        }

        qualifyingWorkouts.push({
          workout: w,
          estimatedTime: Math.round(estimatedTime),
        });
      }
    }

    // Sort by estimated time ascending (fastest first)
    qualifyingWorkouts.sort((a, b) => a.estimatedTime - b.estimatedTime);

    // Take top 3 as Gold (1), Silver (2), Bronze (3)
    const top3 = qualifyingWorkouts.slice(0, 3);
    top3.forEach((item, index) => {
      records.push({
        distance: milestone.id,
        rank: index + 1,
        time: item.estimatedTime,
        workoutId: item.workout.id,
        workoutTitle: item.workout.title,
        date: item.workout.date,
      });
    });
  }

  return records;
}

/**
 * Calculates current monthly running distance challenge progress
 */
export async function calculateMonthlyDistanceProgress(userId: string): Promise<{ distance: number; target: number; completed: boolean }> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const workouts = await prisma.workout.findMany({
    where: {
      userId,
      type: "run",
      date: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
    select: { distance: true },
  });

  const totalDistance = workouts.reduce((sum, w) => sum + (w.distance || 0), 0);
  const target = 50.0; // 50 km monthly challenge

  return {
    distance: Number(totalDistance.toFixed(2)),
    target,
    completed: totalDistance >= target,
  };
}

/**
 * Checks for new records or badge achievements and stores them as unseen in user profile
 */
export async function detectNewAchievements(userId: string, oldRecords: PersonalRecordInfo[]) {
  const currentRecords = await calculatePersonalRecords(userId);
  const newUnseen: any[] = [];

  // Compare records
  for (const curr of currentRecords) {
    const isBetter = !oldRecords.some(old => 
      old.distance === curr.distance && 
      old.rank === curr.rank && 
      old.time <= curr.time
    );

    if (isBetter) {
      newUnseen.push({
        type: "pr",
        distance: curr.distance,
        rank: curr.rank,
        time: curr.time,
        workoutTitle: curr.workoutTitle,
        date: curr.date,
      });
    }
  }

  if (newUnseen.length > 0) {
    // Append or save new achievements to the UserProfile
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { newConquestsJson: true }
    });

    let existingUnseen: any[] = [];
    if (profile?.newConquestsJson) {
      try {
        existingUnseen = JSON.parse(profile.newConquestsJson);
      } catch (e) {
        existingUnseen = [];
      }
    }

    const merged = [...existingUnseen, ...newUnseen];
    await prisma.userProfile.update({
      where: { userId },
      data: {
        newConquestsJson: JSON.stringify(merged),
      },
    });
    console.log(`[Achievements] Detected ${newUnseen.length} new records for user ${userId}`);
  }
}
