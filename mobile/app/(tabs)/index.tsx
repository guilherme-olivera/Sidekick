import React, { useState, useEffect, useRef } from "react";
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
  Keyboard,
  TextInput,
  FlatList,
  Image,
  RefreshControl,
} from "react-native";
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Line, Text as SvgText } from "react-native-svg";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import ViewShot, { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useDashboard } from "@/src/contexts/DashboardContext";
import { useAuth } from "@/src/contexts/AuthContext";
import { useStrava } from "@/src/contexts/StravaContext";
import { apiService, API_BASE_URL } from "@/src/services/apiService";
import { MoodWidget } from "@/components/MoodWidget";
import { WorkoutCard } from "@/components/WorkoutCard";
import notificationService from "@/src/services/notificationService";

const formatPace = (speedKmH: number | null | undefined) => {
  if (!speedKmH || speedKmH <= 0) return "-";
  const totalMinutes = 60 / speedKmH;
  const minutes = Math.floor(totalMinutes);
  const seconds = Math.round((totalMinutes - minutes) * 60);
  const secondsStr = seconds < 10 ? `0${seconds}` : seconds;
  return `${minutes}:${secondsStr} /km`;
};

const getAvatarUri = (avatarPath?: string | null): string | undefined => {
  if (!avatarPath) return undefined;
  if (avatarPath.startsWith("http://") || avatarPath.startsWith("https://")) {
    return avatarPath;
  }
  return `${API_BASE_URL}${avatarPath.startsWith("/") ? "" : "/"}${avatarPath}`;
};

const Colors = {
  dark: "#0a0a0a",
  darkCard: "#1a1a1a",
  darkBorder: "#333333",
  text: "#ffffff",
  textSecondary: "#b0b0b0",
  primary: "#ff6b6b",
  success: "#51cf66",
  warning: "#ffa94d",
  inactive: "#555555",
};

const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];
const DAY_NUMBERS = [1, 2, 3, 4, 5, 6, 0]; // Mapping DAYS to Date.getDay()

