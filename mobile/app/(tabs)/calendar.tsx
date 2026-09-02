import React, { useEffect, useState, useRef } from "react";
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
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import Svg, { Defs, LinearGradient, Stop, Circle } from "react-native-svg";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import ViewShot, { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
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
  const [activeTemplateIdx, setActiveTemplateIdx] = useState(0);
  const viewShotRef0 = useRef<any>(null);
  const viewShotRef1 = useRef<any>(null);
  const viewShotRef2 = useRef<any>(null);
  const templateScrollRef = useRef<any>(null);

  const handleGenerateShareCard = (workout: any) => {
    setSharingWorkout(workout);
    setActiveTemplateIdx(0);
    setShareCardVisible(true);
  };

  const handleShareCardImage = async () => {
    try {
      const activeRef = activeTemplateIdx === 0 ? viewShotRef0 : activeTemplateIdx === 1 ? viewShotRef1 : viewShotRef2;
      if (!activeRef?.current) {
        Alert.alert("Erro", "Não foi possível gerar a imagem. Tente novamente.");
        return;
      }

      const uri = await captureRef(activeRef, {
        format: "png",
        quality: 0.9,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: "Compartilhar seu Treino Sidekick",
        });
      } else {
        Alert.alert("Erro", "O compartilhamento nativo não está disponível neste aparelho.");
      }
    } catch (err) {
      console.error("Failed to share card image:", err);
      Alert.alert("Erro", "Não foi possível gerar ou salvar o card.");
    }
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
    } catch (error: any) {
      console.error("Error analyzing workout:", error);
      Alert.alert("Aviso", error.message || "Não foi possível gerar a análise. Tente novamente.");
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
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity 
                      onPress={() => handleGenerateShareCard(selectedWorkoutDetail)} 
                      style={{ marginRight: 20, padding: 5 }}
                    >
                      <FontAwesome name="share-alt" size={20} color="#ff6b6b" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleCloseDetailModal} style={{ padding: 5 }}>
                      <Text style={styles.workoutModalCloseButton}>✕</Text>
                    </TouchableOpacity>
                  </View>
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
                        <Text style={styles.workoutModalMetricValue}>
                          {selectedWorkoutDetail.distance.toFixed(1)} km
                        </Text>
                        <Text style={styles.workoutModalMetricSubLabel}>Distância</Text>
                      </View>
                    )}
                    {selectedWorkoutDetail.pace && (
                      <View style={styles.workoutModalMetricCard}>
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
                        <Text style={styles.workoutModalMetricValue}>
                          {selectedWorkoutDetail.avgHeartRate} bpm
                        </Text>
                        <Text style={styles.workoutModalMetricSubLabel}>BPM Médio</Text>
                      </View>
                    )}
                    {selectedWorkoutDetail.averageWatts ? (
                      <View style={styles.workoutModalMetricCard}>
                        <Text style={styles.workoutModalMetricValue}>
                          {selectedWorkoutDetail.averageWatts} W
                        </Text>
                        <Text style={styles.workoutModalMetricSubLabel}>Potência</Text>
                      </View>
                    ) : null}
                    {(selectedWorkoutDetail.type === "run" || selectedWorkoutDetail.type === "cycling" || selectedWorkoutDetail.type?.toLowerCase().includes("corrida") || selectedWorkoutDetail.type?.toLowerCase().includes("ciclismo")) && (
                      <>
                        <View style={styles.workoutModalMetricCard}>
                          <Text style={styles.workoutModalMetricValue}>
                            {selectedWorkoutDetail.averageCadence ? `${selectedWorkoutDetail.averageCadence}` : "--"}
                          </Text>
                          <Text style={styles.workoutModalMetricSubLabel}>
                            {selectedWorkoutDetail.type?.toLowerCase().includes("run") || selectedWorkoutDetail.type?.toLowerCase().includes("corrida") ? "Cadência (spm)" : "Cadência (rpm)"}
                          </Text>
                        </View>
                        <View style={styles.workoutModalMetricCard}>
                          <Text style={styles.workoutModalMetricValue}>
                            {selectedWorkoutDetail.elevationGain ? `${Math.round(selectedWorkoutDetail.elevationGain)} m` : "0 m"}
                          </Text>
                          <Text style={styles.workoutModalMetricSubLabel}>Ganho Elevação</Text>
                        </View>
                      </>
                    )}
                    {selectedWorkoutDetail.effortRating && (
                      <View style={styles.workoutModalMetricCard}>
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

                    {!selectedWorkoutDetail.aiNarrative && (
                      <TouchableOpacity
                        style={[styles.workoutModalAnalyzeButton, analyzingWorkoutId === selectedWorkoutDetail.id && styles.workoutModalAnalyzeButtonDisabled]}
                        onPress={() => handleOpenAnalyzeModal(selectedWorkoutDetail)}
                        disabled={analyzingWorkoutId === selectedWorkoutDetail.id}
                      >
                        {analyzingWorkoutId === selectedWorkoutDetail.id ? (
                          <ActivityIndicator color="#ffffff" size="small" />
                        ) : (
                          <Text style={styles.workoutModalAnalyzeButtonText}>🧠 Analisar com IA</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Sub-modal View overlay inside main detail modal to avoid stacking bugs */}
                {effortModalVisible && (
                  <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 1000, borderRadius: 20 }]}>
                      <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : undefined}
                        style={{ width: '100%', alignItems: 'center' }}
                      >
                        <TouchableWithoutFeedback onPress={() => {}}>
                          <View style={[styles.effortModalContent, { width: '90%', padding: 20, borderRadius: 16, marginTop: 0 }]}>
                            <ScrollView
                              style={{ width: '100%', maxHeight: 380 }}
                              contentContainerStyle={{ paddingBottom: 10 }}
                              showsVerticalScrollIndicator={false}
                              keyboardShouldPersistTaps="handled"
                            >
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
                            </ScrollView>

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
                      </KeyboardAvoidingView>
                    </View>
                  </TouchableWithoutFeedback>
                )}
              </>
            )}
          </View>
        </View>
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

            {sharingWorkout && (() => {
              const isPersonalRecord = (sharingWorkout.prCount && sharingWorkout.prCount > 0) || 
                                       sharingWorkout.title?.toLowerCase().includes("pr") || 
                                       sharingWorkout.title?.toLowerCase().includes("rp") ||
                                       sharingWorkout.title?.toLowerCase().includes("recorde");
              return (
                <ScrollView contentContainerStyle={{ alignItems: "center", paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
                  
                  {/* Template Selector Carousel Header */}
                  <View style={styles.carouselSelectorRow}>
                    <TouchableOpacity 
                      onPress={() => setActiveTemplateIdx(prev => prev === 0 ? 2 : prev - 1)}
                      style={styles.carouselSelectorArrow}
                    >
                      <Text style={styles.carouselSelectorArrowText}>◀</Text>
                    </TouchableOpacity>
                    <Text style={styles.carouselSelectorTitle}>
                      {activeTemplateIdx === 0 ? "Card Esportivo Dark 🖤" :
                       activeTemplateIdx === 1 ? "Sunset Glow Gradient 🧡" :
                       "Minimalist Light 🤍"}
                    </Text>
                    <TouchableOpacity 
                      onPress={() => setActiveTemplateIdx(prev => prev === 2 ? 0 : prev + 1)}
                      style={styles.carouselSelectorArrow}
                    >
                      <Text style={styles.carouselSelectorArrowText}>▶</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Horizontal ScrollView supporting Swipe */}
                  <ScrollView
                    ref={templateScrollRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    style={{ width: 290, height: 480 }}
                    onMomentumScrollEnd={(e) => {
                      const offsetX = e.nativeEvent.contentOffset.x;
                      const index = Math.round(offsetX / 290);
                      setActiveTemplateIdx(index);
                    }}
                  >
                    
                    {/* Template 0: Dark Premium */}
                    <View style={{ width: 290, height: 480 }}>
                      <ViewShot ref={viewShotRef0} options={{ format: "png", quality: 0.9 }}>
                        <View style={{
                          width: 290,
                          height: 480,
                          backgroundColor: "#0d0d12",
                          borderRadius: 20,
                          padding: 20,
                          justifyContent: "space-between",
                          borderWidth: 1,
                          borderColor: "#1f1f2e",
                          position: "relative",
                        }}>
                          {/* Header */}
                          <View style={styles.cleanHeader}>
                            <Text style={[styles.cleanLogo, { color: "#ffffff" }]}>👟 SIDEKICK</Text>
                            <View style={{
                              backgroundColor: isPersonalRecord ? "#ffd700" : "#ff6b6b",
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 4,
                            }}>
                              <Text style={{
                                color: "#000000",
                                fontSize: 8,
                                fontWeight: "800",
                                letterSpacing: 0.5,
                              }}>
                                {isPersonalRecord ? "🏆 RECORDE PESSOAL" : (sharingWorkout.type === "run" ? "CORRIDA" : sharingWorkout.type === "cycling" ? "CICLISMO" : "FORÇA")}
                              </Text>
                            </View>
                          </View>

                          {/* Main Stat & Workout Info */}
                          <View style={{ flex: 1, justifyContent: "center", marginVertical: 10 }}>
                            <Text style={{ color: "#88888b", fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 }}>
                              {sharingWorkout.title || "Treino"}
                            </Text>
                            <Text style={{ color: "#ffffff", fontSize: 36, fontWeight: "900", marginTop: 4 }}>
                              {sharingWorkout.distance 
                                ? `${sharingWorkout.distance.toFixed(2)} km`
                                : Math.floor(sharingWorkout.duration / 3600) > 0
                                  ? `${Math.floor(sharingWorkout.duration / 3600)}h ${Math.floor((sharingWorkout.duration % 3600) / 60)}m`
                                  : `${Math.floor((sharingWorkout.duration % 3600) / 60)} min`
                              }
                            </Text>
                            
                            {/* Horizontal Stats Row */}
                            <View style={{
                              flexDirection: "row",
                              borderTopWidth: 1,
                              borderTopColor: "#1f1f2e",
                              borderBottomWidth: 1,
                              borderBottomColor: "#1f1f2e",
                              paddingVertical: 12,
                              marginTop: 15,
                              justifyContent: "space-between"
                            }}>
                              {sharingWorkout.distance ? (
                                <View style={{ flex: 1 }}>
                                  <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "800" }}>
                                    {Math.floor(sharingWorkout.duration / 3600) > 0
                                      ? `${Math.floor(sharingWorkout.duration / 3600)}h ${Math.floor((sharingWorkout.duration % 3600) / 60)}m`
                                      : `${Math.floor((sharingWorkout.duration % 3600) / 60)} min`}
                                  </Text>
                                  <Text style={{ color: "#88888b", fontSize: 8, fontWeight: "700", textTransform: "uppercase", marginTop: 2 }}>Tempo</Text>
                                </View>
                              ) : null}
                              {sharingWorkout.pace ? (
                                <View style={{ flex: 1 }}>
                                  <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "800" }}>
                                    {formatPace(sharingWorkout.pace)}
                                  </Text>
                                  <Text style={{ color: "#88888b", fontSize: 8, fontWeight: "700", textTransform: "uppercase", marginTop: 2 }}>
                                    {sharingWorkout.type === "run" ? "Ritmo" : "Velocidade"}
                                  </Text>
                                </View>
                              ) : null}
                              {sharingWorkout.avgHeartRate ? (
                                <View style={{ flex: 1 }}>
                                  <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "800" }}>
                                    {sharingWorkout.avgHeartRate} bpm
                                  </Text>
                                  <Text style={{ color: "#88888b", fontSize: 8, fontWeight: "700", textTransform: "uppercase", marginTop: 2 }}>Freq. Cardíaca</Text>
                                </View>
                              ) : sharingWorkout.sufferScore ? (
                                <View style={{ flex: 1 }}>
                                  <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "800" }}>
                                    {sharingWorkout.sufferScore}
                                  </Text>
                                  <Text style={{ color: "#88888b", fontSize: 8, fontWeight: "700", textTransform: "uppercase", marginTop: 2 }}>Esforço Relativo</Text>
                                </View>
                              ) : null}
                            </View>
                          </View>

                          {/* Coach Insight quotes block */}
                          <View style={{
                            backgroundColor: "#161622",
                            borderRadius: 12,
                            padding: 12,
                            borderWidth: 1,
                            borderColor: "#222235",
                            marginBottom: 10,
                          }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                              <Text style={{ fontSize: 16 }}>{user?.profile?.companionAvatar || "🦖"}</Text>
                              <Text style={{ color: "#ff6b6b", fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 }}>
                                Insight do {user?.profile?.companionName || "Rocky"}
                              </Text>
                            </View>
                            <Text style={{ color: "#d1d1d6", fontSize: 11, lineHeight: 15, fontStyle: "italic" }} numberOfLines={3}>
                              "{sharingWorkout.aiNarrative || "Nenhum limite é obstáculo. Bora pra cima! 🔥"}"
                            </Text>
                          </View>

                          {/* Footer */}
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                            <Text style={{ color: "#88888b", fontSize: 9 }}>{new Date(sharingWorkout.date).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}</Text>
                            <Text style={{ color: "#ff6b6b", fontSize: 9, fontWeight: "700", letterSpacing: 0.5 }}>@sidekick.fit</Text>
                          </View>
                        </View>
                      </ViewShot>
                    </View>

                    {/* Template 1: Glow Gradient */}
                    <View style={{ width: 290, height: 480 }}>
                      <ViewShot ref={viewShotRef1} options={{ format: "png", quality: 0.9 }}>
                        <View style={{
                          width: 290,
                          height: 480,
                          backgroundColor: "#ff5e3a",
                          borderRadius: 20,
                          padding: 20,
                          justifyContent: "space-between",
                          overflow: "hidden",
                        }}>
                          {/* Rich Coral/Orange Sunset Gradient background */}
                          <Svg style={StyleSheet.absoluteFillObject} width="100%" height="100%">
                            <Defs>
                              <LinearGradient id="sunset" x1="0%" y1="0%" x2="100%" y2="100%">
                                <Stop offset="0%" stopColor="#fc4c02" />
                                <Stop offset="100%" stopColor="#fe8c00" />
                              </LinearGradient>
                            </Defs>
                            <Circle cx="145" cy="240" r="300" fill="url(#sunset)" />
                          </Svg>

                          {/* Header */}
                          <View style={styles.cleanHeader}>
                            <Text style={[styles.cleanLogo, { color: "#ffffff" }]}>👟 SIDEKICK</Text>
                            <View style={{
                              backgroundColor: "rgba(255, 255, 255, 0.25)",
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 4,
                            }}>
                              <Text style={{
                                color: "#ffffff",
                                fontSize: 8,
                                fontWeight: "800",
                                letterSpacing: 0.5,
                              }}>
                                {isPersonalRecord ? "🏆 RECORDE PESSOAL" : (sharingWorkout.type === "run" ? "CORRIDA" : sharingWorkout.type === "cycling" ? "CICLISMO" : "FORÇA")}
                              </Text>
                            </View>
                          </View>

                          {/* Main Stat & Workout Info */}
                          <View style={{ flex: 1, justifyContent: "center", marginVertical: 10 }}>
                            <Text style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 }}>
                              {sharingWorkout.title || "Treino"}
                            </Text>
                            <Text style={{ color: "#ffffff", fontSize: 36, fontWeight: "900", marginTop: 4 }}>
                              {sharingWorkout.distance 
                                ? `${sharingWorkout.distance.toFixed(2)} km`
                                : Math.floor(sharingWorkout.duration / 3600) > 0
                                  ? `${Math.floor(sharingWorkout.duration / 3600)}h ${Math.floor((sharingWorkout.duration % 3600) / 60)}m`
                                  : `${Math.floor((sharingWorkout.duration % 3600) / 60)} min`
                              }
                            </Text>
                            
                            {/* Horizontal Stats Row */}
                            <View style={{
                              flexDirection: "row",
                              borderTopWidth: 1,
                              borderTopColor: "rgba(255, 255, 255, 0.25)",
                              borderBottomWidth: 1,
                              borderBottomColor: "rgba(255, 255, 255, 0.25)",
                              paddingVertical: 12,
                              marginTop: 15,
                              justifyContent: "space-between"
                            }}>
                              {sharingWorkout.distance ? (
                                <View style={{ flex: 1 }}>
                                  <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "800" }}>
                                    {Math.floor(sharingWorkout.duration / 3600) > 0
                                      ? `${Math.floor(sharingWorkout.duration / 3600)}h ${Math.floor((sharingWorkout.duration % 3600) / 60)}m`
                                      : `${Math.floor((sharingWorkout.duration % 3600) / 60)} min`}
                                  </Text>
                                  <Text style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: 8, fontWeight: "700", textTransform: "uppercase", marginTop: 2 }}>Tempo</Text>
                                </View>
                              ) : null}
                              {sharingWorkout.pace ? (
                                <View style={{ flex: 1 }}>
                                  <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "800" }}>
                                    {formatPace(sharingWorkout.pace)}
                                  </Text>
                                  <Text style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: 8, fontWeight: "700", textTransform: "uppercase", marginTop: 2 }}>
                                    {sharingWorkout.type === "run" ? "Ritmo" : "Velocidade"}
                                  </Text>
                                </View>
                              ) : null}
                              {sharingWorkout.avgHeartRate ? (
                                <View style={{ flex: 1 }}>
                                  <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "800" }}>
                                    {sharingWorkout.avgHeartRate} bpm
                                  </Text>
                                  <Text style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: 8, fontWeight: "700", textTransform: "uppercase", marginTop: 2 }}>Freq. Cardíaca</Text>
                                </View>
                              ) : sharingWorkout.sufferScore ? (
                                <View style={{ flex: 1 }}>
                                  <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "800" }}>
                                    {sharingWorkout.sufferScore}
                                  </Text>
                                  <Text style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: 8, fontWeight: "700", textTransform: "uppercase", marginTop: 2 }}>Esforço Relativo</Text>
                                </View>
                              ) : null}
                            </View>
                          </View>

                          {/* Coach Insight quotes block */}
                          <View style={{
                            backgroundColor: "rgba(255, 255, 255, 0.15)",
                            borderRadius: 12,
                            padding: 12,
                            borderWidth: 1,
                            borderColor: "rgba(255, 255, 255, 0.25)",
                            marginBottom: 10,
                          }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                              <Text style={{ fontSize: 16 }}>{user?.profile?.companionAvatar || "🦖"}</Text>
                              <Text style={{ color: "#ffffff", fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 }}>
                                Insight do {user?.profile?.companionName || "Rocky"}
                              </Text>
                            </View>
                            <Text style={{ color: "#ffffff", fontSize: 11, lineHeight: 15, fontStyle: "italic" }} numberOfLines={3}>
                              "{sharingWorkout.aiNarrative || "Nenhum limite é obstáculo. Bora pra cima! 🔥"}"
                            </Text>
                          </View>

                          {/* Footer */}
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                            <Text style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: 9 }}>{new Date(sharingWorkout.date).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}</Text>
                            <Text style={{ color: "#ffffff", fontSize: 9, fontWeight: "700", letterSpacing: 0.5 }}>@sidekick.fit</Text>
                          </View>
                        </View>
                      </ViewShot>
                    </View>

                    {/* Template 2: Minimalist Light */}
                    <View style={{ width: 290, height: 480 }}>
                      <ViewShot ref={viewShotRef2} options={{ format: "png", quality: 0.9 }}>
                        <View style={{
                          width: 290,
                          height: 480,
                          backgroundColor: "#ffffff",
                          borderRadius: 20,
                          padding: 20,
                          justifyContent: "space-between",
                          borderWidth: 1,
                          borderColor: "#e5e5ea",
                          position: "relative",
                        }}>
                          {/* Header */}
                          <View style={styles.cleanHeader}>
                            <Text style={[styles.cleanLogo, { color: "#1c1c1e" }]}>👟 SIDEKICK</Text>
                            <View style={{
                              backgroundColor: isPersonalRecord ? "#ffd700" : "#e5e5ea",
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 4,
                            }}>
                              <Text style={{
                                color: "#1c1c1e",
                                fontSize: 8,
                                fontWeight: "800",
                                letterSpacing: 0.5,
                              }}>
                                {isPersonalRecord ? "🏆 RECORDE PESSOAL" : (sharingWorkout.type === "run" ? "CORRIDA" : sharingWorkout.type === "cycling" ? "CICLISMO" : "FORÇA")}
                              </Text>
                            </View>
                          </View>

                          {/* Main Stat & Workout Info */}
                          <View style={{ flex: 1, justifyContent: "center", marginVertical: 10 }}>
                            <Text style={{ color: "#636366", fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 }}>
                              {sharingWorkout.title || "Treino"}
                            </Text>
                            <Text style={{ color: "#1c1c1e", fontSize: 36, fontWeight: "900", marginTop: 4 }}>
                              {sharingWorkout.distance 
                                ? `${sharingWorkout.distance.toFixed(2)} km`
                                : Math.floor(sharingWorkout.duration / 3600) > 0
                                  ? `${Math.floor(sharingWorkout.duration / 3600)}h ${Math.floor((sharingWorkout.duration % 3600) / 60)}m`
                                  : `${Math.floor((sharingWorkout.duration % 3600) / 60)} min`
                              }
                            </Text>
                            
                            {/* Horizontal Stats Row */}
                            <View style={{
                              flexDirection: "row",
                              borderTopWidth: 1,
                              borderTopColor: "#e5e5ea",
                              borderBottomWidth: 1,
                              borderBottomColor: "#e5e5ea",
                              paddingVertical: 12,
                              marginTop: 15,
                              justifyContent: "space-between"
                            }}>
                              {sharingWorkout.distance ? (
                                <View style={{ flex: 1 }}>
                                  <Text style={{ color: "#1c1c1e", fontSize: 14, fontWeight: "800" }}>
                                    {Math.floor(sharingWorkout.duration / 3600) > 0
                                      ? `${Math.floor(sharingWorkout.duration / 3600)}h ${Math.floor((sharingWorkout.duration % 3600) / 60)}m`
                                      : `${Math.floor((sharingWorkout.duration % 3600) / 60)} min`}
                                  </Text>
                                  <Text style={{ color: "#8e8e93", fontSize: 8, fontWeight: "700", textTransform: "uppercase", marginTop: 2 }}>Tempo</Text>
                                </View>
                              ) : null}
                              {sharingWorkout.pace ? (
                                <View style={{ flex: 1 }}>
                                  <Text style={{ color: "#1c1c1e", fontSize: 14, fontWeight: "800" }}>
                                    {formatPace(sharingWorkout.pace)}
                                  </Text>
                                  <Text style={{ color: "#8e8e93", fontSize: 8, fontWeight: "700", textTransform: "uppercase", marginTop: 2 }}>
                                    {sharingWorkout.type === "run" ? "Ritmo" : "Velocidade"}
                                  </Text>
                                </View>
                              ) : null}
                              {sharingWorkout.avgHeartRate ? (
                                <View style={{ flex: 1 }}>
                                  <Text style={{ color: "#1c1c1e", fontSize: 14, fontWeight: "800" }}>
                                    {sharingWorkout.avgHeartRate} bpm
                                  </Text>
                                  <Text style={{ color: "#8e8e93", fontSize: 8, fontWeight: "700", textTransform: "uppercase", marginTop: 2 }}>Freq. Cardíaca</Text>
                                </View>
                              ) : sharingWorkout.sufferScore ? (
                                <View style={{ flex: 1 }}>
                                  <Text style={{ color: "#1c1c1e", fontSize: 14, fontWeight: "800" }}>
                                    {sharingWorkout.sufferScore}
                                  </Text>
                                  <Text style={{ color: "#8e8e93", fontSize: 8, fontWeight: "700", textTransform: "uppercase", marginTop: 2 }}>Esforço Relativo</Text>
                                </View>
                              ) : null}
                            </View>
                          </View>

                          {/* Coach Insight quotes block */}
                          <View style={{
                            backgroundColor: "#f2f2f7",
                            borderRadius: 12,
                            padding: 12,
                            borderWidth: 1,
                            borderColor: "#e5e5ea",
                            marginBottom: 10,
                          }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                              <Text style={{ fontSize: 16 }}>{user?.profile?.companionAvatar || "🦖"}</Text>
                              <Text style={{ color: "#ff6b6b", fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 }}>
                                Insight do {user?.profile?.companionName || "Rocky"}
                              </Text>
                            </View>
                            <Text style={{ color: "#1c1c1e", fontSize: 11, lineHeight: 15, fontStyle: "italic" }} numberOfLines={3}>
                              "{sharingWorkout.aiNarrative || "Nenhum limite é obstáculo. Bora pra cima! 🔥"}"
                            </Text>
                          </View>

                          {/* Footer */}
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                            <Text style={{ color: "#8e8e93", fontSize: 9 }}>{new Date(sharingWorkout.date).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}</Text>
                            <Text style={{ color: "#ff6b6b", fontSize: 9, fontWeight: "700", letterSpacing: 0.5 }}>@sidekick.fit</Text>
                          </View>
                        </View>
                      </ViewShot>
                    </View>

                  </ScrollView>

                  {/* Indicator Dots */}
                  <View style={styles.carouselIndicatorRow}>
                    <View style={[styles.carouselDot, activeTemplateIdx === 0 && styles.carouselDotActive]} />
                    <View style={[styles.carouselDot, activeTemplateIdx === 1 && styles.carouselDotActive]} />
                    <View style={[styles.carouselDot, activeTemplateIdx === 2 && styles.carouselDotActive]} />
                  </View>

                  {/* Actions */}
                  <TouchableOpacity
                    style={styles.shareSaveButton}
                    onPress={handleShareCardImage}
                  >
                    <Text style={styles.shareSaveButtonText}>💾 Salvar e Compartilhar</Text>
                  </TouchableOpacity>
                </ScrollView>
              );
            })()}
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
    justifyContent: "space-between",
    marginBottom: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1d1d1f",
    borderTopWidth: 1,
    borderTopColor: "#1d1d1f",
  },
  workoutModalMetricCard: {
    width: "30%",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  workoutModalMetricIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  workoutModalMetricValue: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  workoutModalMetricSubLabel: {
    color: "#b0b0b0",
    fontSize: 8,
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
  carouselSelectorArrowText: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
  carouselSelectorRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: 290, marginBottom: 12 },
  carouselSelectorArrow: { padding: 8, backgroundColor: "#22222b", borderRadius: 8 },
  carouselSelectorTitle: { color: "#ffffff", fontSize: 13, fontWeight: "700" },
  cleanHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%" },
  cleanLogo: { color: "#ff6b6b", fontSize: 14, fontWeight: "800", letterSpacing: 1 },
  carouselIndicatorRow: { flexDirection: "row", gap: 6, marginTop: 12 },
  carouselDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#333333" },
  carouselDotActive: { width: 16, backgroundColor: "#ff6b6b" },
});
