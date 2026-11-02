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
import Svg, { Defs, LinearGradient, Stop, Circle, Path, Line, Rect } from "react-native-svg";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import ViewShot, { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import Calendar from "@/components/Calendar";
import { useDashboard } from "@/src/contexts/DashboardContext";
import { useAuth } from "@/src/contexts/AuthContext";
import { CalendarEvent } from "@/src/services/calendarMockService";
import * as Speech from "expo-speech";
import { polylineToSvgPath } from "@/src/utils/polylineDecoder";
import { WorkoutStoryCard } from "@/src/components/WorkoutStoryCard";
const formatPace = (speedKmH: number | null | undefined) => {
  if (!speedKmH || speedKmH <= 0) return "-";
  const totalMinutes = 60 / speedKmH;
  const minutes = Math.floor(totalMinutes);
  const seconds = Math.round((totalMinutes - minutes) * 60);
  const secondsStr = seconds < 10 ? `0${seconds}` : seconds;
  return `${minutes}:${secondsStr} /km`;
};

const renderFormattedAiText = (text: string) => {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <Text key={idx} style={{ fontWeight: "800", color: "#ffffff" }}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    return part;
  });
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
  const viewShotRef3 = useRef<any>(null);
  const viewShotRef4 = useRef<any>(null);
  const templateScrollRef = useRef<any>(null);
  const calendarModalScrollRef = useRef<ScrollView>(null);

  const handleGenerateShareCard = (workout: any) => {
    setSelectedWorkoutId(null);
    setSharingWorkout(workout);
    setActiveTemplateIdx(0);
    setTimeout(() => {
      setShareCardVisible(true);
    }, 250);
  };

  const handleShareCardImage = async () => {
    try {
      const activeRef =
        activeTemplateIdx === 0 ? viewShotRef0 :
        activeTemplateIdx === 1 ? viewShotRef1 :
        activeTemplateIdx === 2 ? viewShotRef2 :
        activeTemplateIdx === 3 ? viewShotRef3 :
        viewShotRef4;
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

  const selectedWorkoutDetail = workouts.find((w) => w.id === selectedWorkoutId || (w as any).stravaId === selectedWorkoutId);

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

  const [isSubmittingEffort, setIsSubmittingEffort] = useState(false);

  const submitAnalysis = async () => {
    if (!targetWorkoutId || isSubmittingEffort) return;
    
    try {
      setIsSubmittingEffort(true);
      setAnalyzingWorkoutId(targetWorkoutId);
      await analyzeWorkout(targetWorkoutId, effortRating, userNotes);
      // Close modal and reset state ONLY on success
      setEffortModalVisible(false);
      setUserNotes("");
      setTargetWorkoutId(null);
      Alert.alert("Análise concluída", "A análise Gemini foi gerada com sucesso.");
    } catch (error: any) {
      console.error("Error analyzing workout:", error);
      Alert.alert(
        "Aviso de Conexão",
        error.message || "Não foi possível gerar a análise no momento. Suas observações foram salvas na tela para você tentar novamente!"
      );
      // Modal remains OPEN and userNotes/effortRating are preserved!
    } finally {
      setIsSubmittingEffort(false);
      setAnalyzingWorkoutId(null);
    }
  };

  const handleToggleSpeech = (text: string) => {
    Alert.alert("Áudio IA", "O recurso de leitura de voz da IA está temporariamente desativado.");
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
      setTimeout(() => {
        const targetId = (event as any).workoutId || (event.id.startsWith("evt-strava-") ? event.id.replace("evt-strava-", "") : event.id);
        setSelectedWorkoutId(targetId);
      }, 300);
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
                  <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 10 }}>
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
                              event.isWorkout ? { color: "#10B981" } : { color: "#ff922b" }
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
                  </ScrollView>
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.workoutModalOverlay}>
            <View style={styles.workoutModalContent}>
              {selectedWorkoutDetail ? (
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
                        <FontAwesome name="share-alt" size={20} color="#FF5A36" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleCloseDetailModal} style={{ padding: 5 }}>
                        <Text style={styles.workoutModalCloseButton}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <ScrollView
                    ref={calendarModalScrollRef}
                    style={styles.workoutModalScroll}
                    contentContainerStyle={{ paddingBottom: effortModalVisible ? 320 : 40 }}
                    showsVerticalScrollIndicator={true}
                    keyboardShouldPersistTaps="handled"
                    automaticallyAdjustKeyboardInsets={true}
                  >
                    {effortModalVisible ? (
                      <View style={{ padding: 10 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <Text style={styles.effortModalTitle}>Como foi o seu treino? 🤔</Text>
                          <TouchableOpacity onPress={() => setEffortModalVisible(false)} style={{ padding: 5 }}>
                            <Text style={{ color: '#94A3B8', fontSize: 18 }}>✕</Text>
                          </TouchableOpacity>
                        </View>
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
                          onFocus={() => {
                            setTimeout(() => {
                              calendarModalScrollRef.current?.scrollToEnd({ animated: true });
                            }, 200);
                          }}
                        placeholder="Escreva como se sentiu, dores, clima ou observações gerais..."
                        style={[styles.effortInput, { minHeight: 80 }]}
                        placeholderTextColor="#666"
                        multiline
                      />

                      <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                        <TouchableOpacity
                          style={[styles.effortModalButton, styles.effortModalButtonCancel, { flex: 1 }]}
                          onPress={() => setEffortModalVisible(false)}
                        >
                          <Text style={styles.effortModalButtonTextCancel}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.effortModalButton, styles.effortModalButtonConfirm, { flex: 1, opacity: isSubmittingEffort ? 0.7 : 1 }]}
                          onPress={submitAnalysis}
                          disabled={isSubmittingEffort}
                        >
                          {isSubmittingEffort ? (
                            <ActivityIndicator size="small" color="#000" />
                          ) : (
                            <Text style={styles.effortModalButtonTextConfirm}>Analisar com IA</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <>
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
                                    ? "#FF5A36"
                                    : selectedWorkoutDetail.intensity === "moderate"
                                    ? "#F59E0B"
                                    : "#10B981",
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
                      {selectedWorkoutDetail.aiNarrative ? (
                        <View style={styles.workoutModalIaSection}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                            <Text style={[styles.workoutModalIaTitle, { marginBottom: 0 }]}>🧠 Análise do Sidekick (IA)</Text>
                            <TouchableOpacity
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                backgroundColor: "#182030",
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: "#222B3B",
                              }}
                              onPress={() => handleToggleSpeech(selectedWorkoutDetail.aiNarrative!)}
                            >
                              <Text style={{ color: "#FF5A36", fontSize: 13, fontWeight: "700" }}>
                                {isSpeaking ? "⏹️ Parar" : "🔊 Ouvir"}
                              </Text>
                            </TouchableOpacity>
                          </View>
                          <View style={styles.workoutModalNarrativeContainer}>
                            <Text style={styles.workoutModalNarrativeText}>
                              {renderFormattedAiText(selectedWorkoutDetail.aiNarrative)}
                            </Text>
                            <Text
                              style={{
                                fontSize: 10.5,
                                color: "#64748B",
                                fontStyle: "italic",
                                marginTop: 12,
                                paddingTop: 8,
                                borderTopWidth: 1,
                                borderTopColor: "rgba(255, 255, 255, 0.08)",
                                lineHeight: 15,
                              }}
                            >
                              ⚠️ A IA pode cometer falhas. As análises têm caráter informativo e não substituem a orientação de um profissional de educação física ou médico.
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[styles.workoutModalAnalyzeButton, analyzingWorkoutId === selectedWorkoutDetail.id && styles.workoutModalAnalyzeButtonDisabled, { marginTop: 16 }]}
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
                    </>
                  )}
                </ScrollView>
              </>
            ) : (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '700', marginBottom: 8 }}>Treino não encontrado</Text>
                <Text style={{ color: '#94A3B8', fontSize: 12, textAlign: 'center', marginBottom: 20 }}>
                  Não foi possível carregar as informações deste treino.
                </Text>
                <TouchableOpacity onPress={handleCloseDetailModal} style={{ backgroundColor: '#FF5A36', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}>
                  <Text style={{ color: '#0B0F17', fontWeight: '800' }}>Fechar ✕</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
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
                <Text style={{ color: "#94A3B8", fontSize: 22 }}>✕</Text>
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
                      onPress={() => {
                        const next = activeTemplateIdx === 0 ? 4 : activeTemplateIdx - 1;
                        setActiveTemplateIdx(next);
                        templateScrollRef.current?.scrollTo({ x: next * 290, animated: true });
                      }}
                      style={styles.carouselSelectorArrow}
                    >
                      <Text style={styles.carouselSelectorArrowText}>◀</Text>
                    </TouchableOpacity>
                    <Text style={styles.carouselSelectorTitle}>
                      {activeTemplateIdx === 0 ? "1. Percurso / Infográfico 🗺️⚡" :
                       activeTemplateIdx === 1 ? "2. Cyberpunk Telemetry 🏎️🔥" :
                       activeTemplateIdx === 2 ? "3. Sunset Glassmorphism 🌅✨" :
                       activeTemplateIdx === 3 ? "4. Obsidian Gold Editorial 📰🏆" :
                       "5. Sidekick Wanted Poster 🦖⚡"}
                    </Text>
                    <TouchableOpacity 
                      onPress={() => {
                        const next = activeTemplateIdx === 4 ? 0 : activeTemplateIdx + 1;
                        setActiveTemplateIdx(next);
                        templateScrollRef.current?.scrollTo({ x: next * 290, animated: true });
                      }}
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
                      if (index >= 0 && index <= 4) {
                        setActiveTemplateIdx(index);
                      }
                    }}
                  >
                    <WorkoutStoryCard workout={sharingWorkout} user={user} templateIdx={0} viewShotRef={viewShotRef0} />
                    <WorkoutStoryCard workout={sharingWorkout} user={user} templateIdx={1} viewShotRef={viewShotRef1} />
                    <WorkoutStoryCard workout={sharingWorkout} user={user} templateIdx={2} viewShotRef={viewShotRef2} />
                    <WorkoutStoryCard workout={sharingWorkout} user={user} templateIdx={3} viewShotRef={viewShotRef3} />
                    <WorkoutStoryCard workout={sharingWorkout} user={user} templateIdx={4} viewShotRef={viewShotRef4} />
                  </ScrollView>

                  {/* Indicator Dots (5 dots) */}
                  <View style={styles.carouselIndicatorRow}>
                    {[0, 1, 2, 3, 4].map((idx) => (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => {
                          setActiveTemplateIdx(idx);
                          templateScrollRef.current?.scrollTo({ x: idx * 290, animated: true });
                        }}
                      >
                        <View style={[styles.carouselDot, activeTemplateIdx === idx && styles.carouselDotActive]} />
                      </TouchableOpacity>
                    ))}
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
    backgroundColor: "#0B0F17",
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
    backgroundColor: "#131924",
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
    color: "#94A3B8",
    fontSize: 12,
  },
  closeIcon: {
    fontSize: 22,
    color: "#FF5A36",
  },
  input: {
    backgroundColor: "#0B0F17",
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
    backgroundColor: "#0B0F17",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#182030",
  },
  typeOption: {
    color: "#94A3B8",
    fontSize: 12,
    marginBottom: 4,
  },
  typeOptionActive: {
    color: "#10B981",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  eventList: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: "#0E131D",
    borderWidth: 1,
    borderColor: "#222B3B",
    padding: 8,
  },
  eventRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    marginBottom: 8,
    backgroundColor: "#182030",
    borderRadius: 10,
  },
  eventTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  eventSubtitle: {
    color: "#94A3B8",
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
    color: "#94A3B8",
    fontSize: 12,
  },
  emptyText: {
    color: "#94A3B8",
    marginBottom: 12,
  },
  sectionLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  saveButton: {
    backgroundColor: "#10B981",
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
    color: "#94A3B8",
    fontWeight: "700",
  },
  deleteButton: {
    backgroundColor: "#FF5A36",
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
    backgroundColor: "#10B981",
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
    backgroundColor: "#131924",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 24,
    maxHeight: "85%",
    borderWidth: 1,
    borderColor: "#222B3B",
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
    color: "#94A3B8",
    textTransform: 'capitalize',
  },
  workoutModalCloseButton: {
    fontSize: 24,
    color: "#94A3B8",
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
    color: "#94A3B8",
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
    borderBottomColor: "#1E293B",
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
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
    color: "#94A3B8",
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
    borderTopColor: "#222B3B",
    paddingTop: 16,
  },
  workoutModalIaTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 12,
  },
  workoutModalNarrativeContainer: {
    backgroundColor: "#0B0F17",
    borderLeftWidth: 3,
    borderLeftColor: "#FF5A36",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  workoutModalNarrativeText: {
    color: "#94A3B8",
    fontSize: 14,
    lineHeight: 20,
  },
  workoutModalIaEmpty: {
    backgroundColor: "#0B0F17",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#222B3B",
    borderStyle: "dashed",
  },
  workoutModalIaEmptyText: {
    color: "#94A3B8",
    fontSize: 13,
    textAlign: "center",
  },
  workoutModalAnalyzeButton: {
    backgroundColor: "#FF5A36",
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
    borderColor: "#222B3B",
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 16,
    alignItems: "center",
  },
  workoutModalCloseActionText: {
    color: "#94A3B8",
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
    backgroundColor: "#131924",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222B3B",
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
    color: "#94A3B8",
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
    backgroundColor: "#0B0F17",
    borderWidth: 1,
    borderColor: "#222B3B",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginHorizontal: 3,
  },
  effortRatingButtonActive: {
    borderColor: "#FF5A36",
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
    color: "#FF5A36",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 12,
  },
  effortInput: {
    backgroundColor: "#0B0F17",
    borderWidth: 1,
    borderColor: "#222B3B",
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
    borderColor: "#222B3B",
    marginRight: 8,
  },
  effortModalButtonConfirm: {
    backgroundColor: "#FF5A36",
  },
  effortModalButtonTextCancel: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "600",
  },
  effortModalButtonTextConfirm: {
    color: "#0B0F17",
    fontSize: 14,
    fontWeight: "700",
  },
  inputLabel: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 12,
  },
  workoutModalShareStoriesButton: {
    backgroundColor: "#0B0F17",
    borderWidth: 1,
    borderColor: "#222B3B",
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
    backgroundColor: "#131924",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222B3B",
    padding: 16,
    maxHeight: "90%",
  },
  shareModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#222B3B",
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
    backgroundColor: "#0B0F17",
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#FF5A36",
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
    color: "#94A3B8",
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
    backgroundColor: "#131924",
    borderWidth: 1,
    borderColor: "#FF5A36",
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
    color: "#94A3B8",
    fontSize: 11,
  },
  storiesSpeechBubble: {
    backgroundColor: "#131924",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#222B3B",
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
    backgroundColor: "#131924",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#222B3B",
    marginTop: 16,
    opacity: 0.95,
  },
  storiesWorkoutTitle: {
    color: "#FF5A36",
    fontSize: 14,
    fontWeight: "700",
  },
  storiesWorkoutDate: {
    color: "#94A3B8",
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
    color: "#94A3B8",
    fontSize: 10,
  },
  storiesStatValue: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  shareSaveButton: {
    backgroundColor: "#FF5A36",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
    marginTop: 20,
    width: 290,
  },
  shareSaveButtonText: {
    color: "#0B0F17",
    fontSize: 15,
    fontWeight: "800",
  },
  carouselSelectorArrowText: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
  carouselSelectorRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: 290, marginBottom: 12 },
  carouselSelectorArrow: { padding: 8, backgroundColor: "#1E293B", borderRadius: 8 },
  carouselSelectorTitle: { color: "#ffffff", fontSize: 13, fontWeight: "700" },
  cleanHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%" },
  cleanLogo: { color: "#FF5A36", fontSize: 14, fontWeight: "800", letterSpacing: 1 },
  carouselIndicatorRow: { flexDirection: "row", gap: 6, marginTop: 12 },
  carouselDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#222B3B" },
  carouselDotActive: { width: 16, backgroundColor: "#FF5A36" },
});
