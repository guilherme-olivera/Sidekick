import React, { createContext, useContext, useState, useEffect } from "react";
import { apiService } from "../services/apiService";
import { calendarMockService, CalendarEvent } from "../services/calendarMockService";
import notificationService from "../services/notificationService";
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
  effortRating?: number;
  userNotes?: string;
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
  setMood: (moodId: string, emoji: string) => Promise<void>;
  getMoodToday: () => string | undefined;
  loadWorkouts: () => Promise<void>;
  loadWeeklyWorkouts: (startDate: Date) => Promise<void>;
  getWorkoutsByDate: (date: Date) => Workout[];
  analyzeWorkout: (workoutId: string, effortRating?: number, userNotes?: string) => Promise<void>;
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
  const [manualCalendarEvents, setManualCalendarEvents] = useState<CalendarEvent[]>([]);
  const [currentMood, setCurrentMood] = useState<string | undefined>();
  const [currentMoodEmoji, setCurrentMoodEmoji] = useState<string>("😐");
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  // Carrega treinos e eventos ao inicializar
  useEffect(() => {
    if (user) {
      loadWorkouts();
      loadManualEvents();
      loadTodayMood();
    } else {
      setWorkouts([]);
      setWorkoutsByDay({});
      setCalendarEvents([]);
      setManualCalendarEvents([]);
      setCurrentMood(undefined);
      setCurrentMoodEmoji("😐");
    }
  }, [user]);

  const loadTodayMood = async () => {
    try {
      const response = await apiService.get('/user/mood/today');
      if (response.success && response.mood) {
        setCurrentMood(response.mood);
        const emojiMap: Record<string, string> = {
          tired: "🫩",
          sick: "🤢",
          normal: "😐",
          angry: "😡",
          sad: "🥺",
          happy: "🤣",
        };
        setCurrentMoodEmoji(emojiMap[response.mood] || "😐");
      }
    } catch (error) {
      console.error('Error loading today mood:', error);
    }
  };

  // Toggle para usar backend para workouts e mock local apenas para lembretes/eventos manuais
  const USE_LOCAL_WORKOUTS = false;
  const USE_LOCAL_EVENTS = true;

  const loadWorkouts = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const response = await apiService.get('/workouts');
      const workoutsData = (response.workouts || []).map((workout: any) => ({
        ...workout,
        date: new Date(workout.date),
      }));
      setWorkouts(workoutsData);
      groupWorkoutsByDay(workoutsData);
      await loadCalendarEvents(workoutsData);
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

      const response = await apiService.get(
        `/workouts?startDate=${startStr}&endDate=${endStr}`
      );
      const workoutsData = (response.workouts || []).map((workout: any) => ({
        ...workout,
        date: new Date(workout.date),
      }));
      setWorkouts(workoutsData);
      groupWorkoutsByDay(workoutsData);
      await loadCalendarEvents(workoutsData);
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

  const analyzeWorkout = async (workoutId: string, effortRating?: number, userNotes?: string) => {
    try {
      const response = await apiService.post(`/workouts/${workoutId}/analyze`, {
        mood: currentMood,
        effortRating,
        userNotes,
      });

      if (!response || response.error) {
        throw new Error(response?.error || 'Erro desconhecido ao analisar o treino');
      }

      if (!response.narrative) {
        throw new Error('Resposta de análise inválida do servidor.');
      }

      setWorkouts(prevWorkouts =>
        prevWorkouts.map(workout =>
          workout.id === workoutId
            ? { 
                ...workout, 
                aiNarrative: response.narrative,
                effortRating: effortRating ?? workout.effortRating,
                userNotes: userNotes ?? workout.userNotes
              }
            : workout
        )
      );
    } catch (error) {
      console.error('Error analyzing workout:', error);
      throw error;
    }
  };

  const loadCalendarEvents = async (workoutsData?: Workout[]) => {
    if (!user) return;

    let manualEvents: CalendarEvent[] = manualCalendarEvents;

    if (USE_LOCAL_EVENTS) {
      const res = await calendarMockService.listAll();
      manualEvents = res.events || [];
      setManualCalendarEvents(manualEvents);
    }

    const sourceWorkouts = workoutsData || workouts;
    const workoutEvents = sourceWorkouts.map((workout) => {
      const workoutDate = workout.date instanceof Date ? workout.date : new Date(workout.date);
      const validDate = !Number.isNaN(workoutDate.getTime()) ? workoutDate : new Date();
      const isoDate = validDate.toISOString().split('T')[0];
      const time = validDate.toISOString().split('T')[1].slice(0, 5);

      return {
        id: workout.id,
        date: isoDate,
        title: workout.title,
        time,
        type: workout.type,
        description: workout.aiNarrative || "Treino sincronizado com Strava",
        source: workout.stravaId ? ("Strava" as const) : ("Sidekick" as const),
        isWorkout: true,
      };
    });

    setCalendarEvents([...workoutEvents, ...(manualEvents || [])]);
  };

  const loadManualEvents = async () => {
    if (!user) return;

    if (USE_LOCAL_EVENTS) {
      const res = await calendarMockService.listAll();
      setManualCalendarEvents(res.events || []);
      await loadCalendarEvents();
      return;
    }

    // no backend route for manual events yet
    setManualCalendarEvents([]);
    await loadCalendarEvents();
  };

  const getCalendarEventsByDate = (isoDate: string) => {
    return calendarEvents.filter((event) => event.date === isoDate);
  };

  // Calendar CRUD helpers (use local mocks when enabled)
  const createEvent = async (payload: Partial<CalendarEvent>) => {
    if (USE_LOCAL_EVENTS) {
      const res = await calendarMockService.create(payload);
      try {
        if (res.event) await notificationService.scheduleEventNotifications(res.event);
      } catch (e) {
        console.warn('Failed scheduling notifications', e);
      }
      await loadManualEvents();
      return res.event;
    }
    const res = await apiService.post('/events', payload);
    try {
      if (res.event) await notificationService.scheduleEventNotifications(res.event);
    } catch (e) {
      console.warn('Failed scheduling notifications', e);
    }
    await loadManualEvents();
    return res.event;
  };

  const updateEvent = async (id: string, payload: Partial<CalendarEvent>) => {
    if (USE_LOCAL_EVENTS) {
      const res = await calendarMockService.update(id, payload);
      try {
        await notificationService.cancelEventNotifications(id);
        if (res.event) await notificationService.scheduleEventNotifications(res.event);
      } catch (e) {
        console.warn('Failed updating notifications', e);
      }
      await loadManualEvents();
      return res.event;
    }
    const res = await apiService.put(`/events/${id}`, payload);
    try {
      await notificationService.cancelEventNotifications(id);
      if (res.event) await notificationService.scheduleEventNotifications(res.event);
    } catch (e) {
      console.warn('Failed updating notifications', e);
    }
    await loadManualEvents();
    return res.event;
  };

  const deleteEvent = async (id: string) => {
    if (USE_LOCAL_EVENTS) {
      const res = await calendarMockService.remove(id);
      try {
        await notificationService.cancelEventNotifications(id);
      } catch (e) {
        console.warn('Failed cancelling notifications', e);
      }
      await loadManualEvents();
      return res;
    }
    const res = await apiService.delete(`/events/${id}`);
    try {
      await notificationService.cancelEventNotifications(id);
    } catch (e) {
      console.warn('Failed cancelling notifications', e);
    }
    await loadManualEvents();
    return res;
  };

  const setMood = async (moodId: string, emoji: string) => {
    setCurrentMood(moodId);
    setCurrentMoodEmoji(emoji);
    try {
      await apiService.post('/user/mood', { mood: moodId });
    } catch (err) {
      console.error('Failed to save mood on server:', err);
    }
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
