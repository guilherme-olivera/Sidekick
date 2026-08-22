import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  SafeAreaView,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/src/contexts/AuthContext";
import { useStrava } from "@/src/contexts/StravaContext";
import { useDashboard } from "@/src/contexts/DashboardContext";
import { apiUpload, API_BASE_URL, apiService } from "@/src/services/apiService";
import { router } from "expo-router";

const Colors = {
  dark: "#0a0a0a",
  darkCard: "#1a1a1a",
  darkBorder: "#333333",
  text: "#ffffff",
  textSecondary: "#b0b0b0",
  primary: "#ff6b6b",
  success: "#51cf66",
  warning: "#ffa94d",
  gold: "#ffd700",
};

type SportTab = "run" | "strength" | "cycling" | "walk";

export default function ProfileScreen() {
  const { user, logout, isLoading, refreshUser } = useAuth();
  const { isConnected, athlete, connect, disconnect, syncActivities } = useStrava();
  const [allWorkouts, setAllWorkouts] = useState<any[]>([]);
  const [isLoadingAllWorkouts, setIsLoadingAllWorkouts] = useState(false);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [activeSportTab, setActiveSportTab] = useState<SportTab>("run");
  const [stravaStats, setStravaStats] = useState<any | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const [historyAnalysis, setHistoryAnalysis] = useState<string | null>(null);
  const [historyAnalysisUpdatedAt, setHistoryAnalysisUpdatedAt] = useState<string | null>(null);
  const [updatingHistoryAnalysis, setUpdatingHistoryAnalysis] = useState(false);

  // Estados para personalização do companheiro
  const [companionName, setCompanionName] = useState("");
  const [companionAvatar, setCompanionAvatar] = useState("🤖");
  const [isCompanionModalVisible, setIsCompanionModalVisible] = useState(false);
  const [savingCompanion, setSavingCompanion] = useState(false);

  // Estados para compartilhamento de conquistas
  const [selectedBadge, setSelectedBadge] = useState<any | null>(null);
  const [shareModalVisible, setShareModalVisible] = useState(false);

  // Estados para diagnóstico do sistema
  const [testingDiagnostics, setTestingDiagnostics] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null);
  const [isDiagnosticModalVisible, setIsDiagnosticModalVisible] = useState(false);

  const runDiagnostics = async () => {
    setIsDiagnosticModalVisible(true);
    setTestingDiagnostics(true);
    setDiagnosticResults(null);
    try {
      const response = await apiService.get("/diagnostics/test");
      if (response && response.success && response.results) {
        setDiagnosticResults(response.results);
      } else {
        setDiagnosticResults({
          error: response?.error || "Erro de resposta inesperado do servidor."
        });
      }
    } catch (err: any) {
      setDiagnosticResults({
        error: err.message || "Não foi possível conectar ao servidor."
      });
    } finally {
      setTestingDiagnostics(false);
    }
  };

  useEffect(() => {
    if (user?.profile) {
      setCompanionName(user.profile.companionName || "");
      setCompanionAvatar(user.profile.companionAvatar || "🤖");
    }
  }, [user]);

  const handleSaveCompanion = async () => {
    if (!companionName.trim()) {
      Alert.alert("Erro", "Por favor, digite um nome para seu companheiro.");
      return;
    }
    setSavingCompanion(true);
    try {
      const res = await apiService.put('/user/profile', {
        ...user?.profile,
        companionName: companionName.trim(),
        companionAvatar: companionAvatar
      });
      if (res && res.success) {
        Alert.alert("Sucesso", "Configurações do companheiro salvas!");
        setIsCompanionModalVisible(false);
        refreshUser();
      } else {
        Alert.alert("Erro", res.error || "Erro ao salvar perfil.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Erro", "Erro ao salvar no servidor.");
    } finally {
      setSavingCompanion(false);
    }
  };

  const handleBadgePress = (emoji: string, name: string, desc: string, unlocked: boolean) => {
    if (!unlocked) {
      Alert.alert("Bloqueado", "Realize mais treinos para desbloquear esta conquista!");
      return;
    }
    setSelectedBadge({ emoji, name, desc });
    setShareModalVisible(true);
  };

  // Cálculo de Carga de Treino Semanal
  const getWeeklyWorkloadData = () => {
    const data = [];
    const today = new Date();
    
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(today);
      const todayDay = today.getDay();
      const mondayOffset = todayDay === 0 ? -6 : 1 - todayDay;
      weekStart.setDate(today.getDate() + mondayOffset - (i * 7));
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      const weekWorkouts = allWorkouts.filter(w => {
        const d = new Date(w.date);
        return d >= weekStart && d <= weekEnd;
      });
      
      const totalKm = weekWorkouts.reduce((sum, w) => sum + (w.distance || 0), 0);
      const label = i === 0 ? "Atual" : `Sem -${i}`;
      data.push({ label, distance: totalKm });
    }
    
    return data;
  };

  const chartData = getWeeklyWorkloadData();
  const maxDistanceScale = Math.max(...chartData.map(d => d.distance), 10);

  const loadAllWorkouts = async () => {
    try {
      setIsLoadingAllWorkouts(true);
      const response = await apiService.get("/workouts");
      if (response.success && response.workouts) {
        setAllWorkouts(response.workouts.map((w: any) => ({
          ...w,
          date: new Date(w.date)
        })));
      }
    } catch (err) {
      console.error("Failed to load all workouts for profile:", err);
    } finally {
      setIsLoadingAllWorkouts(false);
    }
  };

  // Fetch Strava cumulative stats, local workouts and IA evolution analysis
  useEffect(() => {
    loadAllWorkouts();
    loadHistoryAnalysis();
    if (isConnected) {
      loadStravaStats();
    } else {
      setStravaStats(null);
    }
  }, [isConnected]);

  const loadHistoryAnalysis = async () => {
    try {
      const response = await apiService.get("/user/history-analysis");
      if (response && response.success) {
        setHistoryAnalysis(response.analysis);
        setHistoryAnalysisUpdatedAt(response.updatedAt);
      }
    } catch (err) {
      console.error("Error loading history analysis:", err);
    }
  };

  const handleUpdateHistoryAnalysis = async () => {
    try {
      setUpdatingHistoryAnalysis(true);
      const response = await apiService.post("/user/history-analysis", {});
      if (response && response.success) {
        setHistoryAnalysis(response.analysis);
        setHistoryAnalysisUpdatedAt(response.updatedAt);
        Alert.alert("Relatório atualizado!", "Sua evolução histórica foi analisada com sucesso.");
      } else {
        throw new Error(response?.error || "Erro desconhecido");
      }
    } catch (err) {
      console.error("Error updating history analysis:", err);
      Alert.alert("Erro", err instanceof Error ? err.message : "Não foi possível gerar a evolução histórica. Tente novamente.");
    } finally {
      setUpdatingHistoryAnalysis(false);
    }
  };

  const loadStravaStats = async () => {
    try {
      setIsLoadingStats(true);
      const response = await apiService.get("/strava/stats");
      if (response.success && response.isConnected && response.stats) {
        setStravaStats(response.stats);
      }
    } catch (error) {
      console.error("Failed to load Strava stats:", error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const getAvatarUri = (avatarPath?: string | null): string | undefined => {
    if (!avatarPath) return undefined;
    if (avatarPath.startsWith("http://") || avatarPath.startsWith("https://")) {
      return avatarPath;
    }
    return `${API_BASE_URL}${avatarPath.startsWith("/") ? "" : "/"}${avatarPath}`;
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        await uploadAvatar(result.assets[0]);
      }
    } catch (error) {
      Alert.alert("Erro", "Falha ao selecionar imagem");
    }
  };

  const uploadAvatar = async (asset: any) => {
    try {
      setUploadingAvatar(true);

      const formData = new FormData();
      formData.append("avatar", {
        uri: asset.uri,
        type: "image/jpeg",
        name: `avatar_${Date.now()}.jpg`,
      } as any);

      const response = await apiUpload("/user/avatar", formData);
      if (response.success) {
        await refreshUser();
        Alert.alert("Sucesso", "Avatar atualizado com sucesso!");
      } else {
        Alert.alert("Erro", response.error || "Falha ao fazer upload do avatar");
      }
    } catch (error) {
      Alert.alert("Erro", "Erro ao fazer upload do avatar");
      console.error("Avatar upload error:", error);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleStravaConnect = async () => {
    try {
      await connect();
    } catch (error) {
      Alert.alert("Erro", "Falha ao conectar Strava");
    }
  };

  const handleStravaSync = async () => {
    try {
      const result = await syncActivities();
      Alert.alert(
        "Sincronização concluída",
        `Atividades sincronizadas: ${result?.syncedActivities || 0}`
      );
      await loadAllWorkouts();
      if (isConnected) {
        await loadStravaStats();
      }
    } catch (error) {
      Alert.alert("Erro", "Falha ao sincronizar com Strava");
    }
  };

  const handleStravaDisconnect = () => {
    Alert.alert(
      "Desconectar Strava",
      "Tem certeza que deseja desconectar do Strava?",
      [
        { text: "Cancelar", onPress: () => {} },
        {
          text: "Desconectar",
          onPress: async () => {
            try {
              await disconnect();
              setStravaStats(null);
              Alert.alert("Sucesso", "Desconectado do Strava");
            } catch (error) {
              Alert.alert("Erro", "Falha ao desconectar");
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // ----- STATS FORMATTING HELPERS -----
  const formatSecondsToTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}h ${mins}min`;
    }
    if (mins > 0) {
      return `${mins}min ${secs}s`;
    }
    return `${secs}s`;
  };

  const getBestTimeForDistance = (sportWorkouts: any[], targetDistance: number) => {
    const matches = sportWorkouts.filter(w => (w.distance || 0) >= targetDistance);
    if (matches.length === 0) return null;
    
    // Scale or fetch best duration
    const bestDuration = Math.min(...matches.map(w => {
      const ratio = targetDistance / w.distance;
      return w.duration * ratio;
    }));
    
    const hrs = Math.floor(bestDuration / 3600);
    const mins = Math.floor((bestDuration % 3600) / 60);
    const secs = Math.floor(bestDuration % 60);
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ----- SPORT-SPECIFIC LOCAL WORKOUTS FILTERING -----
  const sportWorkouts = allWorkouts.filter(w => {
    if (activeSportTab === "run") return w.type === "run";
    if (activeSportTab === "cycling") return w.type === "cycling";
    if (activeSportTab === "strength") return w.type === "strength";
    return w.type === "run" && w.title?.toLowerCase().includes("caminhada"); // Caminhada mock/local filter
  });

  const recentSportWorkouts = sportWorkouts.filter(w => {
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - 28); // Last 4 weeks
    return new Date(w.date) >= limitDate;
  });

  // Calculate local records
  const maxDistance = sportWorkouts.length > 0 ? Math.max(...sportWorkouts.map(w => w.distance || 0)) : 0;
  const maxDuration = sportWorkouts.length > 0 ? Math.max(...sportWorkouts.map(w => w.duration || 0)) : 0;

  // ----- RENDER VARIABLES FOR TAB SECTIONS -----
  let recentCount = "0";
  let recentDistance = "0.0 km";
  let recentTime = "0s";
  let recentElevation = "0 m";

  let ytdCount = "0";
  let ytdDistance = "0.0 km";
  let ytdTime = "0s";
  let ytdElevation = "0 m";

  let allCount = "0";
  let allDistance = "0.0 km";
  let allTime = "0s";
  let allElevation = "0 m";

  let showElevation = activeSportTab === "run" || activeSportTab === "cycling" || activeSportTab === "walk";
  let showDistance = activeSportTab !== "strength";

  if (activeSportTab === "run") {
    if (stravaStats?.recent_run_totals) {
      recentCount = (stravaStats.recent_run_totals.count / 4).toFixed(1).replace(".0", "");
      recentDistance = `${(stravaStats.recent_run_totals.distance / 1000 / 4).toFixed(1)} km`;
      recentTime = formatSecondsToTime(stravaStats.recent_run_totals.moving_time / 4);
      recentElevation = `${Math.round(stravaStats.recent_run_totals.elevation_gain / 4)} m`;

      ytdCount = stravaStats.ytd_run_totals.count.toString();
      ytdDistance = `${(stravaStats.ytd_run_totals.distance / 1000).toFixed(1)} km`;
      ytdTime = formatSecondsToTime(stravaStats.ytd_run_totals.moving_time);
      ytdElevation = `${Math.round(stravaStats.ytd_run_totals.elevation_gain)} m`;

      allCount = stravaStats.all_run_totals.count.toString();
      allDistance = `${(stravaStats.all_run_totals.distance / 1000).toFixed(1)} km`;
      allTime = formatSecondsToTime(stravaStats.all_run_totals.moving_time);
      allElevation = `${Math.round(stravaStats.all_run_totals.elevation_gain)} m`;
    } else {
      // Fallback local running calculations
      recentCount = (recentSportWorkouts.length / 4).toFixed(1).replace(".0", "");
      recentDistance = `${(recentSportWorkouts.reduce((sum, w) => sum + (w.distance || 0), 0) / 4).toFixed(1)} km`;
      recentTime = formatSecondsToTime(recentSportWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0) / 4);
      recentElevation = "0 m";

      ytdCount = sportWorkouts.length.toString();
      ytdDistance = `${sportWorkouts.reduce((sum, w) => sum + (w.distance || 0), 0).toFixed(1)} km`;
      ytdTime = formatSecondsToTime(sportWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0));
      ytdElevation = "0 m";

      allCount = ytdCount;
      allDistance = ytdDistance;
      allTime = ytdTime;
      allElevation = ytdElevation;
    }
  } else if (activeSportTab === "cycling") {
    if (stravaStats?.recent_ride_totals) {
      recentCount = (stravaStats.recent_ride_totals.count / 4).toFixed(1).replace(".0", "");
      recentDistance = `${(stravaStats.recent_ride_totals.distance / 1000 / 4).toFixed(1)} km`;
      recentTime = formatSecondsToTime(stravaStats.recent_ride_totals.moving_time / 4);
      recentElevation = `${Math.round(stravaStats.recent_ride_totals.elevation_gain / 4)} m`;

      ytdCount = stravaStats.ytd_ride_totals.count.toString();
      ytdDistance = `${(stravaStats.ytd_ride_totals.distance / 1000).toFixed(1)} km`;
      ytdTime = formatSecondsToTime(stravaStats.ytd_ride_totals.moving_time);
      ytdElevation = `${Math.round(stravaStats.ytd_ride_totals.elevation_gain)} m`;

      allCount = stravaStats.all_ride_totals.count.toString();
      allDistance = `${(stravaStats.all_ride_totals.distance / 1000).toFixed(1)} km`;
      allTime = formatSecondsToTime(stravaStats.all_ride_totals.moving_time);
      allElevation = `${Math.round(stravaStats.all_ride_totals.elevation_gain)} m`;
    } else {
      recentCount = (recentSportWorkouts.length / 4).toFixed(1).replace(".0", "");
      recentDistance = `${(recentSportWorkouts.reduce((sum, w) => sum + (w.distance || 0), 0) / 4).toFixed(1)} km`;
      recentTime = formatSecondsToTime(recentSportWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0) / 4);
      recentElevation = "0 m";

      ytdCount = sportWorkouts.length.toString();
      ytdDistance = `${sportWorkouts.reduce((sum, w) => sum + (w.distance || 0), 0).toFixed(1)} km`;
      ytdTime = formatSecondsToTime(sportWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0));
      ytdElevation = "0 m";

      allCount = ytdCount;
      allDistance = ytdDistance;
      allTime = ytdTime;
      allElevation = ytdElevation;
    }
  } else if (activeSportTab === "walk") {
    // Caminhada calculated locally or estimated
    recentCount = (recentSportWorkouts.length / 4).toFixed(1).replace(".0", "");
    recentDistance = `${(recentSportWorkouts.reduce((sum, w) => sum + (w.distance || 0), 0) / 4).toFixed(1)} km`;
    recentTime = formatSecondsToTime(recentSportWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0) / 4);
    recentElevation = "0 m";

    ytdCount = sportWorkouts.length.toString();
    ytdDistance = `${sportWorkouts.reduce((sum, w) => sum + (w.distance || 0), 0).toFixed(1)} km`;
    ytdTime = formatSecondsToTime(sportWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0));
    ytdElevation = "0 m";

    allCount = ytdCount;
    allDistance = ytdDistance;
    allTime = ytdTime;
    allElevation = ytdElevation;
  } else if (activeSportTab === "strength") {
    // Strength is purely local
    recentCount = (recentSportWorkouts.length / 4).toFixed(1).replace(".0", "");
    recentTime = formatSecondsToTime(recentSportWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0) / 4);

    ytdCount = sportWorkouts.length.toString();
    ytdTime = formatSecondsToTime(sportWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0));

    allCount = ytdCount;
    allTime = ytdTime;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handlePickImage}
            disabled={uploadingAvatar}
            activeOpacity={0.7}
          >
            {uploadingAvatar ? (
              <ActivityIndicator color={Colors.primary} size="large" />
            ) : user?.avatar ? (
              <Image
                source={{ uri: getAvatarUri(user.avatar) }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatar}>👤</Text>
            )}
            <View style={styles.editBadge}>
              <Text style={styles.editBadgeIcon}>📷</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>

          <TouchableOpacity
            style={styles.customizeCompanionBtn}
            onPress={() => {
              setCompanionName(user?.profile?.companionName || "");
              setCompanionAvatar(user?.profile?.companionAvatar || "🤖");
              setIsCompanionModalVisible(true);
            }}
          >
            <Text style={styles.customizeCompanionText}>
              {user?.profile?.companionAvatar || "🤖"} Personalizar {user?.profile?.companionName || "Companheiro"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Section: Minhas Estatísticas style Strava */}
        <View style={styles.section}>
          <Text style={styles.sectionTitleMain}>Minhas estatísticas</Text>

          {/* Sport Selector Tabs */}
          <View style={styles.sportTabsContainer}>
            <TouchableOpacity
              style={[styles.sportTabButton, activeSportTab === "run" && styles.sportTabButtonActive]}
              onPress={() => setActiveSportTab("run")}
            >
              <Text style={styles.sportTabIcon}>👟</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sportTabButton, activeSportTab === "strength" && styles.sportTabButtonActive]}
              onPress={() => setActiveSportTab("strength")}
            >
              <Text style={styles.sportTabIcon}>🏋️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sportTabButton, activeSportTab === "cycling" && styles.sportTabButtonActive]}
              onPress={() => setActiveSportTab("cycling")}
            >
              <Text style={styles.sportTabIcon}>🚲</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sportTabButton, activeSportTab === "walk" && styles.sportTabButtonActive]}
              onPress={() => setActiveSportTab("walk")}
            >
              <Text style={styles.sportTabIcon}>🚶</Text>
            </TouchableOpacity>
          </View>

          {isLoadingStats ? (
            <View style={styles.statsLoader}>
              <ActivityIndicator color={Colors.primary} size="small" />
              <Text style={styles.loaderText}>Carregando dados do Strava...</Text>
            </View>
          ) : (
            <>
              {/* Block: Últimas 4 semanas */}
              <View style={styles.statsBlock}>
                <Text style={styles.statsBlockTitle}>Últimas 4 semanas</Text>
                
                <View style={styles.statRow}>
                  <Text style={styles.statRowLabel}>Atividades/semana</Text>
                  <Text style={styles.statRowValue}>{recentCount}</Text>
                </View>

                {showDistance && (
                  <View style={styles.statRow}>
                    <Text style={styles.statRowLabel}>Média de distância / semana</Text>
                    <Text style={styles.statRowValue}>{recentDistance}</Text>
                  </View>
                )}

                <View style={styles.statRow}>
                  <Text style={styles.statRowLabel}>Média de tempo / semana</Text>
                  <Text style={styles.statRowValue}>{recentTime}</Text>
                </View>

                {showElevation && (
                  <View style={styles.statRow}>
                    <Text style={styles.statRowLabel}>Ganho de elev./semana</Text>
                    <Text style={styles.statRowValue}>{recentElevation}</Text>
                  </View>
                )}
              </View>

              {/* Block: Melhores marcas */}
              <View style={styles.statsBlock}>
                <View style={styles.rpHeaderRow}>
                  <Text style={styles.statsBlockTitle}>Melhores marcas</Text>
                  <TouchableOpacity>
                    <Text style={styles.addRpText}>Adicionar RP</Text>
                  </TouchableOpacity>
                </View>

                {activeSportTab === "run" && (
                  <>
                    <View style={styles.statRow}>
                      <Text style={styles.statRowLabel}>400 m</Text>
                      <Text style={styles.statRowLink}>{getBestTimeForDistance(sportWorkouts, 0.4) || "--"}</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statRowLabel}>1/2 milha</Text>
                      <Text style={styles.statRowLink}>{getBestTimeForDistance(sportWorkouts, 0.8) || "--"}</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statRowLabel}>1 km</Text>
                      <Text style={styles.statRowLink}>{getBestTimeForDistance(sportWorkouts, 1.0) || "--"}</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statRowLabel}>1 milha</Text>
                      <Text style={styles.statRowLink}>{getBestTimeForDistance(sportWorkouts, 1.6) || "--"}</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statRowLabel}>5 km</Text>
                      <Text style={styles.statRowLink}>{getBestTimeForDistance(sportWorkouts, 5.0) || "--"}</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statRowLabel}>10 km</Text>
                      <Text style={styles.statRowLink}>{getBestTimeForDistance(sportWorkouts, 10.0) || "--"}</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statRowLabel}>Meia maratona</Text>
                      <Text style={styles.statRowLink}>{getBestTimeForDistance(sportWorkouts, 21.1) || "--"}</Text>
                    </View>
                  </>
                )}

                {activeSportTab === "cycling" && (
                  <>
                    <View style={styles.statRow}>
                      <Text style={styles.statRowLabel}>Maior distância</Text>
                      <Text style={styles.statRowLink}>{maxDistance > 0 ? `${maxDistance.toFixed(1)} km` : "--"}</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statRowLabel}>10 km</Text>
                      <Text style={styles.statRowLink}>{getBestTimeForDistance(sportWorkouts, 10.0) || "--"}</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statRowLabel}>20 km</Text>
                      <Text style={styles.statRowLink}>{getBestTimeForDistance(sportWorkouts, 20.0) || "--"}</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statRowLabel}>50 km</Text>
                      <Text style={styles.statRowLink}>{getBestTimeForDistance(sportWorkouts, 50.0) || "--"}</Text>
                    </View>
                  </>
                )}

                {activeSportTab === "strength" && (
                  <>
                    <View style={styles.statRow}>
                      <Text style={styles.statRowLabel}>Treino mais longo</Text>
                      <Text style={styles.statRowLink}>{maxDuration > 0 ? formatSecondsToTime(maxDuration) : "--"}</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statRowLabel}>Frequência recorde</Text>
                      <Text style={styles.statRowLink}>{sportWorkouts.length > 0 ? `${sportWorkouts.length} treinos` : "--"}</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statRowLabel}>Volume máximo estimado</Text>
                      <Text style={styles.statRowLink}>--</Text>
                    </View>
                  </>
                )}

                {activeSportTab === "walk" && (
                  <>
                    <View style={styles.statRow}>
                      <Text style={styles.statRowLabel}>Maior caminhada</Text>
                      <Text style={styles.statRowLink}>{maxDistance > 0 ? `${maxDistance.toFixed(1)} km` : "--"}</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statRowLabel}>Treino mais longo</Text>
                      <Text style={styles.statRowLink}>{maxDuration > 0 ? formatSecondsToTime(maxDuration) : "--"}</Text>
                    </View>
                  </>
                )}
              </View>

              {/* Block: Evolução & Gamificação (IA) */}
              <View style={styles.statsBlock}>
                <View style={styles.rpHeaderRow}>
                  <Text style={styles.statsBlockTitle}>🏆 Evolução & Nível (IA)</Text>
                  <TouchableOpacity 
                    onPress={handleUpdateHistoryAnalysis}
                    disabled={updatingHistoryAnalysis}
                  >
                    {updatingHistoryAnalysis ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <Text style={styles.addRpText}>🔄 Atualizar</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {historyAnalysis ? (
                  <View style={styles.historyAnalysisContainer}>
                    <Text style={styles.historyAnalysisText}>
                      {historyAnalysis}
                    </Text>
                    {historyAnalysisUpdatedAt && (
                      <Text style={styles.historyAnalysisTime}>
                        Atualizado em: {new Date(historyAnalysisUpdatedAt).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    )}
                  </View>
                ) : (
                  <View style={styles.historyAnalysisEmptyContainer}>
                    <Text style={styles.historyAnalysisEmptyText}>
                      Você ainda não gerou seu relatório de evolução histórica com IA.
                    </Text>
                    <TouchableOpacity
                      style={styles.generateHistoryButton}
                      onPress={handleUpdateHistoryAnalysis}
                      disabled={updatingHistoryAnalysis}
                    >
                      {updatingHistoryAnalysis ? (
                        <ActivityIndicator color="#0a0a0a" />
                      ) : (
                        <Text style={styles.generateHistoryButtonText}>Gerar Relatório de Evolução</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {/* SVG Weekly Workload Chart */}
                <Text style={styles.badgesSectionTitle}>📊 Carga de Treino Semanal (Últimas 4 semanas)</Text>
                <View style={styles.chartBlock}>
                  <View style={styles.chartContainer}>
                    {chartData.map((d, index) => {
                      const heightPct = d.distance > 0 ? (d.distance / maxDistanceScale) * 100 : 0;
                      return (
                        <View key={index} style={styles.chartColumnWrapper}>
                          <Text style={styles.chartValue}>{d.distance.toFixed(1)} km</Text>
                          <View style={styles.chartTrack}>
                            <View style={[styles.chartBar, { height: `${Math.max(heightPct, 6)}%` }]} />
                          </View>
                          <Text style={styles.chartLabel}>{d.label}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* Gamified Badges */}
                <Text style={styles.badgesSectionTitle}>🎖️ Conquistas Desbloqueadas</Text>
                <View style={styles.badgesContainer}>
                  <TouchableOpacity
                    style={[styles.badgeItem, allWorkouts.length > 0 ? styles.badgeUnlocked : styles.badgeLocked]}
                    onPress={() => handleBadgePress("🏃", "Primeiro Passo", "1+ treinos realizados", allWorkouts.length > 0)}
                  >
                    <Text style={styles.badgeEmoji}>{allWorkouts.length > 0 ? "🏃" : "🔒"}</Text>
                    <Text style={styles.badgeName}>Primeiro Passo</Text>
                    <Text style={styles.badgeDesc}>1+ treinos realizados</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.badgeItem, allWorkouts.length >= 5 ? styles.badgeUnlocked : styles.badgeLocked]}
                    onPress={() => handleBadgePress("🔥", "Consistente", "5+ treinos realizados", allWorkouts.length >= 5)}
                  >
                    <Text style={styles.badgeEmoji}>{allWorkouts.length >= 5 ? "🔥" : "🔒"}</Text>
                    <Text style={styles.badgeName}>Consistente</Text>
                    <Text style={styles.badgeDesc}>5+ treinos realizados</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.badgeItem, allWorkouts.reduce((sum, w) => sum + (w.distance || 0), 0) >= 50 ? styles.badgeUnlocked : styles.badgeLocked]}
                    onPress={() => handleBadgePress("🧭", "Devorador de KM", "50+ km acumulados", allWorkouts.reduce((sum, w) => sum + (w.distance || 0), 0) >= 50)}
                  >
                    <Text style={styles.badgeEmoji}>{allWorkouts.reduce((sum, w) => sum + (w.distance || 0), 0) >= 50 ? "🧭" : "🔒"}</Text>
                    <Text style={styles.badgeName}>Devorador de KM</Text>
                    <Text style={styles.badgeDesc}>50+ km acumulados</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Block: Ano atual (2026) */}
              <View style={styles.statsBlock}>
                <Text style={styles.statsBlockTitle}>Ano atual (2026)</Text>
                
                <View style={styles.statRow}>
                  <Text style={styles.statRowLabel}>Atividades</Text>
                  <Text style={styles.statRowValue}>{ytdCount}</Text>
                </View>

                {showDistance && (
                  <View style={styles.statRow}>
                    <Text style={styles.statRowLabel}>Distância</Text>
                    <Text style={styles.statRowValue}>{ytdDistance}</Text>
                  </View>
                )}

                <View style={styles.statRow}>
                  <Text style={styles.statRowLabel}>Tempo</Text>
                  <Text style={styles.statRowValue}>{ytdTime}</Text>
                </View>

                {showElevation && (
                  <View style={styles.statRow}>
                    <Text style={styles.statRowLabel}>Ganho de elev.</Text>
                    <Text style={styles.statRowValue}>{ytdElevation}</Text>
                  </View>
                )}
              </View>

              {/* Block: Totais */}
              <View style={styles.statsBlock}>
                <Text style={styles.statsBlockTitle}>Totais acumulados</Text>
                
                <View style={styles.statRow}>
                  <Text style={styles.statRowLabel}>Atividades</Text>
                  <Text style={styles.statRowValue}>{allCount}</Text>
                </View>

                {showDistance && (
                  <View style={styles.statRow}>
                    <Text style={styles.statRowLabel}>Distância</Text>
                    <Text style={styles.statRowValue}>{allDistance}</Text>
                  </View>
                )}

                <View style={styles.statRow}>
                  <Text style={styles.statRowLabel}>Tempo</Text>
                  <Text style={styles.statRowValue}>{allTime}</Text>
                </View>

                {showElevation && (
                  <View style={styles.statRow}>
                    <Text style={styles.statRowLabel}>Ganho de elev.</Text>
                    <Text style={styles.statRowValue}>{allElevation}</Text>
                  </View>
                )}
              </View>
            </>
          )}
        </View>

        {/* Strava Integration Section (Moved to the bottom, before logout) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Integrações</Text>
          <View style={styles.stravaBox}>
            {isConnected ? (
              <View style={styles.stravaConnectedContainer}>
                <Text style={styles.stravaStatusText}>✅ Strava Conectado!</Text>
                {athlete && (
                  <View style={styles.athleteProfile}>
                    {athlete.profile ? (
                      <Image source={{ uri: athlete.profile }} style={styles.athleteImage} />
                    ) : (
                      <View style={[styles.athleteImage, styles.athleteImagePlaceholder]}>
                        <Text style={{ fontSize: 24 }}>🏃</Text>
                      </View>
                    )}
                    <Text style={styles.athleteName}>{athlete.name || athlete.username}</Text>
                  </View>
                )}

                <View style={styles.integrationRowButtons}>
                  <TouchableOpacity
                    style={styles.syncButton}
                    onPress={handleStravaSync}
                  >
                    <Text style={styles.syncButtonText}>🔄 Sincronizar</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.disconnectButton}
                    onPress={handleStravaDisconnect}
                  >
                    <Text style={styles.disconnectButtonText}>❌ Desconectar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.stravaDisconnectedContainer}>
                <Text style={styles.stravaStatusText}>❌ Nenhuma conta do Strava conectada</Text>
                
                <TouchableOpacity
                  style={styles.connectButton}
                  onPress={handleStravaConnect}
                >
                  <Text style={styles.connectButtonText}>👟 Conectar Conta Strava</Text>
                </TouchableOpacity>

                <Text style={styles.stravaHint}>
                  Vincule sua conta para trazer suas atividades e métricas automaticamente.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Ajustar Sidekick & Metas Button */}
        <TouchableOpacity
          style={styles.adjustButton}
          onPress={() => router.push("/onboarding?edit=true")}
          activeOpacity={0.8}
        >
          <Text style={styles.adjustButtonText}>
            ⚙️ Ajustar Sidekick & Metas
          </Text>
        </TouchableOpacity>

        {/* Diagnostics Button */}
        <TouchableOpacity
          style={styles.diagnosticButton}
          onPress={runDiagnostics}
          activeOpacity={0.8}
        >
          <Text style={styles.diagnosticButtonText}>
            🛠️ Testar Conexões (Diagnóstico)
          </Text>
        </TouchableOpacity>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutButtonText}>
            {isLoading ? "Saindo..." : "Sair da Conta"}
          </Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Sidekick v1.0.0</Text>
          <Text style={styles.footerText}>© 2026 - Seu Companheiro Digital</Text>
        </View>

        <View style={{ height: 30 }} />

        {/* Diagnostic Modal */}
        <Modal
          visible={isDiagnosticModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsDiagnosticModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>🛠️ Painel de Diagnóstico</Text>
              
              <Text style={styles.modalSubtitle}>
                Este painel executa testes em tempo real para verificar a integridade da comunicação do app com o servidor, a inteligência artificial (Gemini) e o servidor de e-mail (SMTP).
              </Text>

              <ScrollView style={{ maxHeight: 300, width: "100%", marginVertical: 15 }} keyboardShouldPersistTaps="handled">
                {testingDiagnostics ? (
                  <View style={styles.diagnosticLoading}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={[styles.loaderText, { marginTop: 10 }]}>Executando testes no servidor...</Text>
                  </View>
                ) : diagnosticResults ? (
                  diagnosticResults.error ? (
                    <View style={styles.diagnosticErrorBox}>
                      <Text style={styles.diagnosticErrorText}>❌ Erro Geral de Rede:</Text>
                      <Text style={styles.diagnosticErrorDetail}>{diagnosticResults.error}</Text>
                    </View>
                  ) : (
                    <View style={styles.diagnosticResultsContainer}>
                      {/* Database Check */}
                      <View style={styles.diagnosticItem}>
                        <Text style={styles.diagnosticItemHeader}>
                          {diagnosticResults.db?.success ? "✅ Banco de Dados: Conectado" : "❌ Banco de Dados: Erro"}
                        </Text>
                        {diagnosticResults.db?.error && (
                          <Text style={styles.diagnosticErrorDetail}>{diagnosticResults.db.error}</Text>
                        )}
                      </View>

                      {/* Gemini Check */}
                      <View style={styles.diagnosticItem}>
                        <Text style={styles.diagnosticItemHeader}>
                          {diagnosticResults.gemini?.success ? "✅ Inteligência Artificial (Gemini): Ok" : "❌ Inteligência Artificial (Gemini): Erro"}
                        </Text>
                        {diagnosticResults.gemini?.result && (
                          <Text style={styles.diagnosticSuccessDetail}>Resposta do Gemini: "{diagnosticResults.gemini.result}"</Text>
                        )}
                        {diagnosticResults.gemini?.error && (
                          <Text style={styles.diagnosticErrorDetail}>{diagnosticResults.gemini.error}</Text>
                        )}
                      </View>

                      {/* SMTP Check */}
                      <View style={styles.diagnosticItem}>
                        <Text style={styles.diagnosticItemHeader}>
                          {diagnosticResults.email?.success ? "✅ Servidor de E-mail (SMTP): Ok" : "❌ Servidor de E-mail (SMTP): Erro"}
                        </Text>
                        {diagnosticResults.email?.success && (
                          <Text style={styles.diagnosticSuccessDetail}>E-mail de teste enviado com sucesso para a sua caixa de entrada!</Text>
                        )}
                        {diagnosticResults.email?.error && (
                          <View>
                            <Text style={styles.diagnosticErrorDetail}>{diagnosticResults.email.error}</Text>
                            <Text style={styles.diagnosticHint}>
                              Dica: Verifique se a senha do app de 16 caracteres está correta e se a variável SMTP_PORT está como 465 na Render.
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )
                ) : null}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnCancel]}
                  onPress={() => setIsDiagnosticModalVisible(false)}
                >
                  <Text style={styles.modalBtnCancelText}>Fechar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnConfirm]}
                  onPress={runDiagnostics}
                  disabled={testingDiagnostics}
                >
                  <Text style={styles.modalBtnConfirmText}>
                    {testingDiagnostics ? "Testando..." : "Refazer Testes"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Companion Personalization Modal */}
        <Modal
          visible={isCompanionModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsCompanionModalVisible(false)}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Personalizar Companheiro 👥</Text>
                  <Text style={styles.modalSubtitle}>
                    Dê um nome e escolha um avatar exclusivo para o seu companheiro digital de treinos.
                  </Text>

                  <Text style={styles.inputLabel}>Nome do Companheiro:</Text>
                  <TextInput
                    value={companionName}
                    onChangeText={setCompanionName}
                    placeholder="Ex: Treinador Iron, Buddy, Sidekick..."
                    style={styles.modalInput}
                    placeholderTextColor="#666"
                  />

                  <Text style={styles.inputLabel}>Escolha o Avatar:</Text>
                  <View style={styles.avatarSelectionGrid}>
                    {["🤖", "🦁", "⏱️", "⚡", "🦊", "🦅"].map((av) => (
                      <TouchableOpacity
                        key={av}
                        style={[
                          styles.avatarOption,
                          companionAvatar === av && styles.avatarOptionSelected,
                        ]}
                        onPress={() => setCompanionAvatar(av)}
                      >
                        <Text style={{ fontSize: 28 }}>{av}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalBtn, styles.modalBtnCancel]}
                      onPress={() => setIsCompanionModalVisible(false)}
                    >
                      <Text style={styles.modalBtnCancelText}>Voltar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalBtn, styles.modalBtnConfirm]}
                      onPress={handleSaveCompanion}
                      disabled={savingCompanion}
                    >
                      {savingCompanion ? (
                        <ActivityIndicator size="small" color="#000" />
                      ) : (
                        <Text style={styles.modalBtnConfirmText}>Salvar</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </Modal>

        {/* Medal Share Modal */}
        <Modal
          visible={shareModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShareModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.shareCardContent}>
              <Text style={styles.shareTitle}>Compartilhar Conquista 🏆</Text>
              
              {selectedBadge && (
                <View style={styles.shareCard}>
                  <Text style={styles.shareLogo}>🏃‍♂️ Sidekick</Text>
                  <Text style={styles.shareCardEmoji}>{selectedBadge.emoji}</Text>
                  <Text style={styles.shareCardName}>{selectedBadge.name}</Text>
                  <Text style={styles.shareCardDesc}>{selectedBadge.desc}</Text>
                  <Text style={styles.shareCardFooter}>sidekickapp.com</Text>
                </View>
              )}
              
              <View style={styles.shareActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnCancel]}
                  onPress={() => setShareModalVisible(false)}
                >
                  <Text style={styles.modalBtnCancelText}>Fechar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnConfirm]}
                  onPress={() => {
                    const Share = require("react-native").Share;
                    Share.share({
                      message: `Conquistei o badge "${selectedBadge?.name}" (${selectedBadge?.desc}) no app Sidekick! 🏃‍♂️🔥`,
                    }).catch((err: any) => console.log(err));
                  }}
                >
                  <Text style={styles.modalBtnConfirmText}>Compartilhar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

interface StatItemProps {
  label: string;
  value: string;
  icon: string;
}

function StatItem({ label, value, icon }: StatItemProps) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: 20,
    paddingVertical: 12,
  },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.darkCard,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    position: "relative",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 45,
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.dark,
  },
  editBadgeIcon: {
    fontSize: 14,
  },
  avatar: {
    fontSize: 40,
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitleMain: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 12,
  },
  sportTabsContainer: {
    flexDirection: "row",
    backgroundColor: Colors.darkCard,
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  sportTabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
  },
  sportTabButtonActive: {
    backgroundColor: Colors.darkBorder,
  },
  sportTabIcon: {
    fontSize: 20,
  },
  statsLoader: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loaderText: {
    marginTop: 10,
    color: Colors.textSecondary,
    fontSize: 13,
  },
  statsBlock: {
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
  },
  statsBlockTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 12,
  },
  rpHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  addRpText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  statRowLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  statRowValue: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  statRowLink: {
    color: "#4dabf7",
    fontSize: 14,
    fontWeight: "600",
  },
  integrationCard: {
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
  },
  integrationConnected: {
    borderColor: Colors.success,
  },
  integrationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  integrationIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  integrationInfo: {
    flex: 1,
  },
  integrationName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 2,
  },
  integrationStatus: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statusBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.darkBorder,
  },
  statusBadgeConnected: {
    backgroundColor: Colors.success,
  },
  statusDot: {
    fontSize: 12,
    color: Colors.darkCard,
  },
  integrationActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.darkBorder,
    alignItems: "center",
  },
  actionButtonPrimary: {
    backgroundColor: Colors.primary,
  },
  actionButtonDanger: {
    backgroundColor: "#8b0000",
  },
  actionButtonText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statItem: {
    width: "48%",
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.darkBorder,
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  logoutButton: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    marginTop: 12,
  },
  logoutButtonText: {
    color: "#ff6b6b",
    fontSize: 16,
    fontWeight: "600",
  },
  adjustButton: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    marginTop: 20,
  },
  adjustButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
    marginTop: 24,
    paddingVertical: 16,
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  stravaBox: {
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    padding: 20,
    marginTop: 10,
    width: "100%",
  },
  stravaConnectedContainer: {
    width: "100%",
    alignItems: "center",
  },
  stravaDisconnectedContainer: {
    width: "100%",
    alignItems: "center",
  },
  stravaStatusText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  athleteProfile: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    width: "100%",
    marginBottom: 20,
    gap: 12,
  },
  athleteImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  athleteImagePlaceholder: {
    backgroundColor: "#222",
    alignItems: "center",
    justifyContent: "center",
  },
  athleteName: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  syncButton: {
    backgroundColor: Colors.gold,
    borderRadius: 10,
    paddingVertical: 14,
    flex: 1,
    marginRight: 8,
    alignItems: "center",
  },
  syncButtonText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "700",
  },
  connectButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    width: "100%",
    alignItems: "center",
    marginBottom: 16,
  },
  connectButtonText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  stravaHint: {
    color: Colors.textSecondary,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 8,
  },
  integrationRowButtons: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    marginTop: 8,
  },
  disconnectButton: {
    backgroundColor: "#222",
    borderRadius: 10,
    paddingVertical: 14,
    flex: 1,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.darkBorder,
  },
  disconnectButtonText: {
    color: "#ff6b6b",
    fontSize: 14,
    fontWeight: "700",
  },
  historyAnalysisContainer: {
    backgroundColor: Colors.dark,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  historyAnalysisText: {
    color: Colors.text,
    fontSize: 13.5,
    lineHeight: 20,
  },
  historyAnalysisTime: {
    color: Colors.textSecondary,
    fontSize: 11,
    opacity: 0.6,
    marginTop: 8,
    textAlign: "right",
  },
  historyAnalysisEmptyContainer: {
    backgroundColor: Colors.dark,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  historyAnalysisEmptyText: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
    marginBottom: 14,
    lineHeight: 18,
  },
  generateHistoryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  generateHistoryButtonText: {
    color: "#0a0a0a",
    fontSize: 13,
    fontWeight: "700",
  },
  badgesSectionTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 12,
  },
  badgesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  badgeItem: {
    flex: 1,
    backgroundColor: Colors.dark,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  badgeUnlocked: {
    borderColor: Colors.success + "66",
  },
  badgeLocked: {
    borderColor: Colors.darkBorder,
    opacity: 0.4,
  },
  badgeEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  badgeName: {
    color: Colors.text,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 2,
  },
  badgeDesc: {
    color: Colors.textSecondary,
    fontSize: 9,
    textAlign: "center",
  },
  customizeCompanionBtn: {
    marginTop: 14,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#333",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  customizeCompanionText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  chartBlock: {
    backgroundColor: Colors.dark,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    borderRadius: 10,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  chartContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 140,
    paddingTop: 20,
  },
  chartColumnWrapper: {
    flex: 1,
    alignItems: "center",
  },
  chartValue: {
    color: Colors.primary,
    fontSize: 9,
    fontWeight: "700",
    marginBottom: 6,
  },
  chartTrack: {
    width: 24,
    height: 80,
    backgroundColor: "#111",
    borderRadius: 6,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  chartBar: {
    width: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 6,
  },
  chartLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    marginTop: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    backgroundColor: Colors.darkCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    padding: 20,
  },
  modalTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  modalSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
    textAlign: "center",
  },
  modalInput: {
    backgroundColor: "#0a0a0a",
    color: "#fff",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 16,
    width: "100%",
    fontSize: 14,
  },
  inputLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
    alignSelf: "flex-start",
  },
  avatarSelectionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 10,
    width: "100%",
  },
  avatarOption: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#0a0a0a",
    borderWidth: 2,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: "#222",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    width: "100%",
  },
  modalBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnCancel: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    marginRight: 8,
  },
  modalBtnConfirm: {
    backgroundColor: Colors.primary,
  },
  modalBtnCancelText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  modalBtnConfirmText: {
    color: "#0a0a0c",
    fontSize: 14,
    fontWeight: "700",
  },
  shareCardContent: {
    width: "85%",
    backgroundColor: Colors.darkCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    padding: 24,
    alignItems: "center",
  },
  shareTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  shareCard: {
    width: "100%",
    backgroundColor: "#08080a",
    borderWidth: 1.5,
    borderColor: Colors.primary + "44",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
  },
  shareLogo: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 16,
  },
  shareCardEmoji: {
    fontSize: 54,
    marginBottom: 16,
  },
  shareCardName: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
    textAlign: "center",
  },
  shareCardDesc: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 20,
  },
  shareCardFooter: {
    color: Colors.textSecondary,
    fontSize: 9,
    opacity: 0.5,
  },
  shareActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  diagnosticLoading: {
    padding: 30,
    alignItems: "center",
  },
  diagnosticErrorBox: {
    backgroundColor: "#2c1515",
    borderWidth: 1,
    borderColor: "#ff6b6b55",
    borderRadius: 12,
    padding: 16,
    marginVertical: 10,
  },
  diagnosticErrorText: {
    color: "#ff6b6b",
    fontWeight: "700",
    fontSize: 15,
    marginBottom: 4,
  },
  diagnosticErrorDetail: {
    color: "#ff8787",
    fontFamily: Platform.OS === "ios" ? "CourierNewPSMT" : "monospace",
    fontSize: 12,
    marginTop: 4,
  },
  diagnosticSuccessDetail: {
    color: "#8ce99a",
    fontSize: 13,
    marginTop: 4,
  },
  diagnosticResultsContainer: {
    gap: 12,
  },
  diagnosticItem: {
    backgroundColor: "#0d0d0f",
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    borderRadius: 12,
    padding: 16,
  },
  diagnosticItemHeader: {
    color: Colors.text,
    fontWeight: "700",
    fontSize: 15,
  },
  diagnosticHint: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 8,
    fontStyle: "italic",
  },
  diagnosticButton: {
    height: 50,
    borderRadius: 12,
    backgroundColor: "#1c1c24",
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 6,
  },
  diagnosticButtonText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
});
