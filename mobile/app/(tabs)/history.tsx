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
import { useLocalSearchParams } from "expo-router";
import { useDashboard } from "@/src/contexts/DashboardContext";
import { WorkoutCard } from "@/components/WorkoutCard";

const Colors = {
  dark: "#0a0a0a",
  darkCard: "#1a1a1a",
  darkBorder: "#333333",
  text: "#ffffff",
  textSecondary: "#b0b0b0",
  primary: "#ff6b6b",
  success: "#51cf66",
};

type FilterType = "all" | "run" | "cycling" | "strength";

export default function HistoryScreen() {
  const { workouts, analyzeWorkout } = useDashboard();
  const { workoutId } = useLocalSearchParams();
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [analyzingWorkoutId, setAnalyzingWorkoutId] = useState<string | null>(null);

  // Auto-open modal if workoutId is passed via URL query params (e.g. redirected from other screens)
  useEffect(() => {
    if (workoutId) {
      setSelectedWorkoutId(String(workoutId));
    }
  }, [workoutId]);

  const selectedWorkout = workoutId
    ? workouts.find((workout) => workout.id === workoutId)
    : null;

  const filteredWorkouts = selectedWorkout
    ? [selectedWorkout]
    : filter === "all"
    ? workouts
    : workouts.filter((w) => w.type === filter);

  const selectedWorkoutDetail = workouts.find((w) => w.id === selectedWorkoutId);

  const [effortModalVisible, setEffortModalVisible] = useState(false);
  const [effortRating, setEffortRating] = useState<number>(3);
  const [userNotes, setUserNotes] = useState("");
  const [targetWorkoutId, setTargetWorkoutId] = useState<string | null>(null);

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Histórico de Treinos</Text>
          <Text style={styles.subtitle}>
            {filteredWorkouts.length} treinos encontrados
          </Text>
        </View>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScrollView}
          contentContainerStyle={styles.filterContainer}
        >
          <FilterButton
            label="Todos"
            icon="📊"
            active={filter === "all"}
            onPress={() => setFilter("all")}
          />
          <FilterButton
            label="Corrida"
            icon="👟"
            active={filter === "run"}
            onPress={() => setFilter("run")}
          />
          <FilterButton
            label="Ciclismo"
            icon="🚲"
            active={filter === "cycling"}
            onPress={() => setFilter("cycling")}
          />
          <FilterButton
            label="Musculação"
            icon="🏋️"
            active={filter === "strength"}
            onPress={() => setFilter("strength")}
          />
        </ScrollView>

        {/* Workouts List */}
        {filteredWorkouts.length > 0 ? (
          filteredWorkouts.map((workout) => (
            <WorkoutCard 
              key={workout.id} 
              workout={workout} 
              onPress={() => setSelectedWorkoutId(workout.id)}
              compact={true}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyText}>Nenhum treino neste filtro</Text>
          </View>
        )}

        <View style={{ height: 50 }} />
      </ScrollView>

      {/* Modal: Detailed Workout view & IA Analysis */}
      <Modal
        visible={selectedWorkoutId !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedWorkoutId(null)}
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
                  <TouchableOpacity onPress={() => setSelectedWorkoutId(null)}>
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
              onPress={() => setSelectedWorkoutId(null)}
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
    </SafeAreaView>
  );
}

interface FilterButtonProps {
  label: string;
  icon: string;
  active: boolean;
  onPress: () => void;
}

function FilterButton({ label, icon, active, onPress }: FilterButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.filterButton, active && styles.filterButtonActive]}
      onPress={onPress}
    >
      <Text style={styles.filterIcon}>{icon}</Text>
      <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>
        {label}
      </Text>
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
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  filterScrollView: {
    marginBottom: 20,
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  filterContainer: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 32,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.darkCard,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  filterLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },
  filterLabelActive: {
    color: Colors.text,
  },
  emptyState: {
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    padding: 40,
    alignItems: "center",
    marginTop: 20,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
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
