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
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  TextInput,
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
  const [selectedWorkoutIdForDetail, setSelectedWorkoutIdForDetail] = useState<string | null>(null);

  const [effortModalVisible, setEffortModalVisible] = useState(false);
  const [effortRating, setEffortRating] = useState<number>(3);
  const [userNotes, setUserNotes] = useState("");
  const [targetWorkoutId, setTargetWorkoutId] = useState<string | null>(null);

  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);

  const getNotifications = () => {
    const list = [];
    const p = user?.profile?.aiPersonality || "calm";
    const t = user?.profile?.aiTone || "motivational";
    
    // 1. Companheiro Mensagem
    let companionMsg = "Aproveite o dia para dar o seu melhor!";
    if (p === "strict") {
      companionMsg = "Sem desculpas hoje. Foco na planilha e disciplina!";
    } else if (p === "tough") {
      companionMsg = "Levanta desse sofá e vai treinar! Você consegue fazer melhor!";
    } else if (t === "sarcastic") {
      companionMsg = "A meta não vai se atingir sozinha enquanto você dorme... ou vai? 😏";
    } else if (t === "funny") {
      companionMsg = "Correr é que nem boleto: se você não pagar, o juros vem depois! 🃏";
    }
    
    list.push({
      id: "companion",
      icon: "🧠",
      title: `${user?.profile?.trainingGoal || "Companheiro"}`,
      description: companionMsg,
      time: "Agora",
    });

    // 2. Treinos pendentes
    const pendingAnalysisCount = workouts.filter(w => !w.aiNarrative).length;
    if (pendingAnalysisCount > 0) {
      list.push({
        id: "workouts",
        icon: "👟",
        title: "Treinos para analisar",
        description: `Você tem ${pendingAnalysisCount} treino${pendingAnalysisCount > 1 ? "s" : ""} pendente${pendingAnalysisCount > 1 ? "s" : ""} de análise de IA.`,
        time: "10m atrás",
      });
    }

    // 3. Calendário / Planejamento
    list.push({
      id: "calendar",
      icon: "📅",
      title: "Planejamento Semanal",
      description: "Confira seus lembretes e programações de corrida na aba de Calendário.",
      time: "1h atrás",
    });

    return list;
  };

  const latestWorkout = workouts[0];
  const today = new Date();
  
  // Calculate current week Monday
  const currentWeekMonday = new Date(today);
  const todayDay = today.getDay();
  const mondayOffset = todayDay === 0 ? -6 : 1 - todayDay;
  currentWeekMonday.setDate(today.getDate() + mondayOffset);
  currentWeekMonday.setHours(0, 0, 0, 0);

  // Calculate current week Sunday
  const currentWeekSunday = new Date(currentWeekMonday);
  currentWeekSunday.setDate(currentWeekMonday.getDate() + 6);
  currentWeekSunday.setHours(23, 59, 59, 999);

  // Filter workouts belonging ONLY to this week
  const weeklyWorkouts = workouts.filter(w => {
    const d = new Date(w.date);
    return d >= currentWeekMonday && d <= currentWeekSunday;
  });

  // Group weekly workouts by day
  const weeklyWorkoutsByDay: Record<number, any[]> = {};
  DAY_NUMBERS.forEach(num => {
    weeklyWorkoutsByDay[num] = [];
  });
  weeklyWorkouts.forEach(w => {
    const d = new Date(w.date);
    const dayOfWeek = d.getDay();
    if (weeklyWorkoutsByDay[dayOfWeek]) {
      weeklyWorkoutsByDay[dayOfWeek].push(w);
    }
  });

  const selectedDayWorkouts = selectedDayIndex !== null 
    ? (weeklyWorkoutsByDay[DAY_NUMBERS[selectedDayIndex]] || [])
    : [];

  useEffect(() => {
    const monday = new Date(today);
    const offset = today.getDay() === 0 ? -6 : 1 - today.getDay();
    monday.setDate(today.getDate() + offset);
    monday.setHours(0, 0, 0, 0);
    loadWeeklyWorkouts(monday);
  }, []);

  const handleMoodSelect = async (moodId: string, emoji: string) => {
    await setMood(moodId, emoji);
  };

  const handleOpenAnalyzeModal = (workout: any) => {
    setTargetWorkoutId(workout.id);
    setEffortRating(workout.effortRating || 3);
    setUserNotes(workout.userNotes || workout.description || "");
    setEffortModalVisible(true);
  };

  const submitAnalysis = async () => {
    if (!targetWorkoutId) return;
    setEffortModalVisible(false);
    
    try {
      setAnalyzingWorkoutId(targetWorkoutId);
      await analyzeWorkout(targetWorkoutId, effortRating, userNotes);
      Alert.alert("Análise concluída", "A análise Gemini foi gerada com sucesso.");
    } catch (error) {
      console.error("Error analyzing workout:", error);
      Alert.alert("Erro", "Não foi possível gerar a análise. Tente novamente.");
    } finally {
      setAnalyzingWorkoutId(null);
      setTargetWorkoutId(null);
    }
  };

  const handleDayPress = (dayIndex: number) => {
    if (selectedDayIndex === dayIndex) {
      setSelectedDayIndex(null);
    } else {
      setSelectedDayIndex(dayIndex);
    }
  };

  const handleWorkoutPress = (workoutId: string) => {
    router.push(`/history?workoutId=${workoutId}`);
  };

  const getDayBadgeColor = (dayIndex: number): "empty" | "filled" | "upcoming" => {
    const dayOfWeek = DAY_NUMBERS[dayIndex];
    const hasWorkout = weeklyWorkoutsByDay[dayOfWeek] && weeklyWorkoutsByDay[dayOfWeek].length > 0;
    if (!hasWorkout) return "empty";

    const dayDate = new Date(currentWeekMonday);
    dayDate.setDate(currentWeekMonday.getDate() + dayIndex);
    return dayDate <= today ? "filled" : "upcoming";
  };

  // Dynamic weekly statistics calculation
  const totalSeconds = weeklyWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const totalTimeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  const totalDistance = weeklyWorkouts.reduce((sum, w) => sum + (w.distance || 0), 0);
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
        <View style={styles.headerContainer}>
          <View style={styles.headerTextGroup}>
            <Text style={styles.greeting}>Olá, {user?.name}! 👋</Text>
            <Text style={styles.subtitle}>Bem-vindo ao seu Dashboard</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => setNotificationsModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 24 }}>🔔</Text>
            {getNotifications().length > 0 && (
              <View style={styles.notificationBadge} />
            )}
          </TouchableOpacity>
        </View>

        {/* Stats Container */}
        <View style={styles.statsContainer}>
          <StatCard 
            label="Treinos Semana" 
            value={weeklyWorkouts.length.toString()} 
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

        {/* Goal Progress Card */}
        {user?.profile?.isConfigured && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎯 Meta de Evolução</Text>
            <View style={styles.goalCard}>
              <View style={styles.goalHeaderRow}>
                <Text style={styles.goalName}>
                  {user.profile.goalDistance === "5k" ? "Corrida de 5km" :
                   user.profile.goalDistance === "10k" ? "Corrida de 10km" :
                   user.profile.goalDistance === "15k" ? "Corrida de 15km" :
                   user.profile.goalDistance === "half_marathon" ? "Meia Maratona (21km)" :
                   user.profile.goalDistance === "marathon" ? "Maratona (42km)" : "Meta Personalizada"}
                </Text>
                {user.profile.goalTargetTime && (
                  <Text style={styles.goalTarget}>Tempo alvo: {user.profile.goalTargetTime}</Text>
                )}
              </View>

              {/* Progress: Weekly frequency */}
              <View style={styles.goalMetricRow}>
                <View style={{ flex: 1, marginBottom: 8 }}>
                  <Text style={styles.goalMetricLabel}>Frequência Semanal</Text>
                  <Text style={styles.goalMetricValue}>
                    {weeklyWorkouts.length} de {user.profile.weeklyFrequency || 3} treinos realizados
                  </Text>
                </View>
                {/* Progress bar */}
                <View style={styles.progressBarBg}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { 
                        width: `${Math.min(100, (weeklyWorkouts.length / (user.profile.weeklyFrequency || 3)) * 100)}%`,
                        backgroundColor: weeklyWorkouts.length >= (user.profile.weeklyFrequency || 3) ? Colors.success : Colors.primary
                      }
                    ]} 
                  />
                </View>
              </View>

              {/* Highlight best workout against target */}
              <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.darkBorder }}>
                <Text style={styles.goalAdviseText}>
                  {weeklyWorkouts.length === 0 
                    ? "Nenhum treino realizado ainda esta semana. Calce os tênis e comece!"
                    : weeklyWorkouts.length >= (user.profile.weeklyFrequency || 3)
                    ? "Meta de frequência semanal batida! Excelente consistência! 🔥"
                    : "Continue firme! Você está no caminho certo para cumprir sua planilha."}
                </Text>
              </View>
            </View>
          </View>
        )}

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
                      onPress={() => handleOpenAnalyzeModal(selectedWorkoutDetail)}
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

      {/* Sub-modal: Percepção de esforço e notas */}
      <Modal
        visible={effortModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setEffortModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableWithoutFeedback onPress={() => setEffortModalVisible(false)}>
            <View style={styles.effortModalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.effortModalContent}>
                  <Text style={styles.effortModalTitle}>Como foi o seu treino? 🤔</Text>
                  <Text style={styles.effortModalSubtitle}>
                    Defina o esforço físico e anote como se sentiu para calibrar o conselho do seu companheiro.
                  </Text>

                  <Text style={styles.effortLabel}>Esforço Percebido:</Text>
                  <View style={styles.effortRatingContainer}>
                    {[1, 2, 3, 4, 5].map((num) => {
                      const labelMap = ["😌", "🙂", "🏃", "🥵", "💀"];
                      return (
                        <TouchableOpacity
                          key={num}
                          style={[
                            styles.effortRatingButton,
                            effortRating === num && styles.effortRatingButtonActive,
                          ]}
                          onPress={() => setEffortRating(num)}
                        >
                          <Text style={styles.effortRatingEmoji}>{labelMap[num - 1]}</Text>
                          <Text style={styles.effortRatingLabel}>{num}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text style={styles.effortRatingDesc}>
                    {["Muito Leve (Sem esforço)", "Leve (Respiração normal)", "Moderado (Cansaço médio)", "Intenso (Respiração pesada)", "Exaustivo (Limite físico)"][effortRating - 1]}
                  </Text>

                  <Text style={styles.effortLabel}>Suas observações / Como se sentiu:</Text>
                  <TextInput
                    style={styles.effortInput}
                    placeholder="Ex: cansaço nas subidas, pernas leves, etc..."
                    placeholderTextColor="#888"
                    value={userNotes}
                    onChangeText={setUserNotes}
                    multiline
                  />

                  <View style={styles.effortModalActions}>
                    <TouchableOpacity
                      style={[styles.effortModalButton, styles.effortModalButtonCancel]}
                      onPress={() => setEffortModalVisible(false)}
                    >
                      <Text style={styles.effortModalButtonTextCancel}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.effortModalButton, styles.effortModalButtonConfirm]}
                      onPress={submitAnalysis}
                    >
                      <Text style={styles.effortModalButtonTextConfirm}>Analisar com IA</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal: Painel de Notificações */}
      <Modal
        visible={notificationsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setNotificationsModalVisible(false)}
      >
        <View style={styles.notificationsModalOverlay}>
          <View style={styles.notificationsModalContent}>
            <View style={styles.notificationsModalHeader}>
              <Text style={styles.notificationsModalTitle}>🔔 Notificações</Text>
              <TouchableOpacity onPress={() => setNotificationsModalVisible(false)}>
                <Text style={styles.notificationsModalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.notificationsList} showsVerticalScrollIndicator={false}>
              {getNotifications().length === 0 ? (
                <Text style={styles.notificationsEmpty}>Nenhuma notificação por aqui.</Text>
              ) : (
                getNotifications().map((notif) => (
                  <View key={notif.id} style={styles.notificationCard}>
                    <Text style={styles.notificationCardIcon}>{notif.icon}</Text>
                    <View style={styles.notificationCardBody}>
                      <Text style={styles.notificationCardTitle}>{notif.title}</Text>
                      <Text style={styles.notificationCardDesc}>{notif.description}</Text>
                      <Text style={styles.notificationCardTime}>{notif.time}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
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
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  headerTextGroup: {
    flex: 1,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.darkCard,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  notificationsModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  notificationsModalContent: {
    backgroundColor: Colors.darkCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    height: "60%",
    padding: 20,
  },
  notificationsModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.darkBorder,
  },
  notificationsModalTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  notificationsModalClose: {
    color: Colors.textSecondary,
    fontSize: 20,
    fontWeight: "600",
    paddingHorizontal: 8,
  },
  notificationsList: {
    flex: 1,
  },
  notificationsEmpty: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    marginTop: 40,
  },
  notificationCard: {
    flexDirection: "row",
    backgroundColor: Colors.dark,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  notificationCardIcon: {
    fontSize: 24,
  },
  notificationCardBody: {
    flex: 1,
  },
  notificationCardTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  notificationCardDesc: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  notificationCardTime: {
    color: Colors.textSecondary,
    fontSize: 11,
    opacity: 0.6,
  },
  goalCard: {
    backgroundColor: Colors.darkCard,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    borderRadius: 16,
    padding: 16,
  },
  goalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  goalName: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  goalTarget: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  goalMetricRow: {
    marginBottom: 6,
  },
  goalMetricLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  goalMetricValue: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  progressBarBg: {
    height: 6,
    backgroundColor: Colors.dark,
    borderRadius: 3,
    width: "100%",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  goalAdviseText: {
    color: Colors.textSecondary,
    fontSize: 12.5,
    fontStyle: "italic",
    lineHeight: 18,
  },
  effortModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
  },
  effortModalContent: {
    width: "90%",
    backgroundColor: Colors.darkCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    padding: 20,
  },
  effortModalTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  effortModalSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
    textAlign: "center",
  },
  effortLabel: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 8,
  },
  effortRatingContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  effortRatingButton: {
    flex: 1,
    backgroundColor: Colors.dark,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginHorizontal: 3,
  },
  effortRatingButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: "#2a1f1f",
  },
  effortRatingEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  effortRatingLabel: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: "600",
  },
  effortRatingDesc: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 12,
  },
  effortInput: {
    backgroundColor: Colors.dark,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 14,
    height: 80,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  effortModalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  effortModalButton: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  effortModalButtonCancel: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    marginRight: 8,
  },
  effortModalButtonConfirm: {
    backgroundColor: Colors.primary,
  },
  effortModalButtonTextCancel: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  effortModalButtonTextConfirm: {
    color: "#0a0a0a",
    fontSize: 14,
    fontWeight: "700",
  },
});
