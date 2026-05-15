import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  SafeAreaView,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useDashboard } from "@/src/contexts/DashboardContext";
import { useAuth } from "@/src/contexts/AuthContext";
import { MoodWidget } from "@/components/MoodWidget";
import { WorkoutCard } from "@/components/WorkoutCard";

const Colors = {
  dark: "#0a0a0a",
  darkCard: "#1a1a1a",
  darkBorder: "#333333",
  text: "#ffffff",
  textSecondary: "#b0b0b0",
  primary: "#ff6b6b",
  success: "#51cf66",
  inactive: "#555555",
};

const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];
const DAY_NUMBERS = [1, 2, 3, 4, 5, 6, 0]; // Mapping DAYS to Date.getDay()

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    workouts,
    workoutsByDay,
    currentMoodEmoji,
    setMood,
    currentMood,
    isLoading,
    loadWeeklyWorkouts,
    getWorkoutsByDate,
    analyzeWorkout,
  } = useDashboard();

  const [analyzingWorkoutId, setAnalyzingWorkoutId] = useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [showWorkoutsList, setShowWorkoutsList] = useState(false);
  const [selectedDayWorkouts, setSelectedDayWorkouts] = useState<any[]>([]);

  const latestWorkout = workouts[0];

  useEffect(() => {
    // Carrega treinos da semana atual ao inicializar
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1); // Início da semana
    
    loadWeeklyWorkouts(monday);
  }, []);

  const handleMoodSelect = (moodId: string, emoji: string) => {
    setMood(moodId, emoji);
  };

  const handleAnalyzeWorkout = async (workoutId: string) => {
    try {
      setAnalyzingWorkoutId(workoutId);
      await analyzeWorkout(workoutId);
    } catch (error) {
      console.error("Error analyzing workout:", error);
    } finally {
      setAnalyzingWorkoutId(null);
    }
  };

  const handleDayPress = (dayIndex: number) => {
    const dayOfWeek = DAY_NUMBERS[dayIndex];
    const workoutsForDay = workoutsByDay[dayOfWeek] || [];
    
    setSelectedDayIndex(dayIndex);
    setSelectedDayWorkouts(workoutsForDay);
    setShowWorkoutsList(true);
  };

  const handleWorkoutPress = (workoutId: string) => {
    setShowWorkoutsList(false);
    router.push(`/history?workoutId=${workoutId}`);
  };

  const getDayBadgeColor = (dayIndex: number): "empty" | "filled" => {
    const dayOfWeek = DAY_NUMBERS[dayIndex];
    const hasWorkout = workoutsByDay[dayOfWeek] && workoutsByDay[dayOfWeek].length > 0;
    return hasWorkout ? "filled" : "empty";
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Welcome */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Olá, {user?.name}! 👋</Text>
          <Text style={styles.subtitle}>Bem-vindo ao seu Dashboard</Text>
        </View>

        {/* Stats Container */}
        <View style={styles.statsContainer}>
          <StatCard label="Treinos Semana" value={workouts.length.toString()} />
          <StatCard label="Tempo Total" value="8h 30m" />
          <StatCard label="Km Percorridos" value="35.8" />
        </View>

        {/* Latest Workout */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Último Treino</Text>
            <TouchableOpacity onPress={() => router.push("/history")}>
              <Text style={styles.sectionLink}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          {latestWorkout ? (
            <WorkoutCard
              workout={latestWorkout}
              onAnalyze={() => handleAnalyzeWorkout(latestWorkout.id)}
              isAnalyzing={analyzingWorkoutId === latestWorkout.id}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🏃</Text>
              <Text style={styles.emptyText}>Nenhum treino registrado ainda</Text>
            </View>
          )}
        </View>

        {/* Weekly Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo Semanal</Text>
          <Text style={styles.weekHint}>Clique em um dia para ver treinos</Text>
          <View style={styles.weekSummary}>
            {DAYS.map((day, index) => (
              <DayBadge
                key={day}
                day={day}
                status={getDayBadgeColor(index)}
                onPress={() => handleDayPress(index)}
                hasWorkouts={getDayBadgeColor(index) === "filled"}
              />
            ))}
          </View>
        </View>

        {/* Motivational Message */}
        <View style={styles.motivationalContainer}>
          <Text style={styles.motivationalIcon}>💪</Text>
          <Text style={styles.motivationalText}>
            Continue se movimentando! Cada dia é uma oportunidade.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal: Workouts for selected day */}
      <Modal
        visible={showWorkoutsList}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowWorkoutsList(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Treinos - {DAYS[selectedDayIndex ?? 0]}
              </Text>
              <TouchableOpacity onPress={() => setShowWorkoutsList(false)}>
                <Text style={styles.modalCloseButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Workouts List */}
            {selectedDayWorkouts.length > 0 ? (
              <FlatList
                data={selectedDayWorkouts}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.workoutItem}
                    onPress={() => handleWorkoutPress(item.id)}
                  >
                    <View style={styles.workoutItemLeft}>
                      <Text style={styles.workoutIcon}>
                        {item.type === "run"
                          ? "🏃"
                          : item.type === "cycling"
                          ? "🚴"
                          : "💪"}
                      </Text>
                      <View style={styles.workoutItemInfo}>
                        <Text style={styles.workoutTitle}>{item.title}</Text>
                        <Text style={styles.workoutDetails}>
                          {Math.round(item.duration / 60)} min
                          {item.distance ? ` • ${item.distance.toFixed(1)}km` : ""}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.workoutArrow}>›</Text>
                  </TouchableOpacity>
                )}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.emptyWorkoutsContainer}>
                <Text style={styles.emptyWorkoutsText}>
                  Nenhum treino neste dia
                </Text>
              </View>
            )}

            {/* Close Button */}
            <TouchableOpacity
              style={styles.modalCloseAction}
              onPress={() => setShowWorkoutsList(false)}
            >
              <Text style={styles.modalCloseActionText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Mood Widget - Positioned absolute */}
      <MoodWidget
        onMoodSelect={handleMoodSelect}
        currentMood={currentMood}
        currentMoodEmoji={currentMoodEmoji}
      />
    </SafeAreaView>
  );
}

