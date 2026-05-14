import React, { createContext, useContext, useState, useEffect } from "react";
import { apiService } from "../services/apiService";
import { useAuth } from "./AuthContext";

interface Workout {
  id: string;
  stravaId?: string;
  userId: string;
  title: string;
  type: "run" | "cycling" | "strength";
  date: Date;
  duration: number;
  distance?: number;
  pace?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  intensity: "low" | "moderate" | "high";
  aiNarrative?: string;
}

interface DashboardContextType {
  workouts: Workout[];
  currentMood?: string;
  currentMoodEmoji?: string;
  isLoading: boolean;
  setMood: (moodId: string, emoji: string) => void;
  getMoodToday: () => string | undefined;
  loadWorkouts: () => Promise<void>;
  analyzeWorkout: (workoutId: string) => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(
  undefined
);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [currentMood, setCurrentMood] = useState<string | undefined>();
  const [currentMoodEmoji, setCurrentMoodEmoji] = useState<string>("😐");
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  // Carrega treinos ao inicializar
  useEffect(() => {
    if (user) {
      loadWorkouts();
    }
  }, [user]);

  const loadWorkouts = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const response = await apiService.get('/workouts');
      const workoutsData = response.workouts.map((workout: any) => ({
        ...workout,
        date: new Date(workout.date),
      }));
      setWorkouts(workoutsData);
    } catch (error) {
      console.error('Error loading workouts:', error);
      // Em caso de erro, mantém workouts vazios ou mostra mensagem
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeWorkout = async (workoutId: string) => {
    try {
      const response = await apiService.post(`/workouts/${workoutId}/analyze`, {
        mood: currentMood,
      });

      // Atualiza o treino com a nova narrativa
      setWorkouts(prevWorkouts =>
        prevWorkouts.map(workout =>
          workout.id === workoutId
            ? { ...workout, aiNarrative: response.narrative }
            : workout
        )
      );
    } catch (error) {
      console.error('Error analyzing workout:', error);
      throw error;
    }
  };

  const setMood = (moodId: string, emoji: string) => {
    setCurrentMood(moodId);
    setCurrentMoodEmoji(emoji);
    // Em produção, salvar no backend
  };

  const getMoodToday = () => {
    return currentMood;
  };

  return (
    <DashboardContext.Provider
      value={{
        workouts,
        currentMood,
        currentMoodEmoji,
        isLoading,
        setMood,
        getMoodToday,
        loadWorkouts,
        analyzeWorkout,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error(
      "useDashboard deve ser usado dentro de DashboardProvider"
    );
  }
  return context;
}