export default function HomeScreen() {
  const router = useRouter();
  const today = new Date();
  const { user } = useAuth();
  const { isConnected: isStravaConnected, syncActivities } = useStrava();
  const [newWorkoutsSyncedMessage, setNewWorkoutsSyncedMessage] = useState<string | null>(null);
  const {
    workouts,
    workoutsByDay,
    setMood,
    currentMood,
    currentMoodEmoji,
    loadWeeklyWorkouts,
    analyzeWorkout,
    isLoading,
  } = useDashboard();

  const [analyzingWorkoutId, setAnalyzingWorkoutId] = useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [selectedWorkoutIdForDetail, setSelectedWorkoutIdForDetail] = useState<string | null>(null);
  const [selectedSplitIndex, setSelectedSplitIndex] = useState<number | null>(null);

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

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      if (isStravaConnected) {
        try {
          await syncActivities();
        } catch (syncErr) {
          console.error("Failed to sync Strava activities on pull-to-refresh:", syncErr);
        }
      }
      const monday = new Date();
      const offset = monday.getDay() === 0 ? -6 : 1 - monday.getDay();
      monday.setDate(monday.getDate() + offset);
      monday.setHours(0, 0, 0, 0);
      await loadWeeklyWorkouts(monday);
    } catch (err) {
      console.error("Error during pull-to-refresh on dashboard:", err);
    } finally {
      setRefreshing(false);
    }
  };

  // Companion Chat Overlay States
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInputText, setChatInputText] = useState("");
  const [chatIsTyping, setChatIsTyping] = useState(false);
  const [chatSuggestions, setChatSuggestions] = useState<string[]>([]);
  const chatFlatListRef = useRef<FlatList>(null);
  const templateScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (shareCardVisible) {
      setTimeout(() => {
        templateScrollRef.current?.scrollTo({ x: activeTemplateIdx * 290, animated: true });
      }, 80);
    }
  }, [activeTemplateIdx, shareCardVisible]);

  const CHAT_STORAGE_KEY = "@sidekick:chat_history";

  useEffect(() => {
    if (chatModalVisible) {
      loadChatHistory();
    }
  }, [chatModalVisible]);

  useEffect(() => {
    if (chatMessages.length <= 1) {
      const QUICK_QUESTIONS = [
        "O que é pace?",
        "Qual o recorde da maratona?",
        "Como evitar dores no joelho?",
        "O que comer antes do treino?",
        "Dicas para começar a correr",
        "Como melhorar meu fôlego?",
        "O que é treino de cadência?",
        "Qual a melhor frequência cardíaca?",
      ];
      const shuffled = [...QUICK_QUESTIONS].sort(() => 0.5 - Math.random());
      setChatSuggestions(shuffled.slice(0, 3));
    } else {
      setChatSuggestions([]);
    }
  }, [chatMessages]);

  const loadChatHistory = async () => {
    try {
      const raw = await AsyncStorage.getItem(CHAT_STORAGE_KEY);
      if (raw) {
        setChatMessages(JSON.parse(raw));
      } else {
        const cName = user?.profile?.companionName || "Rocky";
        setChatMessages([
          {
            id: "welcome",
            sender: "bot",
            text: `Olá! Eu sou o seu companheiro ${cName}. Como estão os seus treinos hoje? Estou pronto para te ajudar a manter a consistência! 🏃‍♂️🚲`,
            timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } catch (e) {
      console.warn("Failed to load chat history", e);
    }
  };

  const saveChatHistory = async (history: any[]) => {
    try {
      await AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn("Failed to save chat history", e);
    }
  };

  const handleClearChatHistory = async () => {
    try {
      await AsyncStorage.removeItem(CHAT_STORAGE_KEY);
      const cName = user?.profile?.companionName || "Rocky";
      setChatMessages([
        {
          id: "welcome",
          sender: "bot",
          text: `Conversa reiniciada. Eu sou o ${cName}! Como posso te ajudar agora?`,
          timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (e) {
      console.warn("Failed to clear chat history", e);
    }
  };

  const handleSendChatMessage = async (customText?: string) => {
    const textToSend = customText || chatInputText;
    if (!textToSend.trim()) return;

    if (!customText) {
      setChatInputText("");
    }

    const userText = textToSend.trim();
    const timestamp = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const userMsg = {
      id: `user_${Date.now()}`,
      sender: "user" as const,
      text: userText,
      timestamp,
    };

    const newHistory = [...chatMessages, userMsg];
    setChatMessages(newHistory);
    saveChatHistory(newHistory);
    setChatIsTyping(true);

    try {
      const apiHistory = chatMessages.slice(-6).map((m) => ({
        role: (m.sender === "user" ? "user" : "model") as "user" | "model",
        parts: m.text,
      }));

      const res = await apiService.post("/chat", {
        message: userText,
        history: apiHistory,
      });

      if (res && res.success && res.response) {
        const botMsg = {
          id: `bot_${Date.now()}`,
          sender: "bot" as const,
          text: res.response,
          timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        };
        const updatedHistory = [...newHistory, botMsg];
        setChatMessages(updatedHistory);
        saveChatHistory(updatedHistory);
      } else {
        throw new Error("Chat api failed");
      }
    } catch (error) {
      console.error("Chat response error:", error);
      const errorMsg = {
        id: `err_${Date.now()}`,
        sender: "bot" as const,
        text: "Desculpe, tive um probleminha para me conectar. Pode tentar me mandar a mensagem novamente? 🥹",
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setChatIsTyping(false);
      // Scroll to bottom
      setTimeout(() => {
        chatFlatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [dismissedNotifIds, setDismissedNotifIds] = useState<string[]>([]);

  const handleNotificationClick = (notif: any) => {
    if (notif.id === "workouts" || notif.id === "calendar") {
      setNotificationsModalVisible(false);
      router.push("/(tabs)/calendar");
    } else {
      Alert.alert(
        notif.title,
        notif.description,
        [
          { text: "Dispensar", style: "destructive", onPress: () => dismissNotification(notif.id) },
          { text: "OK", style: "default" }
        ]
      );
    }
  };

  const dismissNotification = (id: string) => {
    setDismissedNotifIds(prev => [...prev, id]);
  };

  const handleGenerateShareCard = (workout: any) => {
    setSelectedWorkoutIdForDetail(null);
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

  const clearAllNotifications = () => {
    const currentIds = getNotifications().map(n => n.id);
    setDismissedNotifIds(prev => [...prev, ...currentIds]);
  };

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
      title: `${user?.profile?.companionName || "Companheiro"}`,
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

    // 4. Silent sync notification
    if (newWorkoutsSyncedMessage) {
      list.push({
        id: "silentsync",
        icon: "🔄",
        title: "Sincronização Concluída",
        description: newWorkoutsSyncedMessage,
        time: "Agora",
      });
    }

    return list.filter(n => !dismissedNotifIds.includes(n.id));
  };

  const latestWorkout = workouts[0];

  const getVolumeComparisonData = () => {
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

    // Calculate last week Monday
    const lastWeekMonday = new Date(currentWeekMonday);
    lastWeekMonday.setDate(currentWeekMonday.getDate() - 7);
    lastWeekMonday.setHours(0, 0, 0, 0);

    // Calculate last week Sunday
    const lastWeekSunday = new Date(lastWeekMonday);
    lastWeekSunday.setDate(lastWeekMonday.getDate() + 6);
    lastWeekSunday.setHours(23, 59, 59, 999);

    // Daily volume arrays: index 0 = Seg, 6 = Dom
    const thisWeekDaily = [0, 0, 0, 0, 0, 0, 0];
    const lastWeekDaily = [0, 0, 0, 0, 0, 0, 0];

    workouts.forEach((w) => {
      const d = new Date(w.date);
      const dist = w.distance || 0;
      const rawDay = d.getDay(); // 0 = Sunday, 1 = Monday
      const dayIdx = rawDay === 0 ? 6 : rawDay - 1;

      if (d >= currentWeekMonday && d <= currentWeekSunday) {
        thisWeekDaily[dayIdx] += dist;
      } else if (d >= lastWeekMonday && d <= lastWeekSunday) {
        lastWeekDaily[dayIdx] += dist;
      }
    });

    const thisWeekTotal = thisWeekDaily.reduce((a, b) => a + b, 0);
    const lastWeekTotal = lastWeekDaily.reduce((a, b) => a + b, 0);

    // Determine max value for y scaling (minimum range of 5.0 km)
    const maxVal = Math.max(...thisWeekDaily, ...lastWeekDaily, 5.0);
    const range = maxVal || 1.0;

    // Coordinate mapping (Width 280, height 125, plot area X: 35 to 265, Y: 15 to 90)
    const coralPoints = thisWeekDaily.map((dist, i) => {
      const x = 35 + i * (230 / 6);
      const y = 90 - (dist / range) * 75;
      return { x, y };
    });

    const lastWeekPoints = lastWeekDaily.map((dist, i) => {
      const x = 35 + i * (230 / 6);
      const y = 90 - (dist / range) * 75;
      return { x, y };
    });

    const coralPath = `M ${coralPoints.map(pt => `${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(" L ")}`;
    const lastWeekPath = `M ${lastWeekPoints.map(pt => `${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(" L ")}`;

    const coralArea = `${coralPath} L ${coralPoints[6].x.toFixed(1)} 90 L ${coralPoints[0].x.toFixed(1)} 90 Z`;
    const lastWeekArea = `${lastWeekPath} L ${lastWeekPoints[6].x.toFixed(1)} 90 L ${lastWeekPoints[0].x.toFixed(1)} 90 Z`;

    const labels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];
    
    // Y-axis gridline labels (4 intervals, from top to bottom)
    const yLabels = [
      `${maxVal.toFixed(1)}k`,
      `${(maxVal * 0.66).toFixed(1)}k`,
      `${(maxVal * 0.33).toFixed(1)}k`,
      "0.0k",
    ];

    return {
      coralPoints,
      lastWeekPoints,
      coralPath,
      lastWeekPath,
      coralArea,
      lastWeekArea,
      labels,
      yLabels,
      thisWeekDaily,
      lastWeekDaily,
      thisWeekTotalStr: `${thisWeekTotal.toFixed(1)} km`,
      lastWeekTotalStr: `${lastWeekTotal.toFixed(1)} km`,
    };
  };

  const volumeData = getVolumeComparisonData();

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

    // Prompt for notification permissions on first load
    notificationService.requestPermissions().catch((e) => 
      console.log("[Notifications] permission request failed on mount:", e)
    );

    // Silent Strava Sync on mount
    if (isStravaConnected) {
      syncActivities()
        .then((res) => {
          if (res && res.syncedActivities > 0) {
            setNewWorkoutsSyncedMessage("Novo treino detectado! Acesse seus treinos para ter uma análise.");
            loadWeeklyWorkouts(monday);
          }
        })
        .catch((err) => console.log('[Silent Sync] failed:', err));
    }
  }, [isStravaConnected]);

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
    setSelectedWorkoutIdForDetail(workoutId);
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

  const formatDecimalPace = (decimalMin: number) => {
    if (!decimalMin) return "0:00";
    const mins = Math.floor(decimalMin);
    const secs = Math.round((decimalMin - mins) * 60);
    const secsStr = secs < 10 ? `0${secs}` : secs;
    return `${mins}:${secsStr}`;
  };

  const handleShowReadinessInfo = () => {
    Alert.alert(
      "Prontidão Atlética (Athletic Readiness)",
      "Este índice avalia seu estado físico atual para treinar:\n\n" +
      "• Recuperação: Tempo de descanso diário sugerido com base no cansaço acumulado.\n" +
      "• Sono: Projeção de repouso ideal com base no humor do seu check-in diário.\n" +
      "• HRV (Variabilidade Cardíaca): Indica o equilíbrio do seu sistema nervoso autônomo. Valores maiores representam menor cansaço.\n" +
      "• Estresse: Nível de fadiga muscular calculado a partir dos treinos anteriores.\n\n" +
      "O índice diário é gerado ponderando o humor do check-in, dores/lesões e o volume total semanal.",
      [{ text: "Entendido", style: "default" }]
    );
  };

  const selectedWorkoutDetail = 
    workouts.find(w => w.id === selectedWorkoutIdForDetail) || 
    selectedDayWorkouts.find(w => w.id === selectedWorkoutIdForDetail);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
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



        {/* Athletic Readiness */}
        {user?.readiness && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🔋 ATHLETIC READINESS</Text>
            </View>
            <View style={styles.readinessCardNew}>
              <TouchableOpacity 
                onPress={handleShowReadinessInfo}
                style={styles.cardInfoButton}
                activeOpacity={0.6}
              >
                <Text style={styles.cardInfoButtonText}>ℹ️</Text>
              </TouchableOpacity>
              <View style={styles.readinessSplitRow}>
                {/* Circular Gauge Arc on Left */}
                <View style={{ alignItems: "center", width: 110 }}>
                  <View style={styles.readinessGaugeContainer}>
                    <View style={styles.readinessGaugeBackground} />
                    <View 
                      style={[
                        styles.readinessGaugeActiveArc,
                        {
                          borderLeftColor: user.readiness.score >= 35 ? user.readiness.color : "transparent",
                          borderTopColor: user.readiness.score >= 65 ? user.readiness.color : "transparent",
                          borderRightColor: user.readiness.score >= 85 ? user.readiness.color : "transparent",
                        }
                      ]} 
                    />
                    <View style={styles.readinessGaugeValueContainer}>
                      <Text style={styles.readinessGaugeScore}>{user.readiness.score}</Text>
                      <Text style={styles.readinessGaugeOutOf}>/ 100</Text>
                    </View>
                  </View>
                  <Text style={[styles.readinessGaugeLabel, { color: user.readiness.color, marginTop: 8 }]}>
                    {user.readiness.label}
                  </Text>
                </View>

                {/* 2x2 Grid of Sub-metrics on Right */}
                <View style={styles.readinessSubGrid}>
                  <View style={styles.readinessSubBox}>
                    <Text style={styles.readinessSubLabel}>RECUPERAÇÃO</Text>
                    <Text style={styles.readinessSubVal}>
                      {`${Math.round((100 - user.readiness.score) * 0.4)}H`}
                    </Text>
                  </View>
                  <View style={styles.readinessSubBox}>
                    <Text style={styles.readinessSubLabel}>SONO</Text>
                    <Text style={styles.readinessSubVal}>
                      {`${(user.readiness.details.sleepFactor / 12 + 1).toFixed(1)}H`}
                    </Text>
                  </View>
                  <View style={styles.readinessSubBox}>
                    <Text style={styles.readinessSubLabel}>HRV</Text>
                    <Text style={styles.readinessSubVal}>
                      {`${Math.round(40 + user.readiness.score * 0.35)}ms`}
                    </Text>
                  </View>
                  <View style={styles.readinessSubBox}>
                    <Text style={styles.readinessSubLabel}>ESTRESSE</Text>
                    <Text style={[
                      styles.readinessSubVal,
                      { color: user.readiness.details.fatiguePenalty > 15 ? Colors.warning : Colors.success }
                    ]}>
                      {user.readiness.details.fatiguePenalty > 15 ? "ALTO" : user.readiness.details.fatiguePenalty > 5 ? "MÉDIO" : "BAIXO"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Weekly Volume Comparison Chart Card */}
        {latestWorkout && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📈 COMPARATIVO DE VOLUME</Text>
            </View>
            <View style={styles.telemetryCard}>
              <View style={styles.telemetryHeader}>
                <Text style={styles.telemetryActivityName}>Distância (km) por dia</Text>
                <View style={styles.telemetryBullets}>
                  <View style={styles.bulletItem}>
                    <View style={[styles.bulletCircle, { backgroundColor: "#ff6b6b" }]} />
                    <Text style={styles.bulletText}>Esta semana: {volumeData.thisWeekTotalStr}</Text>
                  </View>
                  <View style={styles.bulletItem}>
                    <View style={[styles.bulletCircle, { backgroundColor: "#a0a0b0" }]} />
                    <Text style={styles.bulletText}>Anterior: {volumeData.lastWeekTotalStr}</Text>
                  </View>
                </View>
              </View>

              {/* Chart Grid Area */}
              <View style={styles.chartWrapper}>
                <Svg width="100%" height="125" viewBox="0 0 280 125" style={styles.svgCanvas}>
                  <Defs>
                    <LinearGradient id="coralGradient" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0%" stopColor="#ff6b6b" stopOpacity="0.25" />
                      <Stop offset="100%" stopColor="#ff6b6b" stopOpacity="0.0" />
                    </LinearGradient>
                    <LinearGradient id="greyGradient" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0%" stopColor="#a0a0b0" stopOpacity="0.15" />
                      <Stop offset="100%" stopColor="#a0a0b0" stopOpacity="0.0" />
                    </LinearGradient>
                  </Defs>

                  {/* Horizontal gridlines */}
                  <Line x1="35" y1="15" x2="265" y2="15" stroke="#22222b" strokeWidth="1" />
                  <Line x1="35" y1="40" x2="265" y2="40" stroke="#22222b" strokeWidth="1" />
                  <Line x1="35" y1="65" x2="265" y2="65" stroke="#22222b" strokeWidth="1" />
                  <Line x1="35" y1="90" x2="265" y2="90" stroke="#22222b" strokeWidth="1" />

                  {/* Y Axis Labels */}
                  <SvgText x="27" y="18" fill="#a0a0b0" fontSize="9" fontWeight="600" textAnchor="end">{volumeData.yLabels[0]}</SvgText>
                  <SvgText x="27" y="43" fill="#a0a0b0" fontSize="9" fontWeight="600" textAnchor="end">{volumeData.yLabels[1]}</SvgText>
                  <SvgText x="27" y="68" fill="#a0a0b0" fontSize="9" fontWeight="600" textAnchor="end">{volumeData.yLabels[2]}</SvgText>
                  <SvgText x="27" y="93" fill="#a0a0b0" fontSize="9" fontWeight="600" textAnchor="end">{volumeData.yLabels[3]}</SvgText>

                  {/* Fills under path */}
                  <Path d={volumeData.lastWeekArea} fill="url(#greyGradient)" />
                  <Path d={volumeData.coralArea} fill="url(#coralGradient)" />

                  {/* Comparative line paths */}
                  <Path d={volumeData.lastWeekPath} fill="none" stroke="#a0a0b0" strokeWidth="2.5" strokeDasharray="3 3" />
                  <Path d={volumeData.coralPath} fill="none" stroke="#ff6b6b" strokeWidth="3" />

                  {/* Dot Markers (Last Week) */}
                  {volumeData.lastWeekPoints.map((pt, i) => (
                    <Circle 
                      key={`lw-vis-${i}`} 
                      cx={pt.x.toFixed(1)} 
                      cy={pt.y.toFixed(1)} 
                      r="4" 
                      fill={selectedSplitIndex === i ? "#ffffff" : "#a0a0b0"} 
                      stroke="#1a1a1a" 
                      strokeWidth="1.5" 
                    />
                  ))}
                  {/* Dot Markers (This Week) */}
                  {volumeData.coralPoints.map((pt, i) => (
                    <Circle 
                      key={`c-vis-${i}`} 
                      cx={pt.x.toFixed(1)} 
                      cy={pt.y.toFixed(1)} 
                      r="4.5" 
                      fill={selectedSplitIndex === i ? "#ffffff" : "#ff6b6b"} 
                      stroke="#1a1a1a" 
                      strokeWidth="1.5" 
                    />
                  ))}

                  {/* X Axis Labels */}
                  {volumeData.labels.map((lbl, idx) => {
                    const x = 35 + idx * (230 / 6);
                    return (
                      <SvgText
                        key={`x-${idx}`}
                        x={x.toFixed(1)}
                        y="112"
                        fill="#a0a0b0"
                        fontSize="9"
                        fontWeight="600"
                        textAnchor="middle"
                      >
                        {lbl}
                      </SvgText>
                    );
                  })}

                  {/* Invisible touch targets */}
                  {volumeData.coralPoints.map((pt, i) => (
                    <Circle 
                      key={`touch-${i}`} 
                      cx={pt.x.toFixed(1)} 
                      cy={pt.y.toFixed(1)} 
                      r="20" 
                      fill="transparent" 
                      onPress={() => setSelectedSplitIndex(selectedSplitIndex === i ? null : i)} 
                    />
                  ))}
                </Svg>
              </View>

              {/* Interactive Tooltip area */}
              <View style={styles.chartInteractiveLegend}>
                {selectedSplitIndex !== null ? (
                  <View style={styles.chartTooltip}>
                    <Text style={styles.chartTooltipLabel}>
                      {["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"][selectedSplitIndex]}
                    </Text>
                    <Text style={styles.chartTooltipText}>
                      Esta semana: <Text style={{ color: "#ff6b6b", fontWeight: "700" }}>{volumeData.thisWeekDaily[selectedSplitIndex].toFixed(1)} km</Text>  |  Anterior: <Text style={{ color: "#a0a0b0", fontWeight: "700" }}>{volumeData.lastWeekDaily[selectedSplitIndex].toFixed(1)} km</Text>
                      {"\n"}
                      Diferença: <Text style={{ color: (volumeData.thisWeekDaily[selectedSplitIndex] - volumeData.lastWeekDaily[selectedSplitIndex]) >= 0 ? Colors.success : Colors.warning, fontWeight: "700" }}>
                        {(volumeData.thisWeekDaily[selectedSplitIndex] - volumeData.lastWeekDaily[selectedSplitIndex]) >= 0 ? "+" : ""}
                        {(volumeData.thisWeekDaily[selectedSplitIndex] - volumeData.lastWeekDaily[selectedSplitIndex]).toFixed(1)} km
                      </Text>
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.chartLegendHelp}>
                    💡 Toque nos marcadores do gráfico para comparar o volume diário!
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Latest Workout */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Último Treino</Text>
            <TouchableOpacity onPress={() => router.push("/calendar")}>
              <Text style={styles.sectionLink}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          {latestWorkout ? (
            <WorkoutCard
              workout={latestWorkout}
              onPress={() => setSelectedWorkoutIdForDetail(latestWorkout.id)}
              descriptionOnly={true}
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
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity 
                      onPress={() => handleGenerateShareCard(selectedWorkoutDetail)} 
                      style={{ marginRight: 20, padding: 5 }}
                    >
                      <FontAwesome name="share-alt" size={20} color="#ff6b6b" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setSelectedWorkoutIdForDetail(null)} style={{ padding: 5 }}>
                      <Text style={styles.modalCloseButton}>✕</Text>
                    </TouchableOpacity>
                  </View>
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
                      <Text style={styles.modalMetricValue}>
                        {Math.floor(selectedWorkoutDetail.duration / 3600) > 0
                          ? `${Math.floor(selectedWorkoutDetail.duration / 3600)}h ${Math.floor(
                              (selectedWorkoutDetail.duration % 3600) / 60
                            )}m`
                          : `${Math.floor((selectedWorkoutDetail.duration % 3600) / 60)} min`}
                      </Text>
                      <Text style={styles.modalMetricSubLabel}>Duração</Text>
                    </View>
                    {selectedWorkoutDetail.distance && (
                      <View style={styles.modalMetricCard}>
                        <Text style={styles.modalMetricValue}>
                          {selectedWorkoutDetail.distance.toFixed(1)} km
                        </Text>
                        <Text style={styles.modalMetricSubLabel}>Distância</Text>
                      </View>
                    )}
                    {selectedWorkoutDetail.pace && (
                      <View style={styles.modalMetricCard}>
                        <Text style={styles.modalMetricValue}>
                          {selectedWorkoutDetail.type?.toLowerCase().includes("run") || selectedWorkoutDetail.type?.toLowerCase().includes("corrida")
                            ? formatPace(selectedWorkoutDetail.pace)
                            : `${selectedWorkoutDetail.pace.toFixed(1)} km/h`}
                        </Text>
                        <Text style={styles.modalMetricSubLabel}>
                          {selectedWorkoutDetail.type?.toLowerCase().includes("run") || selectedWorkoutDetail.type?.toLowerCase().includes("corrida")
                            ? "Pace Médio"
                            : "Vel. Média"}
                        </Text>
                      </View>
                    )}
                    {selectedWorkoutDetail.avgHeartRate && (
                      <View style={styles.modalMetricCard}>
                        <Text style={styles.modalMetricValue}>
                          {selectedWorkoutDetail.avgHeartRate} bpm
                        </Text>
                        <Text style={styles.modalMetricSubLabel}>BPM Médio</Text>
                      </View>
                    )}
                    {selectedWorkoutDetail.averageWatts ? (
                      <View style={styles.modalMetricCard}>
                        <Text style={styles.modalMetricValue}>
                          {selectedWorkoutDetail.averageWatts} W
                        </Text>
                        <Text style={styles.modalMetricSubLabel}>Potência</Text>
                      </View>
                    ) : null}
                    {(selectedWorkoutDetail.type === "run" || selectedWorkoutDetail.type === "cycling" || selectedWorkoutDetail.type?.toLowerCase().includes("corrida") || selectedWorkoutDetail.type?.toLowerCase().includes("ciclismo")) && (
                      <>
                        <View style={styles.modalMetricCard}>
                          <Text style={styles.modalMetricValue}>
                            {selectedWorkoutDetail.averageCadence ? `${selectedWorkoutDetail.averageCadence}` : "--"}
                          </Text>
                          <Text style={styles.modalMetricSubLabel}>
                            {selectedWorkoutDetail.type?.toLowerCase().includes("run") || selectedWorkoutDetail.type?.toLowerCase().includes("corrida") ? "Cadência (spm)" : "Cadência (rpm)"}
                          </Text>
                        </View>
                        <View style={styles.modalMetricCard}>
                          <Text style={styles.modalMetricValue}>
                            {selectedWorkoutDetail.elevationGain ? `${Math.round(selectedWorkoutDetail.elevationGain)} m` : "0 m"}
                          </Text>
                          <Text style={styles.modalMetricSubLabel}>Ganho Elevação</Text>
                        </View>
                      </>
                    )}
                    {selectedWorkoutDetail.sufferScore ? (
                      <View style={styles.modalMetricCard}>
                        <Text style={styles.modalMetricValue}>
                          {selectedWorkoutDetail.sufferScore}
                        </Text>
                        <Text style={styles.modalMetricSubLabel}>Esforço Relativo</Text>
                      </View>
                    ) : null}
                    {selectedWorkoutDetail.effortRating && (
                      <View style={styles.modalMetricCard}>
                        <Text style={styles.modalMetricValue}>
                          {selectedWorkoutDetail.effortRating} / 5
                        </Text>
                        <Text style={styles.modalMetricSubLabel}>Esforço (RPE)</Text>
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

                    {!selectedWorkoutDetail.aiNarrative && (
                      <TouchableOpacity
                        style={[styles.modalAnalyzeButton, analyzingWorkoutId === selectedWorkoutDetail.id && styles.modalAnalyzeButtonDisabled]}
                        onPress={() => handleOpenAnalyzeModal(selectedWorkoutDetail)}
                        disabled={analyzingWorkoutId === selectedWorkoutDetail.id}
                      >
                        {analyzingWorkoutId === selectedWorkoutDetail.id ? (
                          <ActivityIndicator color="#ffffff" size="small" />
                        ) : (
                          <Text style={styles.modalAnalyzeButtonText}>🧠 Analisar com IA</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </ScrollView>

                {/* Sub-modal View overlay inside main detail modal to avoid stacking bugs */}
                {effortModalVisible && (
                  <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 1000, borderRadius: 20 }]}>
                      <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
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
                                <Text style={styles.effortModalButtonTextConfirm}>Analisar com IA</Text>
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
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {getNotifications().length > 0 && (
                  <TouchableOpacity onPress={clearAllNotifications}>
                    <Text style={styles.notificationsModalClearAll}>Limpar tudo</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setNotificationsModalVisible(false)}>
                  <Text style={styles.notificationsModalClose}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.notificationsList} showsVerticalScrollIndicator={false}>
              {getNotifications().length === 0 ? (
                <Text style={styles.notificationsEmpty}>Nenhuma notificação por aqui.</Text>
              ) : (
                getNotifications().map((notif) => (
                  <TouchableOpacity 
                    key={notif.id} 
                    style={styles.notificationCard}
                    onPress={() => handleNotificationClick(notif)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.notificationCardIcon}>{notif.icon}</Text>
                    <View style={styles.notificationCardBody}>
                      <Text style={styles.notificationCardTitle}>{notif.title}</Text>
                      <Text style={styles.notificationCardDesc} numberOfLines={2}>{notif.description}</Text>
                      <Text style={styles.notificationCardTime}>{notif.time}</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.notificationCardDismissBtn}
                      onPress={() => dismissNotification(notif.id)}
                    >
                      <Text style={styles.notificationCardDismissText}>✕</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
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
                <Text style={{ color: Colors.textSecondary, fontSize: 22 }}>✕</Text>
              </TouchableOpacity>
            </View>

            {sharingWorkout && (() => {
              const isPersonalRecord = (sharingWorkout.prCount && sharingWorkout.prCount > 0) || 
                                       sharingWorkout.title?.toLowerCase().includes("pr") || 
                                       sharingWorkout.title?.toLowerCase().includes("rp") ||
                                       sharingWorkout.title?.toLowerCase().includes("recorde");

              const getWantedStatusText = (workout: any) => {
                if (workout.type === "run") return "CORRENDO OU CAMINHANDO";
                if (workout.type === "cycling") return "PEDALANDO OU CORRENDO";
                return "TREINANDO OU DESCANSANDO";
              };

              const getWantedCrimeDesc = (workout: any) => {
                const personality = user?.profile?.aiPersonality || "calm";
                const typeName = workout.type === "run" ? "Corrida" : workout.type === "cycling" ? "Ciclismo" : "Treino";
                const distStr = workout.distance ? `${workout.distance.toFixed(2)} km` : "um super treino";
                const paceStr = workout.pace ? formatPace(workout.pace) : "";
                const paceAndDist = paceStr ? `${distStr} no ritmo de ${paceStr}` : distStr;
                
                switch (personality) {
                  case "strict":
                    return `Exceder os limites estabelecidos e acumular ${paceAndDist} com foco implacável e disciplina militar!`;
                  case "tough":
                    return `Ignorar a preguiça, engolir o cansaço e esmagar ${paceAndDist} sem dar nenhuma desculpa!`;
                  case "funny":
                    return `Correr de boletos imaginários e registrar ${paceAndDist} antes que o despertador soubesse!`;
                  default:
                    return `Inspirar a comunidade de atletas registrando ${paceAndDist} com consistência e evolução constante!`;
                }
              };

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

      {/* Mood Widget - Positioned absolute */}
      <MoodWidget
        onMoodSelect={handleMoodSelect}
        currentMood={currentMood}
        currentMoodEmoji={currentMoodEmoji}
        autoShowIfUndefined={!isLoading && currentMood === undefined}
        hideFloatingButton={true}
      />

      {/* Companion Chat Floating Button */}
      <TouchableOpacity
        style={styles.chatFloatingButton}
        onPress={() => setChatModalVisible(true)}
      >
        <Text style={styles.chatCompanionAvatarEmoji}>
          {user?.profile?.companionAvatar || "🦖"}
        </Text>
        <View style={styles.chatFloatingBadge}>
          <Text style={styles.chatFloatingBadgeText}>💬</Text>
        </View>
      </TouchableOpacity>

      {/* Modal: Companion Chat Overlay */}
      <Modal
        visible={chatModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setChatModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.chatModalOverlay}>
            <View style={styles.chatModalContent}>
              {/* Chat Header */}
              <View style={styles.chatModalHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={styles.chatHeaderAvatarBg}>
                    <Text style={{ fontSize: 24 }}>
                      {user?.profile?.companionAvatar || "🦖"}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.chatHeaderTitle}>
                      {user?.profile?.companionName || "Rocky"}
                    </Text>
                    <Text style={styles.chatHeaderSubtitle}>Parceiro de Treinos IA</Text>
                  </View>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 15 }}>
                  <TouchableOpacity onPress={handleClearChatHistory}>
                    <Text style={styles.chatClearHistoryText}>Limpar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setChatModalVisible(false)}>
                    <Text style={styles.chatCloseButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Message List */}
              <FlatList
                ref={chatFlatListRef}
                data={chatMessages}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 10 }}
                renderItem={({ item }) => {
                  const isUser = item.sender === "user";
                  return (
                    <View style={[styles.chatMsgWrapper, isUser ? styles.chatMsgUserWrapper : styles.chatMsgBotWrapper]}>
                      {!isUser && (
                        <View style={styles.chatMsgAvatarBg}>
                          <Text style={{ fontSize: 16 }}>
                            {user?.profile?.companionAvatar || "🦖"}
                          </Text>
                        </View>
                      )}
                      <View style={[styles.chatMsgBubble, isUser ? styles.chatMsgUserBubble : styles.chatMsgBotBubble]}>
                        <Text style={styles.chatMsgText}>{item.text}</Text>
                        <Text style={styles.chatMsgTime}>{item.timestamp}</Text>
                      </View>
                    </View>
                  );
                }}
                ListFooterComponent={() =>
                  chatIsTyping ? (
                    <View style={styles.chatMsgBotWrapper}>
                      <View style={styles.chatMsgAvatarBg}>
                        <Text style={{ fontSize: 16 }}>
                          {user?.profile?.companionAvatar || "🦖"}
                        </Text>
                      </View>
                      <View style={[styles.chatMsgBubble, styles.chatMsgBotBubble, { paddingVertical: 8, paddingHorizontal: 12 }]}>
                        <ActivityIndicator size="small" color="#ff6b6b" />
                      </View>
                    </View>
                  ) : null
                }
              />

              {/* Suggestions */}
              {chatSuggestions.length > 0 && (
                <View style={styles.chatSuggestionsWrapper}>
                  {chatSuggestions.map((sug, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.chatSuggestionBubble}
                      onPress={() => handleSendChatMessage(sug)}
                    >
                      <Text style={styles.chatSuggestionText}>{sug}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Input Row */}
              <View style={styles.chatInputRow}>
                <TextInput
                  style={styles.chatTextInput}
                  placeholder="Pergunte sobre treinos, pace, metas..."
                  placeholderTextColor="#666"
                  value={chatInputText}
                  onChangeText={setChatInputText}
                  multiline={false}
                  onSubmitEditing={() => handleSendChatMessage()}
                />
                <TouchableOpacity
                  style={styles.chatSendButton}
                  onPress={() => handleSendChatMessage()}
                >
                  <Text style={styles.chatSendButtonText}>➔</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  modalShareAction: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 16,
    alignItems: "center",
  },
  modalShareActionText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "700",
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
    justifyContent: "space-between",
    marginBottom: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1d1d1f",
    borderTopWidth: 1,
    borderTopColor: "#1d1d1f",
  },
  modalMetricCard: {
    width: "30%",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalMetricIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  modalMetricValue: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  modalMetricSubLabel: {
    color: Colors.textSecondary,
    fontSize: 8,
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 4,
    textAlign: "center",
    letterSpacing: 0.5,
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
  notificationsModalClearAll: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: "600",
    marginRight: 16,
  },
  notificationCardDismissBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  notificationCardDismissText: {
    color: Colors.textSecondary,
    fontSize: 16,
    opacity: 0.5,
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
  cardInfoButton: {
    position: "absolute",
    top: 14,
    right: 14,
    zIndex: 10,
    padding: 6,
  },
  cardInfoButtonText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  readinessCardNew: {
    backgroundColor: Colors.darkCard,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    borderRadius: 20,
    padding: 20,
    position: "relative",
  },
  readinessSplitRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  readinessGaugeContainer: {
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    marginLeft: 8,
  },
  readinessGaugeBackground: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 8,
    borderColor: "#22222b",
    borderBottomColor: "transparent",
    transform: [{ rotate: "-135deg" }],
  },
  readinessGaugeActiveArc: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 8,
    borderColor: "transparent",
    transform: [{ rotate: "-135deg" }],
  },
  readinessGaugeValueContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
  },
  readinessGaugeScore: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 24,
  },
  readinessGaugeOutOf: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: "600",
    marginTop: -2,
  },
  readinessGaugeLabel: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    textAlign: "center",
    lineHeight: 13,
  },
  infoButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#161622",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  infoButtonText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "600",
  },
  readinessSubGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginLeft: 24,
    gap: 12,
  },
  readinessSubBox: {
    width: "45%",
    backgroundColor: "transparent",
    marginBottom: 4,
  },
  readinessSubLabel: {
    color: Colors.textSecondary,
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  readinessSubVal: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  telemetryCard: {
    backgroundColor: Colors.darkCard,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    borderRadius: 20,
    padding: 20,
  },
  telemetryHeader: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: 12,
  },
  telemetryActivityName: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  telemetryBullets: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bulletItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bulletCircle: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bulletText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  chartWrapper: {
    height: 125,
    position: "relative",
    marginHorizontal: 4,
  },
  svgCanvas: {
    width: "100%",
    height: 125,
  },
  chartInteractiveLegend: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#222",
    alignItems: "center",
    width: "100%",
  },
  chartTooltip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161622",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    gap: 8,
  },
  chartTooltipLabel: {
    color: "#ff6b6b",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    borderRightWidth: 1,
    borderRightColor: "#333",
    paddingRight: 8,
  },
  chartTooltipText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "500",
  },
  chartLegendHelp: {
    color: Colors.textSecondary,
    fontSize: 10.5,
    fontStyle: "italic",
    textAlign: "center",
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
  goalStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 8,
    gap: 12,
  },
  goalStatMiniCard: {
    flex: 1,
    backgroundColor: Colors.dark,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
  },
  goalStatMiniLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginBottom: 2,
  },
  goalStatMiniValue: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  modalShareStoriesButton: {
    backgroundColor: Colors.dark,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  modalShareStoriesButtonText: {
    color: Colors.text,
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
    backgroundColor: Colors.darkCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    padding: 16,
    maxHeight: "90%",
  },
  shareModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.darkBorder,
    paddingBottom: 10,
  },
  shareModalTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  // Carousel selector
  carouselSelectorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: 290,
    marginBottom: 14,
    backgroundColor: "#161622",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  carouselSelectorArrow: {
    padding: 6,
  },
  carouselSelectorArrowText: {
    color: "#ff6b6b",
    fontSize: 16,
    fontWeight: "bold",
  },
  carouselSelectorTitle: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  carouselIndicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 14,
  },
  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#444",
  },
  carouselDotActive: {
    backgroundColor: "#ff6b6b",
    width: 16,
  },

  // Wanted template (Parchment look)
  storiesCardFrameWanted: {
    width: 290,
    height: 480,
    borderRadius: 16,
    padding: 16,
    backgroundColor: "#eedca5",
    borderWidth: 5,
    borderColor: "#4d3419",
    alignItems: "center",
    justifyContent: "space-between",
  },
  wantedBannerText: {
    fontSize: 32,
    fontWeight: "900",
    color: "#4d3419",
    letterSpacing: 2,
  },
  wantedSubBannerText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#4d3419",
    letterSpacing: 4,
    marginTop: -8,
  },
  wantedAvatarBox: {
    width: 140,
    height: 140,
    borderWidth: 4,
    borderColor: "#4d3419",
    backgroundColor: "#dfcca0",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
  wantedAvatarImage: {
    width: "100%",
    height: "100%",
  },
  classicPRBadge: {
    backgroundColor: "#ffd700",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "center",
    marginTop: -4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#cca300",
  },
  classicPRBadgeText: {
    color: "#000000",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  cleanPRBadge: {
    backgroundColor: "#ffd700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  cleanPRBadgeText: {
    color: "#000",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },
  wantedAvatarChar: {
    fontSize: 80,
  },
  wantedDetails: {
    alignItems: "center",
    width: "100%",
  },
  wantedTargetName: {
    fontSize: 20,
    fontWeight: "900",
    color: "#4d3419",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  wantedCrimeLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#734d26",
    letterSpacing: 1.5,
  },
  wantedCrimeDesc: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4d3419",
    textAlign: "center",
    paddingHorizontal: 8,
    marginTop: 2,
    lineHeight: 16,
  },
  wantedDivider: {
    width: "60%",
    height: 2,
    backgroundColor: "#4d3419",
    marginVertical: 8,
  },
  wantedBountyLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#734d26",
    letterSpacing: 1.5,
  },
  wantedBountyValue: {
    fontSize: 12,
    fontWeight: "900",
    color: "#a62626",
    textAlign: "center",
    marginTop: 2,
  },
  wantedFooterLogo: {
    fontSize: 9,
    fontWeight: "800",
    color: "#4d3419",
    letterSpacing: 1,
    opacity: 0.6,
  },

  // Clean template (Minimalist look)
  storiesCardFrameClean: {
    width: 290,
    height: 480,
    borderRadius: 16,
    padding: 20,
    backgroundColor: "#0d0d12",
    borderWidth: 1,
    borderColor: "#222",
    justifyContent: "space-between",
  },
  cleanHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cleanLogo: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 2,
  },
  cleanBadge: {
    backgroundColor: "#333",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  cleanBadgeText: {
    color: "#ffffff",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1,
  },
  cleanMainStatsContainer: {
    flex: 1,
    justifyContent: "center",
    gap: 20,
  },
  cleanMainStat: {
    alignItems: "flex-start",
  },
  cleanStatVal: {
    color: "#ff6b6b",
    fontSize: 54,
    fontWeight: "900",
    lineHeight: 58,
  },
  cleanStatLbl: {
    color: "#b0b0b0",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginTop: -2,
  },
  cleanStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 10,
  },
  cleanSubStat: {
    width: "45%",
  },
  cleanSubStatVal: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  cleanSubStatLbl: {
    color: "#888",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 2,
  },
  cleanFooterDate: {
    color: "#666",
    fontSize: 10,
    fontWeight: "600",
  },

  storiesCardFrame: {
    width: 290,
    height: 480,
    backgroundColor: Colors.dark,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.primary,
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
    color: Colors.text,
    fontWeight: "900",
    letterSpacing: 2,
    fontSize: 14,
  },
  storiesCardWatermark: {
    color: Colors.textSecondary,
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
    backgroundColor: Colors.darkCard,
    borderWidth: 1,
    borderColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  storiesCompanionAvatar: {
    fontSize: 26,
  },
  storiesCompanionName: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  storiesCompanionSub: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  storiesSpeechBubble: {
    backgroundColor: Colors.darkCard,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    marginTop: 15,
    flex: 1,
    justifyContent: "center",
  },
  storiesSpeechText: {
    color: Colors.text,
    fontSize: 12.5,
    lineHeight: 18,
    fontStyle: "italic",
    textAlign: "center",
  },
  storiesWorkoutBox: {
    backgroundColor: Colors.darkCard,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    marginTop: 16,
    opacity: 0.95,
  },
  storiesWorkoutTitle: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  storiesWorkoutDate: {
    color: Colors.textSecondary,
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
    color: Colors.textSecondary,
    fontSize: 10,
  },
  storiesStatValue: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  shareSaveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
    marginTop: 20,
    width: 290,
  },
  shareSaveButtonText: {
    color: Colors.dark,
    fontSize: 15,
    fontWeight: "800",
  },
  chatFloatingButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.darkBorder,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    zIndex: 10,
  },
  chatCompanionAvatarEmoji: {
    fontSize: 32,
    marginTop: -2,
  },
  chatFloatingBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#111",
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  chatFloatingBadgeText: {
    fontSize: 12,
  },
  chatModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  chatModalContent: {
    height: "85%",
    backgroundColor: Colors.darkCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
  },
  chatModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: Colors.darkBorder,
    paddingBottom: 12,
    marginBottom: 10,
  },
  chatHeaderAvatarBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dark,
    borderWidth: 1,
    borderColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  chatHeaderTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  chatHeaderSubtitle: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  chatClearHistoryText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  chatCloseButtonText: {
    color: Colors.primary,
    fontSize: 22,
    fontWeight: "600",
  },
  chatMsgWrapper: {
    flexDirection: "row",
    marginVertical: 6,
    alignItems: "flex-end",
    gap: 8,
  },
  chatMsgUserWrapper: {
    justifyContent: "flex-end",
  },
  chatMsgBotWrapper: {
    justifyContent: "flex-start",
  },
  chatMsgAvatarBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.dark,
    borderWidth: 1,
    borderColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  chatMsgBubble: {
    maxWidth: "75%",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  chatMsgUserBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  chatMsgBotBubble: {
    backgroundColor: Colors.dark,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    borderBottomLeftRadius: 4,
  },
  chatMsgText: {
    color: Colors.text,
    fontSize: 14,
    lineHeight: 19,
  },
  chatMsgTime: {
    color: Colors.textSecondary,
    fontSize: 9,
    alignSelf: "flex-end",
    marginTop: 4,
  },
  chatSuggestionsWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginVertical: 8,
  },
  chatSuggestionBubble: {
    backgroundColor: Colors.dark,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
  },
  chatSuggestionText: {
    color: Colors.primary,
    fontSize: 12,
  },
  chatInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  chatTextInput: {
    flex: 1,
    height: 48,
    backgroundColor: Colors.dark,
    color: Colors.text,
    borderRadius: 24,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    fontSize: 14,
  },
  chatSendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  chatSendButtonText: {
    color: Colors.dark,
    fontSize: 18,
    fontWeight: "700",
  },
});
