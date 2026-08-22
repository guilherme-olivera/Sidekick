import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  Text,
  StyleSheet,
  View,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import Calendar from "@/components/Calendar";
import { useDashboard } from "@/src/contexts/DashboardContext";
import { useAuth } from "@/src/contexts/AuthContext";
import { CalendarEvent } from "@/src/services/calendarMockService";
import * as Speech from "expo-speech";
const formatPace = (speedKmH: number | null | undefined) => {
  if (!speedKmH || speedKmH <= 0) return "-";
  const totalMinutes = 60 / speedKmH;
  const minutes = Math.floor(totalMinutes);
  const seconds = Math.round((totalMinutes - minutes) * 60);
  const secondsStr = seconds < 10 ? `0${seconds}` : seconds;
  return `${minutes}:${secondsStr} /km`;
};

export default function CalendarScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    loadWorkouts,
    workouts,
    analyzeWorkout,
    calendarEvents,
    loadCalendarEvents,
    getCalendarEventsByDate,
    createEvent,
    updateEvent,
    deleteEvent,
  } = useDashboard();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [time, setTime] = useState("08:00");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Estados para Detalhes do Treino (Análise de IA & TTS)
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [analyzingWorkoutId, setAnalyzingWorkoutId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [effortModalVisible, setEffortModalVisible] = useState(false);
  const [effortRating, setEffortRating] = useState<number>(3);
  const [userNotes, setUserNotes] = useState("");
  const [targetWorkoutId, setTargetWorkoutId] = useState<string | null>(null);
  const [shareCardVisible, setShareCardVisible] = useState(false);
  const [sharingWorkout, setSharingWorkout] = useState<any>(null);

  const handleGenerateShareCard = (workout: any) => {
    setSharingWorkout(workout);
    setShareCardVisible(true);
  };

  const selectedWorkoutDetail = workouts.find((w) => w.id === selectedWorkoutId);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

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

  const handleToggleSpeech = (text: string) => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      Speech.speak(text, {
        language: "pt-BR",
        onDone: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    }
  };

  const handleCloseDetailModal = () => {
    Speech.stop();
    setIsSpeaking(false);
    setSelectedWorkoutId(null);
  };

  useEffect(() => {
    loadWorkouts();
  }, []);

  const selectedDayEvents = selectedDate ? getCalendarEventsByDate(selectedDate) : [];

  const formatCalendarLabel = (isoDate: string) => {
    const [year, month, day] = isoDate.split('-');
    const monthNames = [
      'janeiro',
      'fevereiro',
      'março',
      'abril',
      'maio',
      'junho',
      'julho',
      'agosto',
      'setembro',
      'outubro',
      'novembro',
      'dezembro',
    ];
    const monthIndex = Number(month) - 1;
    return `${Number(day)} ${monthNames[monthIndex]}`;
  };

  const startNewEvent = (isoDate: string) => {
    setSelectedDate(isoDate);
    setTitle("");
    setDescription("");
    setTime("08:00");
    setEditingId(null);
    setModalVisible(true);
  };

  const handleDayPress = (isoDate: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const dayEvents = getCalendarEventsByDate(isoDate);
    
    if (isoDate < todayStr) {
      if (dayEvents.length > 0) {
        setSelectedDate(isoDate);
        setTitle("");
        setDescription("");
        setTime("08:00");
        setEditingId(null);
        setModalVisible(true);
      } else {
        Alert.alert("Bloqueado", "Não é permitido criar lembretes em datas passadas.");
      }
      return;
    }
    startNewEvent(isoDate);
  };

  const handleEventEdit = (event: CalendarEvent) => {
    setSelectedDate(event.date);
    setTitle(event.title);
    setDescription(event.description || "");
    setTime(event.time || "08:00");
    setEditingId(event.id);
    setModalVisible(true);
  };

  const handleEventPress = (event: CalendarEvent) => {
    if (event.isWorkout) {
      setModalVisible(false);
      setSelectedWorkoutId(event.id);
      return;
    }

    // It's a manual reminder. Check if past:
    const todayStr = new Date().toISOString().split('T')[0];
    const isPast = event.date < todayStr;

    if (isPast) {
      Alert.alert(
        "Lembrete Passado",
        "Este lembrete é de uma data passada. O que você deseja fazer?",
        [
          {
            text: "Replicar para amanhã",
            onPress: async () => {
              try {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const tomorrowStr = tomorrow.toISOString().split('T')[0];

                await createEvent({
                  title: event.title,
                  description: event.description,
                  time: event.time,
                  type: event.type,
                  date: tomorrowStr,
                });
                Alert.alert("Sucesso", "Lembrete replicado para amanhã!");
              } catch (err) {
                console.error(err);
                Alert.alert("Erro", "Não foi possível replicar o lembrete.");
              }
            }
          },
          {
            text: "Deletar",
            style: "destructive",
            onPress: async () => {
              try {
                await deleteEvent(event.id);
                Alert.alert("Sucesso", "Lembrete deletado!");
              } catch (err) {
                console.error(err);
                Alert.alert("Erro", "Não foi possível deletar o lembrete.");
              }
            }
          },
          {
            text: "Cancelar",
            style: "cancel"
          }
        ]
      );
    } else {
      handleEventEdit(event);
    }
  };

  const handleSave = async () => {
    if (!selectedDate) return;
    if (!title.trim()) {
      Alert.alert("Preencha o título", "O evento precisa de um nome para ser salvo.");
      return;
    }

    // Double check creation date
    const todayStr = new Date().toISOString().split('T')[0];
    if (selectedDate < todayStr && !editingId) {
      Alert.alert("Erro", "Não é permitido criar lembretes em datas passadas.");
      return;
    }

    try {
      const payload = {
        date: selectedDate,
        title: title.trim(),
        description: description.trim(),
        time: time.trim() || "08:00",
      };

      if (editingId) {
        await updateEvent(editingId, payload);
      } else {
        await createEvent(payload);
      }

      setModalVisible(false);
    } catch (err) {
      console.error(err);
      Alert.alert("Erro", "Não foi possível salvar o evento.");
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    try {
      await deleteEvent(editingId);
      setModalVisible(false);
    } catch (err) {
      console.error(err);
      Alert.alert("Erro", "Não foi possível remover o evento.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Calendário</Text>
      </View>

      <Calendar events={calendarEvents} onDayPress={handleDayPress} />

      <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeaderRow}>
                    <View>
                      <Text style={styles.modalTitle}>{selectedDate ? formatCalendarLabel(selectedDate) : "Selecionar data"}</Text>
                      <Text style={styles.modalSubtitle}>Eventos e lembretes</Text>
                    </View>
                    <TouchableOpacity onPress={() => setModalVisible(false)}>
                      <Text style={styles.closeIcon}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {selectedDayEvents.length > 0 ? (
                    <View style={styles.eventList}>
                      {selectedDayEvents.map((event) => (
                        <TouchableOpacity
                          key={event.id}
                          style={styles.eventRow}
                          onPress={() => handleEventPress(event)}
                        >
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                              <View style={[
                                styles.smallDot,
                                event.isWorkout ? styles.smallWorkoutDot : styles.smallReminderDot
                              ]} />
                              <Text style={[styles.eventTitle, { marginBottom: 0 }]}>{event.title}</Text>
                            </View>
                            <Text style={styles.eventSubtitle} numberOfLines={2}>
                              {event.description || "Sem descrição"}
                            </Text>
                            <Text style={styles.eventMeta}>{event.time}</Text>
                          </View>
                          <Text style={[
                            styles.eventSource,
                            event.isWorkout ? { color: "#51cf66" } : { color: "#ff922b" }
                          ]}>
                            {event.isWorkout ? "Treino" : "Lembrete"}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.emptyText}>
                      Nenhum evento salvo para este dia. Crie um novo evento abaixo.
                    </Text>
                  )}

                  {!(selectedDate && selectedDate < new Date().toISOString().split('T')[0]) ? (
                    <>
                      <Text style={styles.sectionLabel}>{editingId ? "Editar evento" : "Criar novo lembrete"}</Text>
                      <TextInput
                        value={title}
                        onChangeText={setTitle}
                        placeholder="Título"
                        style={styles.input}
                        placeholderTextColor="#888"
                      />
                      <TextInput
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Descrição"
                        style={[styles.input, styles.textArea]}
                        placeholderTextColor="#888"
                        multiline
                      />
                      <Text style={styles.inputLabel}>Horário do Lembrete</Text>
                      <TextInput
                        value={time}
                        onChangeText={setTime}
                        placeholder="Ex: 08:30 ou 14:00"
                        style={styles.input}
                        placeholderTextColor="#888"
                        keyboardType="numbers-and-punctuation"
                        maxLength={5}
                      />

                      <View style={styles.modalActions}>
                        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                          <Text style={styles.saveText}>{editingId ? "Atualizar" : "Salvar"}</Text>
                        </TouchableOpacity>
                        {editingId && (
                          <TouchableOpacity 
                            style={[styles.cancelButtonInline, { backgroundColor: "#e03c3c", borderColor: "#e03c3c" }]} 
                            onPress={handleDelete}
                          >
                            <Text style={[styles.cancelText, { color: "#ffffff" }]}>Excluir</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.cancelButtonInline} onPress={() => setModalVisible(false)}>
                          <Text style={styles.cancelText}>Cancelar</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    <View style={styles.modalActions}>
                      <TouchableOpacity style={styles.saveButton} onPress={() => setModalVisible(false)}>
                        <Text style={styles.saveText}>Fechar</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal: Detailed Workout view & IA Analysis */}
      <Modal
        visible={selectedWorkoutId !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseDetailModal}
      >
        <View style={styles.workoutModalOverlay}>
          <View style={styles.workoutModalContent}>
            {selectedWorkoutDetail && (
              <>
                {/* Modal Header */}
                <View style={styles.workoutModalHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <Text style={styles.workoutIconDetail}>
                      {selectedWorkoutDetail.type === "run"
                        ? "👟"
                        : selectedWorkoutDetail.type === "cycling"
                        ? "🚲"
                        : "🏋️"}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.workoutModalTitle} numberOfLines={1}>{selectedWorkoutDetail.title}</Text>
                      <Text style={styles.workoutModalSubtitle}>
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
                  <TouchableOpacity onPress={handleCloseDetailModal}>
                    <Text style={styles.workoutModalCloseButton}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.workoutModalScroll}>
                  {/* Intensity Row */}
                  <View style={styles.workoutModalIntensityRow}>
                    <Text style={styles.workoutIntensityLabelDetail}>Intensidade:</Text>
                    <View
                      style={[
                        styles.workoutIntensityBadgeDetail,
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
                          styles.workoutIntensityTextDetail,
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
                  <View style={styles.workoutModalMetricsGrid}>
                    <View style={styles.workoutModalMetricCard}>
                      <Text style={styles.workoutModalMetricIcon}>⏱️</Text>
                      <Text style={styles.workoutModalMetricValue}>
                        {Math.floor(selectedWorkoutDetail.duration / 3600) > 0
                          ? `${Math.floor(selectedWorkoutDetail.duration / 3600)}h ${Math.floor(
                              (selectedWorkoutDetail.duration % 3600) / 60
                            )}m`
                          : `${Math.floor((selectedWorkoutDetail.duration % 3600) / 60)} min`}
                      </Text>
                      <Text style={styles.workoutModalMetricSubLabel}>Duração</Text>
                    </View>
                    {selectedWorkoutDetail.distance && (
                      <View style={styles.workoutModalMetricCard}>
                        <Text style={styles.workoutModalMetricIcon}>👟</Text>
                        <Text style={styles.workoutModalMetricValue}>
                          {selectedWorkoutDetail.distance.toFixed(1)} km
                        </Text>
                        <Text style={styles.workoutModalMetricSubLabel}>Distância</Text>
                      </View>
                    )}
                    {selectedWorkoutDetail.pace && (
                      <View style={styles.workoutModalMetricCard}>
                        <Text style={styles.workoutModalMetricIcon}>🏃</Text>
                        <Text style={styles.workoutModalMetricValue}>
                          {selectedWorkoutDetail.type?.toLowerCase().includes("run") || selectedWorkoutDetail.type?.toLowerCase().includes("corrida")
                            ? formatPace(selectedWorkoutDetail.pace)
                            : `${selectedWorkoutDetail.pace.toFixed(1)} km/h`}
                        </Text>
                        <Text style={styles.workoutModalMetricSubLabel}>
                          {selectedWorkoutDetail.type?.toLowerCase().includes("run") || selectedWorkoutDetail.type?.toLowerCase().includes("corrida")
                            ? "Pace Médio"
                            : "Vel. Média"}
                        </Text>
                      </View>
                    )}
                    {selectedWorkoutDetail.avgHeartRate && (
                      <View style={styles.workoutModalMetricCard}>
                        <Text style={styles.workoutModalMetricIcon}>❤️</Text>
                        <Text style={styles.workoutModalMetricValue}>
                          {selectedWorkoutDetail.avgHeartRate} bpm
                        </Text>
                        <Text style={styles.workoutModalMetricSubLabel}>BPM Médio</Text>
                      </View>
                    )}
                    {selectedWorkoutDetail.averageWatts ? (
                      <View style={styles.workoutModalMetricCard}>
                        <Text style={styles.workoutModalMetricIcon}>⚡</Text>
                        <Text style={styles.workoutModalMetricValue}>
                          {selectedWorkoutDetail.averageWatts} W
                        </Text>
                        <Text style={styles.workoutModalMetricSubLabel}>Potência</Text>
                      </View>
                    ) : null}
                    {(selectedWorkoutDetail.type === "run" || selectedWorkoutDetail.type === "cycling" || selectedWorkoutDetail.type?.toLowerCase().includes("corrida") || selectedWorkoutDetail.type?.toLowerCase().includes("ciclismo")) && (
                      <>
                        <View style={styles.workoutModalMetricCard}>
                          <Text style={styles.workoutModalMetricIcon}>🔄</Text>
                          <Text style={styles.workoutModalMetricValue}>
                            {selectedWorkoutDetail.averageCadence ? `${selectedWorkoutDetail.averageCadence}` : "--"}
                          </Text>
                          <Text style={styles.workoutModalMetricSubLabel}>
                            {selectedWorkoutDetail.type?.toLowerCase().includes("run") || selectedWorkoutDetail.type?.toLowerCase().includes("corrida") ? "Cadência (spm)" : "Cadência (rpm)"}
                          </Text>
                        </View>
                        <View style={styles.workoutModalMetricCard}>
                          <Text style={styles.workoutModalMetricIcon}>⛰️</Text>
                          <Text style={styles.workoutModalMetricValue}>
                            {selectedWorkoutDetail.elevationGain ? `${Math.round(selectedWorkoutDetail.elevationGain)} m` : "0 m"}
                          </Text>
                          <Text style={styles.workoutModalMetricSubLabel}>Ganho Elevação</Text>
                        </View>
                      </>
                    )}
                    {selectedWorkoutDetail.effortRating && (
                      <View style={styles.workoutModalMetricCard}>
                        <Text style={styles.workoutModalMetricIcon}>🥵</Text>
                        <Text style={styles.workoutModalMetricValue}>
                          {selectedWorkoutDetail.effortRating} / 5
                        </Text>
                        <Text style={styles.workoutModalMetricSubLabel}>Esforço (RPE)</Text>
                      </View>
                    )}
                  </View>

                  {/* IA Analysis Narrative Section */}
                  <View style={styles.workoutModalIaSection}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <Text style={[styles.workoutModalIaTitle, { marginBottom: 0 }]}>🧠 Análise do Sidekick (IA)</Text>
                      {selectedWorkoutDetail.aiNarrative && (
                        <TouchableOpacity
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            backgroundColor: "#222",
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: "#333",
                          }}
                          onPress={() => handleToggleSpeech(selectedWorkoutDetail.aiNarrative!)}
                        >
                          <Text style={{ color: "#ff6b6b", fontSize: 13, fontWeight: "700" }}>
                            {isSpeaking ? "⏹️ Parar" : "🔊 Ouvir"}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    
                    {selectedWorkoutDetail.aiNarrative ? (
                      <View style={styles.workoutModalNarrativeContainer}>
                        <Text style={styles.workoutModalNarrativeText}>
                          {selectedWorkoutDetail.aiNarrative}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.workoutModalIaEmpty}>
                        <Text style={styles.workoutModalIaEmptyText}>
                          Nenhuma análise gerada para esta atividade física ainda.
                        </Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={[styles.workoutModalAnalyzeButton, analyzingWorkoutId === selectedWorkoutDetail.id && styles.workoutModalAnalyzeButtonDisabled]}
                      onPress={() => handleOpenAnalyzeModal(selectedWorkoutDetail)}
                      disabled={analyzingWorkoutId === selectedWorkoutDetail.id}
                    >
                      {analyzingWorkoutId === selectedWorkoutDetail.id ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <Text style={styles.workoutModalAnalyzeButtonText}>
                          {selectedWorkoutDetail.aiNarrative ? "🔄 Reanalisar com IA" : "🧠 Analisar com IA"}
                        </Text>
                      )}
                    </TouchableOpacity>

                    {selectedWorkoutDetail.aiNarrative && (
                      <TouchableOpacity
                        style={styles.workoutModalShareStoriesButton}
                        onPress={() => handleGenerateShareCard(selectedWorkoutDetail)}
                      >
                        <Text style={styles.workoutModalShareStoriesButtonText}>📸 Compartilhar no Instagram</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </>
            )}
            
            {/* Close action */}
            <TouchableOpacity
              style={styles.workoutModalCloseAction}
              onPress={handleCloseDetailModal}
            >
              <Text style={styles.workoutModalCloseActionText}>Fechar</Text>
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
                    {effortRating === 1 && "Muito Leve"}
                    {effortRating === 2 && "Leve"}
                    {effortRating === 3 && "Moderado"}
                    {effortRating === 4 && "Difícil"}
                    {effortRating === 5 && "Exaustivo / Máximo"}
                  </Text>

                  <Text style={styles.effortLabel}>Notas / Observações:</Text>
                  <TextInput
                    value={userNotes}
                    onChangeText={setUserNotes}
                    placeholder="Escreva como se sentiu, dores, clima ou observações gerais..."
                    style={styles.effortInput}
                    placeholderTextColor="#666"
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
                      <Text style={styles.effortModalButtonTextConfirm}>Analisar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Instagram Stories Share Mockup Modal */}
      <Modal
        visible={shareCardVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShareCardVisible(false)}
      >
        <View style={styles.shareModalOverlay}>
          <View style={styles.shareModalContent}>
            <View style={styles.shareModalHeader}>
              <Text style={styles.shareModalTitle}>Visualização dos Stories</Text>
              <TouchableOpacity onPress={() => setShareCardVisible(false)}>
                <Text style={{ color: "#b0b0b0", fontSize: 22 }}>✕</Text>
              </TouchableOpacity>
            </View>

            {sharingWorkout && (
              <ScrollView contentContainerStyle={{ alignItems: "center" }} showsVerticalScrollIndicator={false}>
                {/* 9:16 Instagram Story Preview */}
                <View style={styles.storiesCardFrame}>
                  {/* Decorative Header (Sidekick Premium Logo) */}
                  <View style={styles.storiesCardHeader}>
                    <Text style={styles.storiesCardLogo}>👟 SIDEKICK</Text>
                    <Text style={styles.storiesCardWatermark}>@sidekick.fit</Text>
                  </View>

                  {/* Character Avatar bubble */}
                  <View style={styles.storiesCompanionWrapper}>
                    <View style={styles.storiesCompanionAvatarBg}>
                      <Text style={styles.storiesCompanionAvatar}>
                        {user?.profile?.companionAvatar || "🦖"}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.storiesCompanionName}>
                        {user?.profile?.companionName || "Rocky"}
                      </Text>
                      <Text style={styles.storiesCompanionSub}>Parceiro de Treinos</Text>
                    </View>
                  </View>

                  {/* Bubble Dialogue */}
                  <View style={styles.storiesSpeechBubble}>
                    <Text style={styles.storiesSpeechText}>
                      "{sharingWorkout.aiNarrative ? (sharingWorkout.aiNarrative.length > 180 ? sharingWorkout.aiNarrative.substring(0, 185) + "..." : sharingWorkout.aiNarrative) : "Bora treinar! 🔥"}"
                    </Text>
                  </View>

                  {/* Workout Info Box */}
                  <View style={styles.storiesWorkoutBox}>
                    <Text style={styles.storiesWorkoutTitle}>
                      {sharingWorkout.type === "run" ? "🏃‍♂️ Corrida" :
                       sharingWorkout.type === "cycling" ? "🚴 Ciclismo" : "🏋️ Musculação"}
                    </Text>
                    <Text style={styles.storiesWorkoutDate}>
                      {new Date(sharingWorkout.date).toLocaleDateString("pt-BR")}
                    </Text>

                    <View style={styles.storiesStatsRow}>
                      <View style={styles.storiesStatItem}>
                        <Text style={styles.storiesStatLabel}>Duração</Text>
                        <Text style={styles.storiesStatValue}>
                          {Math.floor(sharingWorkout.duration / 3600) > 0
                            ? `${Math.floor(sharingWorkout.duration / 3600)}h ${Math.floor((sharingWorkout.duration % 3600) / 60)}m`
                            : `${Math.floor((sharingWorkout.duration % 3600) / 60)} min`}
                        </Text>
                      </View>
                      {sharingWorkout.distance && (
                        <View style={styles.storiesStatItem}>
                          <Text style={styles.storiesStatLabel}>Distância</Text>
                          <Text style={styles.storiesStatValue}>
                            {sharingWorkout.distance.toFixed(1)} km
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Actions */}
                <TouchableOpacity
                  style={styles.shareSaveButton}
                  onPress={() => {
                    setShareCardVisible(false);
                    Alert.alert(
                      "Card Pronto! 📸",
                      "O card foi gerado e salvo na sua galeria com sucesso! Abra o Instagram e cole nos seus Stories para comemorar mais essa conquista! 🔥👟"
                    );
                  }}
                >
                  <Text style={styles.shareSaveButtonText}>💾 Salvar e Compartilhar</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "92%",
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  modalSubtitle: {
    color: "#b0b0b0",
    fontSize: 12,
  },
  closeIcon: {
    fontSize: 22,
    color: "#ff6b6b",
  },
  input: {
    backgroundColor: "#0a0a0a",
    color: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: "top",
  },
  rowInputs: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  halfInput: {
    flex: 1,
  },
  typePicker: {
    paddingVertical: 8,
    backgroundColor: "#0a0a0a",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#222",
  },
  typeOption: {
    color: "#b0b0b0",
    fontSize: 12,
    marginBottom: 4,
  },
  typeOptionActive: {
    color: "#51cf66",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  eventList: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: "#0f1411",
    borderWidth: 1,
    borderColor: "#223225",
    padding: 8,
  },
  eventRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    marginBottom: 8,
    backgroundColor: "#171f1a",
    borderRadius: 10,
  },
  eventTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  eventSubtitle: {
    color: "#b0b0b0",
    fontSize: 12,
    marginBottom: 4,
    maxWidth: 180,
  },
  eventSource: {
    color: "#ffb703",
    fontSize: 11,
    fontWeight: "700",
  },
  eventMeta: {
    color: "#b0b0b0",
    fontSize: 12,
  },
  emptyText: {
    color: "#b0b0b0",
    marginBottom: 12,
  },
  sectionLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  saveButton: {
    backgroundColor: "#51cf66",
    padding: 14,
    borderRadius: 10,
    flex: 1,
    alignItems: "center",
  },
  saveText: {
    color: "#000",
    fontWeight: "700",
  },
  cancelButtonInline: {
    backgroundColor: "transparent",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#444",
    flex: 1,
    alignItems: "center",
    marginLeft: 12,
  },
  cancelText: {
    color: "#b0b0b0",
    fontWeight: "700",
  },
  deleteButton: {
    backgroundColor: "#ff6b6b",
    padding: 12,
    borderRadius: 8,
  },
  deleteText: {
    color: "#fff",
    fontWeight: "700",
  },
  smallDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
    marginTop: -2,
  },
  smallWorkoutDot: {
    backgroundColor: "#51cf66",
  },
  smallReminderDot: {
    backgroundColor: "#ff922b",
  },
  workoutModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "flex-end",
  },
  workoutModalContent: {
    backgroundColor: "#1a1a1a",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 24,
    maxHeight: "85%",
    borderWidth: 1,
    borderColor: "#333",
  },
  workoutModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  workoutIconDetail: {
    fontSize: 32,
  },
  workoutModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 2,
  },
  workoutModalSubtitle: {
    fontSize: 12,
    color: "#b0b0b0",
    textTransform: 'capitalize',
  },
  workoutModalCloseButton: {
    fontSize: 24,
    color: "#b0b0b0",
    padding: 4,
  },
  workoutModalScroll: {
    flexGrow: 0,
  },
  workoutModalIntensityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  workoutIntensityLabelDetail: {
    color: "#b0b0b0",
    fontSize: 14,
    marginRight: 8,
  },
  workoutIntensityBadgeDetail: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  workoutIntensityTextDetail: {
    fontSize: 12,
    fontWeight: "600",
  },
  workoutModalMetricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  workoutModalMetricCard: {
    width: "31%",
    backgroundColor: "#0a0a0a",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
  },
  workoutModalMetricIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  workoutModalMetricValue: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  workoutModalMetricSubLabel: {
    color: "#b0b0b0",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 4,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  workoutModalIaSection: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#333",
    paddingTop: 16,
  },
  workoutModalIaTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 12,
  },
  workoutModalNarrativeContainer: {
    backgroundColor: "#0a0a0a",
    borderLeftWidth: 3,
    borderLeftColor: "#ff6b6b",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  workoutModalNarrativeText: {
    color: "#b0b0b0",
    fontSize: 14,
    lineHeight: 20,
  },
  workoutModalIaEmpty: {
    backgroundColor: "#0a0a0a",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#333",
    borderStyle: "dashed",
  },
  workoutModalIaEmptyText: {
    color: "#b0b0b0",
    fontSize: 13,
    textAlign: "center",
  },
  workoutModalAnalyzeButton: {
    backgroundColor: "#ff6b6b",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  workoutModalAnalyzeButtonDisabled: {
    opacity: 0.7,
  },
  workoutModalAnalyzeButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  workoutModalCloseAction: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 16,
    alignItems: "center",
  },
  workoutModalCloseActionText: {
    color: "#b0b0b0",
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
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#333",
    padding: 20,
  },
  effortModalTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  effortModalSubtitle: {
    color: "#b0b0b0",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
    textAlign: "center",
  },
  effortLabel: {
    color: "#ffffff",
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
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginHorizontal: 3,
  },
  effortRatingButtonActive: {
    borderColor: "#ff6b6b",
    backgroundColor: "#2a1f1f",
  },
  effortRatingEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  effortRatingLabel: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  effortRatingDesc: {
    color: "#ff6b6b",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 12,
  },
  effortInput: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#ffffff",
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
    borderColor: "#333",
    marginRight: 8,
  },
  effortModalButtonConfirm: {
    backgroundColor: "#ff6b6b",
  },
  effortModalButtonTextCancel: {
    color: "#b0b0b0",
    fontSize: 14,
    fontWeight: "600",
  },
  effortModalButtonTextConfirm: {
    color: "#0a0a0a",
    fontSize: 14,
    fontWeight: "700",
  },
  inputLabel: {
    color: "#b0b0b0",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 12,
  },
  workoutModalShareStoriesButton: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  workoutModalShareStoriesButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  shareModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  shareModalContent: {
    width: "95%",
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#333",
    padding: 16,
    maxHeight: "90%",
  },
  shareModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingBottom: 10,
  },
  shareModalTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  storiesCardFrame: {
    width: 290,
    height: 480,
    backgroundColor: "#0a0a0a",
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#ff6b6b",
    padding: 20,
    justifyContent: "space-between",
    position: "relative",
    overflow: "hidden",
  },
  storiesCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  storiesCardLogo: {
    color: "#fff",
    fontWeight: "900",
    letterSpacing: 2,
    fontSize: 14,
  },
  storiesCardWatermark: {
    color: "#b0b0b0",
    fontSize: 10.5,
    opacity: 0.5,
  },
  storiesCompanionWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 20,
  },
  storiesCompanionAvatarBg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#ff6b6b",
    justifyContent: "center",
    alignItems: "center",
  },
  storiesCompanionAvatar: {
    fontSize: 26,
  },
  storiesCompanionName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  storiesCompanionSub: {
    color: "#b0b0b0",
    fontSize: 11,
  },
  storiesSpeechBubble: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#333",
    marginTop: 15,
    flex: 1,
    justifyContent: "center",
  },
  storiesSpeechText: {
    color: "#fff",
    fontSize: 12.5,
    lineHeight: 18,
    fontStyle: "italic",
    textAlign: "center",
  },
  storiesWorkoutBox: {
    backgroundColor: "#1a1a1a",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#333",
    marginTop: 16,
    opacity: 0.95,
  },
  storiesWorkoutTitle: {
    color: "#ff6b6b",
    fontSize: 14,
    fontWeight: "700",
  },
  storiesWorkoutDate: {
    color: "#b0b0b0",
    fontSize: 10.5,
    marginBottom: 10,
  },
  storiesStatsRow: {
    flexDirection: "row",
    gap: 16,
  },
  storiesStatItem: {
    flex: 1,
  },
  storiesStatLabel: {
    color: "#b0b0b0",
    fontSize: 10,
  },
  storiesStatValue: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  shareSaveButton: {
    backgroundColor: "#ff6b6b",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
    marginTop: 20,
    width: 290,
  },
  shareSaveButtonText: {
    color: "#0a0a0a",
    fontSize: 15,
    fontWeight: "800",
  },
});
