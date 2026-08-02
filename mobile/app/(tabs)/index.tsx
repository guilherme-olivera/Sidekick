import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  SafeAreaView,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
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
    setMood,
    currentMood,
    currentMoodEmoji,
    loadWeeklyWorkouts,
    analyzeWorkout,
  } = useDashboard();

  const [analyzingWorkoutId, setAnalyzingWorkoutId] = useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [selectedDayWorkouts, setSelectedDayWorkouts] = useState<any[]>([]);
  const [selectedWorkoutIdForDetail, setSelectedWorkoutIdForDetail] = useState<string | null>(null);

  const latestWorkout = workouts[0];
  const today = new Date();
  const currentWeekMonday = new Date(today);
  const todayDay = today.getDay();
  const mondayOffset = todayDay === 0 ? -6 : 1 - todayDay;
  currentWeekMonday.setDate(today.getDate() + mondayOffset);

  useEffect(() => {
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1); // Início da semana
    loadWeeklyWorkouts(monday);
  }, []);

  const handleMoodSelect = async (moodId: string, emoji: string) => {
    await setMood(moodId, emoji);
  };

  const handleAnalyzeWorkout = async (workoutId: string) => {
    try {
      setAnalyzingWorkoutId(workoutId);
      await analyzeWorkout(workoutId);
      Alert.alert("Análise concluída", "A análise Gemini foi gerada com sucesso.");
    } catch (error) {
      console.error("Error analyzing workout:", error);
      Alert.alert("Erro", "Não foi possível gerar a análise. Tente novamente.");
    } finally {
      setAnalyzingWorkoutId(null);
    }
  };

  const handleDayPress = (dayIndex: number) => {
    const dayOfWeek = DAY_NUMBERS[dayIndex];
    const workoutsForDay = workoutsByDay[dayOfWeek] || [];
    
    if (selectedDayIndex === dayIndex) {
      setSelectedDayIndex(null);
      setSelectedDayWorkouts([]);
    } else {
      setSelectedDayIndex(dayIndex);
      setSelectedDayWorkouts(workoutsForDay);
    }
  };

  const handleWorkoutPress = (workoutId: string) => {
    router.push(`/history?workoutId=${workoutId}`);
  };

  const getDayBadgeColor = (dayIndex: number): "empty" | "filled" | "upcoming" => {
    const dayOfWeek = DAY_NUMBERS[dayIndex];
    const hasWorkout = workoutsByDay[dayOfWeek] && workoutsByDay[dayOfWeek].length > 0;
    if (!hasWorkout) return "empty";

    const dayDate = new Date(currentWeekMonday);
    dayDate.setDate(currentWeekMonday.getDate() + dayIndex);
    return dayDate <= today ? "filled" : "upcoming";
  };

  // Dynamic weekly statistics calculation
  const totalSeconds = workouts.reduce((sum, w) => sum + (w.duration || 0), 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const totalTimeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  const totalDistance = workouts.reduce((sum, w) => sum + (w.distance || 0), 0);
  const totalDistanceStr = `${totalDistance.toFixed(1)} km`;

  const selectedWorkoutDetail = 
    workouts.find(w => w.id === selectedWorkoutIdForDetail) || 
    selectedDayWorkouts.find(w => w.id === selectedWorkoutIdForDetail);

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
          <StatCard 
            label="Treinos Semana" 
            value={workouts.length.toString()} 
            onPress={() => router.push('/profile')} 
          />
          <StatCard 
            label="Tempo Total" 
            value={totalTimeStr} 
            onPress={() => router.push('/profile')} 
          />
          <StatCard 
            label="Km Percorridos" 
            value={totalDistanceStr} 
            onPress={() => router.push('/profile')} 
          />
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
              onPress={() => setSelectedWorkoutIdForDetail(latestWorkout.id)}
              compact={true}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>👟</Text>
              <Text style={styles.emptyText}>Nenhum treino registrado ainda</Text>
            </View>
          )}
        </View>

        {/* Weekly Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo Semanal</Text>
          <Text style={styles.weekHint}>Clique em um dia marcado para ver os treinos realizados</Text>
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

          {/* Activities listed directly below summary */}
          {selectedDayIndex !== null && selectedDayWorkouts.length > 0 && (
            <View style={styles.dayWorkoutsContainer}>
              <Text style={styles.dayWorkoutsTitle}>
                Treinos de {DAYS[selectedDayIndex]}
              </Text>
              {selectedDayWorkouts.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.dayWorkoutItem}
                  onPress={() => handleWorkoutPress(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.dayWorkoutItemLeft}>
                    <Text style={styles.dayWorkoutIcon}>
                      {item.type === "run" ? "👟" : item.type === "cycling" ? "🚲" : "🏋️"}
                    </Text>
                    <View>
                      <Text style={styles.dayWorkoutName}>{item.title}</Text>
                      <Text style={styles.dayWorkoutMeta}>
                        {Math.floor(item.duration / 60)} min
                        {item.distance ? ` • ${item.distance.toFixed(1)}km` : ""}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.dayWorkoutArrow}>➔</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Motivational Message */}
        <View style={styles.motivationalContainer}>
          <Text style={styles.motivationalIcon}>💪</Text>
          <Text style={styles.motivationalText}>
            Continue se movimentando! Cada dia é uma oportunidade de progresso.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal: Complete Workout details and AI Narrative */}
      <Modal
        visible={selectedWorkoutIdForDetail !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedWorkoutIdForDetail(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedWorkoutDetail && (
              <>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <Text style={styles.workoutIconDetail}>
                      {selectedWorkoutDetail.type === "run"
                        ? "👟"
                        : selectedWorkoutDetail.type === "cycling"
                        ? "🚲"
                        : "🏋️"}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalTitle} numberOfLines={1}>{selectedWorkoutDetail.title}</Text>
                      <Text style={styles.modalSubtitle}>
                        {new Date(selectedWorkoutDetail.date).toLocaleDateString("pt-BR", {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedWorkoutIdForDetail(null)}>
                    <Text style={styles.modalCloseButton}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                  {/* Intensity Row */}
                  <View style={styles.modalIntensityRow}>
                    <Text style={styles.intensityLabelDetail}>Intensidade:</Text>
                    <View
                      style={[
                        styles.intensityBadgeDetail,
                        {
                          backgroundColor:
                            selectedWorkoutDetail.intensity === "high"
                              ? "#421f1f"
                              : selectedWorkoutDetail.intensity === "moderate"
                              ? "#422c1f"
                              : "#1f3a42",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.intensityTextDetail,
                          {
                            color:
                              selectedWorkoutDetail.intensity === "high"
                                ? "#ff6b6b"
                                : selectedWorkoutDetail.intensity === "moderate"
                                ? "#ffa94d"
                                : "#51cf66",
                          },
                        ]}
                      >
                        {selectedWorkoutDetail.intensity === "low"
                          ? "Leve"
                          : selectedWorkoutDetail.intensity === "moderate"
                          ? "Moderado"
                          : "Intenso"}
                      </Text>
                    </View>
                  </View>

                  {/* Metrics Grid */}
                  <View style={styles.modalMetricsGrid}>
                    <View style={styles.modalMetricCard}>
                      <Text style={styles.modalMetricLabel}>Duração</Text>
                      <Text style={styles.modalMetricValue}>
                        {Math.floor(selectedWorkoutDetail.duration / 3600) > 0
                          ? `${Math.floor(selectedWorkoutDetail.duration / 3600)}h ${Math.floor(
                              (selectedWorkoutDetail.duration % 3600) / 60
                            )}m`
                          : `${Math.floor((selectedWorkoutDetail.duration % 3600) / 60)} min`}
                      </Text>
                    </View>
                    {selectedWorkoutDetail.distance && (
                      <View style={styles.modalMetricCard}>
                        <Text style={styles.modalMetricLabel}>Distância</Text>
                        <Text style={styles.modalMetricValue}>
                          {selectedWorkoutDetail.distance.toFixed(1)} km
                        </Text>
                      </View>
                    )}
                    {selectedWorkoutDetail.pace && (
                      <View style={styles.modalMetricCard}>
                        <Text style={styles.modalMetricLabel}>Velocidade</Text>
                        <Text style={styles.modalMetricValue}>
                          {selectedWorkoutDetail.pace.toFixed(1)} km/h
                        </Text>
                      </View>
                    )}
                    {selectedWorkoutDetail.avgHeartRate && (
                      <View style={styles.modalMetricCard}>
                        <Text style={styles.modalMetricLabel}>BPM Médio</Text>
                        <Text style={styles.modalMetricValue}>
                          {selectedWorkoutDetail.avgHeartRate} bpm
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* IA Analysis Narrative Section */}
                  <View style={styles.modalIaSection}>
                    <Text style={styles.modalIaTitle}>🧠 Análise do Sidekick (IA)</Text>
                    
                    {selectedWorkoutDetail.aiNarrative ? (
                      <View style={styles.modalNarrativeContainer}>
                        <Text style={styles.modalNarrativeText}>
                          {selectedWorkoutDetail.aiNarrative}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.modalIaEmpty}>
                        <Text style={styles.modalIaEmptyText}>
                          Nenhuma análise gerada para esta atividade física ainda.
                        </Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={[styles.modalAnalyzeButton, analyzingWorkoutId === selectedWorkoutDetail.id && styles.modalAnalyzeButtonDisabled]}
                      onPress={() => handleAnalyzeWorkout(selectedWorkoutDetail.id)}
                      disabled={analyzingWorkoutId === selectedWorkoutDetail.id}
                    >
                      {analyzingWorkoutId === selectedWorkoutDetail.id ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <Text style={styles.modalAnalyzeButtonText}>
                          {selectedWorkoutDetail.aiNarrative ? "🔄 Reanalisar com IA" : "🧠 Analisar com IA"}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </>
            )}
            
            {/* Close action */}
            <TouchableOpacity
              style={styles.modalCloseAction}
              onPress={() => setSelectedWorkoutIdForDetail(null)}
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
  onPress?: () => void;
}

function StatCard({ label, value, onPress }: StatCardProps) {
  return (
    <TouchableOpacity 
      style={styles.statCard} 
      onPress={onPress} 
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

interface DayBadgeProps {
  day: string;
  status: "empty" | "filled" | "upcoming";
  onPress: () => void;
  hasWorkouts: boolean;
}

function DayBadge({ day, status, onPress, hasWorkouts }: DayBadgeProps) {
  const isFilled = status === "filled";
  const isUpcoming = status === "upcoming";

  return (
    <TouchableOpacity
      style={[
        styles.dayBadge,
        {
          backgroundColor: isFilled ? Colors.success : isUpcoming ? "#ffb703" : Colors.darkCard,
          borderColor: isFilled ? Colors.success : isUpcoming ? "#ffb703" : Colors.darkBorder,
        },
      ]}
      onPress={onPress}
      disabled={!hasWorkouts}
    >
      <Text
        style={[
          styles.dayBadgeDay,
          { color: isFilled || isUpcoming ? Colors.dark : Colors.textSecondary },
        ]}
      >
        {day}
      </Text>
      {(isFilled || isUpcoming) && <Text style={styles.dayBadgeCheck}>✓</Text>}
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
    marginBottom: 20,
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
    marginBottom: 20,
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
    fontSize: 22,
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
    marginBottom: 20,
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
  dayWorkoutsContainer: {
    marginTop: 16,
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
  },
  dayWorkoutsTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
  },
  dayWorkoutItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.dark,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
  },
  dayWorkoutItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dayWorkoutIcon: {
    fontSize: 24,
  },
  dayWorkoutName: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  dayWorkoutMeta: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  dayWorkoutArrow: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: "bold",
  },
  motivationalContainer: {
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    alignItems: "center",
    marginTop: 10,
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
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.darkCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 24,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  workoutIconDetail: {
    fontSize: 32,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  modalCloseButton: {
    fontSize: 24,
    color: Colors.textSecondary,
    padding: 4,
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalIntensityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  intensityLabelDetail: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginRight: 8,
  },
  intensityBadgeDetail: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  intensityTextDetail: {
    fontSize: 12,
    fontWeight: "600",
  },
  modalMetricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  modalMetricCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: Colors.dark,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
  },
  modalMetricLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  modalMetricValue: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  modalIaSection: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.darkBorder,
    paddingTop: 16,
  },
  modalIaTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 12,
  },
  modalNarrativeContainer: {
    backgroundColor: Colors.dark,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  modalNarrativeText: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  modalIaEmpty: {
    backgroundColor: Colors.dark,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    borderStyle: "dashed",
  },
  modalIaEmptyText: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
  },
  modalAnalyzeButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  modalAnalyzeButtonDisabled: {
    opacity: 0.7,
  },
  modalAnalyzeButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  modalCloseAction: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 16,
    alignItems: "center",
  },
  modalCloseActionText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: "600",
  },
});
