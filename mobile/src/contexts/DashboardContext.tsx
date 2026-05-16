import React, { createContext, useContext, useState, useEffect } from "react";
import { apiService } from "../services/apiService";
import { calendarMockService, CalendarEvent } from "../services/calendarMockService";
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
  description?: string;
}

interface WorkoutByDay {
  [dayOfWeek: number]: Workout[]; // 0=Sunday, 1=Monday, ..., 6=Saturday
}

interface DashboardContextType {
  workouts: Workout[];
  workoutsByDay: WorkoutByDay;
  currentMood?: string;
  currentMoodEmoji?: string;
  isLoading: boolean;
  setMood: (moodId: string, emoji: string) => void;
  getMoodToday: () => string | undefined;
  loadWorkouts: () => Promise<void>;
  loadWeeklyWorkouts: (startDate: Date) => Promise<void>;
  getWorkoutsByDate: (date: Date) => Workout[];
  analyzeWorkout: (workoutId: string) => Promise<void>;
  calendarEvents: CalendarEvent[];
  loadCalendarEvents: () => Promise<void>;
  getCalendarEventsByDate: (isoDate: string) => CalendarEvent[];
  createEvent: (payload: Partial<CalendarEvent>) => Promise<any>;
  updateEvent: (id: string, payload: Partial<CalendarEvent>) => Promise<any>;
  deleteEvent: (id: string) => Promise<any>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(
  undefined
);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [workoutsByDay, setWorkoutsByDay] = useState<WorkoutByDay>({});
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [currentMood, setCurrentMood] = useState<string | undefined>();
  const [currentMoodEmoji, setCurrentMoodEmoji] = useState<string>("😐");
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  // Carrega treinos e eventos ao inicializar
  useEffect(() => {
    if (user) {
      loadWorkouts();
      loadCalendarEvents();
    }
  }, [user]);

  // Toggle para usar mocks locais em vez do backend
  const USE_LOCAL_MOCKS = true;

  const loadWorkouts = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      if (USE_LOCAL_MOCKS) {
        const res = await calendarMockService.listAll();
        const workoutsData = (res.events || []).map((workout: any) => ({
          id: workout.id,
          userId: user.id,
          title: workout.title,
          type: (workout.type as any) || "run",
          date: new Date(workout.date),
          duration: (workout.durationMinutes || 30) * 60,
          intensity: "moderate" as Workout["intensity"],
        } as Workout));
        setWorkouts(workoutsData);
        groupWorkoutsByDay(workoutsData);
        await loadCalendarEvents();
        return;
      }

      const response = await apiService.get('/workouts');
      const workoutsData = (response.workouts || []).map((workout: any) => ({
        ...workout,
        date: new Date(workout.date),
      }));
      setWorkouts(workoutsData);
      groupWorkoutsByDay(workoutsData);
    } catch (error) {
      console.error('Error loading workouts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadWeeklyWorkouts = async (startDate: Date) => {
    if (!user) return;

    try {
      setIsLoading(true);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);

      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      if (USE_LOCAL_MOCKS) {
        const res = await calendarMockService.listBetween(startStr, endStr);
        const workoutsData = (res.events || []).map((workout: any) => ({
          id: workout.id,
          userId: user.id,
          title: workout.title,
          type: (workout.type as any) || "run",
          date: new Date(workout.date),
          duration: (workout.durationMinutes || 30) * 60,
          intensity: "moderate" as Workout["intensity"],
        } as Workout));
        setWorkouts(workoutsData);
        groupWorkoutsByDay(workoutsData);
        await loadCalendarEvents();
        return;
      }

      const response = await apiService.get(
        `/workouts?startDate=${startStr}&endDate=${endStr}`
      );
      const workoutsData = (response.workouts || []).map((workout: any) => ({
        ...workout,
        date: new Date(workout.date),
      }));
      setWorkouts(workoutsData);
      groupWorkoutsByDay(workoutsData);
    } catch (error) {
      console.error('Error loading weekly workouts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const groupWorkoutsByDay = (workoutsList: Workout[]) => {
    const grouped: WorkoutByDay = {};

    workoutsList.forEach((workout) => {
      const date = new Date(workout.date);
      const dayOfWeek = date.getDay();

      if (!grouped[dayOfWeek]) {
        grouped[dayOfWeek] = [];
      }
      grouped[dayOfWeek].push(workout);
    });

    setWorkoutsByDay(grouped);
  };

  const getWorkoutsByDate = (date: Date) => {
    const dayOfWeek = date.getDay();
    return workoutsByDay[dayOfWeek] || [];
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

  const loadCalendarEvents = async () => {
    if (!user) return;

    if (USE_LOCAL_MOCKS) {
      const res = await calendarMockService.listAll();
      setCalendarEvents(res.events || []);
      return;
    }

    const response = await apiService.get('/events');
    setCalendarEvents(response.events || []);
  };

  const getCalendarEventsByDate = (isoDate: string) => {
    return calendarEvents.filter((event) => event.date === isoDate);
  };

  // Calendar CRUD helpers (use local mocks when enabled)
  const createEvent = async (payload: Partial<CalendarEvent>) => {
    if (USE_LOCAL_MOCKS) {
      const res = await calendarMockService.create(payload);
      await loadWorkouts();
      await loadCalendarEvents();
      return res.event;
    }
    const res = await apiService.post('/events', payload);
    await loadWorkouts();
    await loadCalendarEvents();
    return res.event;
  };

  const updateEvent = async (id: string, payload: Partial<CalendarEvent>) => {
    if (USE_LOCAL_MOCKS) {
      const res = await calendarMockService.update(id, payload);
      await loadWorkouts();
      await loadCalendarEvents();
      return res.event;
    }
    const res = await apiService.put(`/events/${id}`, payload);
    await loadWorkouts();
    await loadCalendarEvents();
    return res.event;
  };

  const deleteEvent = async (id: string) => {
    if (USE_LOCAL_MOCKS) {
      const res = await calendarMockService.remove(id);
      await loadWorkouts();
      await loadCalendarEvents();
      return res;
    }
    const res = await apiService.delete(`/events/${id}`);
    await loadWorkouts();
    await loadCalendarEvents();
    return res;
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
        workoutsByDay,
        currentMood,
        currentMoodEmoji,
        isLoading,
        setMood,
        getMoodToday,
        loadWorkouts,
        loadWeeklyWorkouts,
        getWorkoutsByDate,
        analyzeWorkout,
        calendarEvents,
        loadCalendarEvents,
        getCalendarEventsByDate,
        createEvent,
        updateEvent,
        deleteEvent,
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