interface StatCardProps {
  label: string;
  value: string;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

interface DayBadgeProps {
  day: string;
  status: "empty" | "filled";
  onPress: () => void;
  hasWorkouts: boolean;
}

function DayBadge({ day, status, onPress, hasWorkouts }: DayBadgeProps) {
  const isGreen = status === "filled";

  return (
    <TouchableOpacity
      style={[
        styles.dayBadge,
        {
          backgroundColor: isGreen ? Colors.success : Colors.darkCard,
          borderColor: isGreen ? Colors.success : Colors.darkBorder,
        },
      ]}
      onPress={onPress}
      disabled={!hasWorkouts}
    >
      <Text
        style={[
          styles.dayBadgeDay,
          { color: isGreen ? Colors.dark : Colors.textSecondary },
        ]}
      >
        {day}
      </Text>
      {isGreen && <Text style={styles.dayBadgeCheck}>✓</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
  },
  sectionLink: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "500",
  },
  emptyState: {
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.darkBorder,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  weekSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  weekHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  dayBadge: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  dayBadgeDay: {
    fontSize: 14,
    fontWeight: "600",
  },
  dayBadgeCheck: {
    fontSize: 10,
    marginTop: 2,
    color: Colors.dark,
  },
  motivationalContainer: {
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    alignItems: "center",
    marginTop: 20,
  },
  motivationalIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  motivationalText: {
    color: Colors.text,
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.darkCard,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
  },
  modalCloseButton: {
    fontSize: 24,
    color: Colors.textSecondary,
  },
  workoutItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.dark,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
  },
  workoutItemLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  workoutIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  workoutItemInfo: {
    flex: 1,
  },
  workoutTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 2,
  },
  workoutDetails: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  workoutArrow: {
    fontSize: 18,
    color: Colors.primary,
  },
  emptyWorkoutsContainer: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyWorkoutsText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  modalCloseAction: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 16,
    alignItems: "center",
  },
  modalCloseActionText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
});

