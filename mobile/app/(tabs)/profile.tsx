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
  RefreshControl,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/src/contexts/AuthContext";
import { useStrava } from "@/src/contexts/StravaContext";
import { useDashboard } from "@/src/contexts/DashboardContext";
import { apiUpload, API_BASE_URL, apiService } from "@/src/services/apiService";
import { router } from "expo-router";

import Svg, { Path, Circle, Defs, LinearGradient, Stop, Line, Text as SvgText } from "react-native-svg";

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

const PRMedal = ({ active = false }) => (
  <Svg width={36} height={36} viewBox="0 0 36 36">
    {/* Ribbon */}
    <Path 
      d="M 12 4 L 18 16 L 24 4" 
      fill="none" 
      stroke={active ? "#fc4c02" : "#555555"} 
      strokeWidth="3.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
    <Path 
      d="M 15 4 L 18 16 L 21 4" 
      fill="none" 
      stroke={active ? "#ffa94d" : "#777777"} 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
    {/* Medallion */}
    <Circle 
      cx={18} 
      cy={22} 
      r={9} 
      fill="#0a0a0c" 
      stroke={active ? "#fc4c02" : "#555555"} 
      strokeWidth="2" 
    />
    {/* PR Text */}
    <SvgText 
      x={18} 
      y={25} 
      fill={active ? "#fc4c02" : "#555555"} 
      fontSize="8" 
      fontWeight="900" 
      textAnchor="middle"
    >
      {active ? "PR" : "RP"}
    </SvgText>
  </Svg>
);

type SportTab = "run" | "strength" | "cycling" | "walk";

export default function ProfileScreen() {
  const { user, logout, isLoading, refreshUser } = useAuth();
  const { isConnected, athlete, connect, disconnect, syncActivities } = useStrava();
  const [allWorkouts, setAllWorkouts] = useState<any[]>([]);
  const [isLoadingAllWorkouts, setIsLoadingAllWorkouts] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

  // Novos estados para aba Perfil Unificada
  const [activeProfileTab, setActiveProfileTab] = useState<"evolucao" | "conquistas">("evolucao");
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);

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

  // Dynamic weekly statistics calculation for Goal Card
  const currentWeekWorkouts = () => {
    const todayDate = new Date();
    const monday = new Date(todayDate);
    const offset = todayDate.getDay() === 0 ? -6 : 1 - todayDate.getDay();
    monday.setDate(todayDate.getDate() + offset);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const weeklyWorkouts = allWorkouts.filter(w => {
      const d = new Date(w.date);
      return d >= monday && d <= sunday;
    });

    const totalSecs = weeklyWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

    const totalDist = weeklyWorkouts.reduce((sum, w) => sum + (w.distance || 0), 0);
    const distanceStr = `${totalDist.toFixed(1)} km`;

    return {
      weeklyWorkouts,
      timeStr,
      distanceStr,
    };
  };

  const currentWeekData = currentWeekWorkouts();

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

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      if (isConnected) {
        try {
          await syncActivities();
        } catch (syncErr) {
          console.error("Failed to sync Strava activities on pull-to-refresh:", syncErr);
        }
      }
      await Promise.all([
        loadAllWorkouts(),
        loadHistoryAnalysis(),
        isConnected ? loadStravaStats() : Promise.resolve(),
      ]);
    } catch (err) {
      console.error("Error during pull-to-refresh:", err);
    } finally {
      setRefreshing(false);
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
      const durationVal = w.movingTime || w.duration || 0;
      return durationVal * ratio;
    }));
    
    const hrs = Math.floor(bestDuration / 3600);
    const mins = Math.floor((bestDuration % 3600) / 60);
    const secs = Math.floor(bestDuration % 60);
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ----- LEVEL, XP, CHALLENGES AND TROPHIES CALCULATIONS -----
  const totalWorkouts = allWorkouts.length;
  const companionNameStr = user?.profile?.companionName || "Rocky";
  const hasStrava = !!user?.stravaAthleteName;

  // Weekly running distance
  const currentWeekDistance = allWorkouts.filter(w => {
    const d = new Date(w.date);
    const today = new Date();
    const offset = today.getDay() === 0 ? -6 : 1 - today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() + offset);
    monday.setHours(0,0,0,0);
    return d >= monday && w.type === "run";
  }).reduce((sum, w) => sum + (w.distance || 0), 0);

  // Weekly workouts count
  const currentWeekWorkoutsCount = allWorkouts.filter(w => {
    const d = new Date(w.date);
    const today = new Date();
    const offset = today.getDay() === 0 ? -6 : 1 - today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() + offset);
    monday.setHours(0,0,0,0);
    return d >= monday;
  }).length;

  const challenge1Complete = currentWeekDistance >= 15;
  const challenge2Complete = currentWeekWorkoutsCount >= 3;
  const challenge3Complete = allWorkouts.some(w => w.sufferScore && w.sufferScore >= 100);

  // Monthly Running distance (50k challenge!)
  const currentMonthDistance = allWorkouts.filter(w => {
    const d = new Date(w.date);
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
    return d >= firstDayOfMonth && w.type === "run";
  }).reduce((sum, w) => sum + (w.distance || 0), 0);

  const monthlyChallengeComplete = currentMonthDistance >= 50;

  // Total XP
  let challengeXp = 0;
  if (challenge1Complete) challengeXp += 200;
  if (challenge2Complete) challengeXp += 150;
  if (challenge3Complete) challengeXp += 150;
  if (monthlyChallengeComplete) challengeXp += 500;

  const totalXp = totalWorkouts * 150 + (hasStrava ? 200 : 0) + (user?.profile?.companionName ? 100 : 0) + challengeXp;
  const xpPerLevel = 500;
  const currentLevel = Math.max(1, Math.floor(totalXp / xpPerLevel) + 1);
  const currentXpInLevel = totalXp % xpPerLevel;
  const xpProgressPct = (currentXpInLevel / xpPerLevel) * 100;

  const trophies = [
    {
      id: "partner",
      title: "Parceria Fechada",
      description: `Deu um nome ao seu companheiro digital (${companionNameStr}).`,
      emoji: "🦖",
      unlocked: !!user?.profile?.companionName,
    },
    {
      id: "strava",
      title: "Dev do Asfalto",
      description: "Conectou sua conta do Strava com o Sidekick.",
      emoji: "🔌",
      unlocked: hasStrava,
    },
    {
      id: "first_workout",
      title: "Primeiro Passo",
      description: "Concluiu e sincronizou sua primeira atividade física.",
      emoji: "🥉",
      unlocked: totalWorkouts >= 1,
    },
    {
      id: "consistency_5",
      title: "Fogo no Tênis",
      description: "Alcançou um histórico de 5 treinos concluídos.",
      emoji: "🔥",
      unlocked: totalWorkouts >= 5,
    },
    {
      id: "runner_10k",
      title: "Destruidor de 10K",
      description: "Correu uma distância maior ou igual a 10km.",
      emoji: "🏃‍♂️",
      unlocked: allWorkouts.some(w => w.type === "run" && (w.distance || 0) >= 10),
    },
    {
      id: "monthly_50k",
      title: "Desafio 50K",
      description: "Correu 50 km acumulados neste mês.",
      emoji: "🏆",
      unlocked: monthlyChallengeComplete,
    },
  ];

  const handleTrophyPress = (trophy: any) => {
    if (!trophy.unlocked) {
      Alert.alert(
        "Troféu Bloqueado",
        `${trophy.description}\n\nContinue treinando para desbloquear esta conquista!`
      );
      return;
    }
    setSelectedBadge({
      emoji: trophy.emoji,
      name: trophy.title,
      desc: trophy.description,
    });
    setShareModalVisible(true);
  };

  // ----- ANNUAL SVG CHART CALCULATIONS -----
  const currentYear = new Date().getFullYear();
  const monthsAbbr = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  
  const monthlyData = monthsAbbr.map((label, index) => {
    const monthWorkouts = allWorkouts.filter(w => {
      const d = new Date(w.date);
      return d.getFullYear() === currentYear && d.getMonth() === index && w.type === "run";
    });
    const distance = monthWorkouts.reduce((sum, w) => sum + (w.distance || 0), 0);
    return { label, distance };
  });

  const maxMonthlyDistance = Math.max(...monthlyData.map(d => d.distance), 10);
  const currentMonthIdx = new Date().getMonth();
  const monthsToAverage = monthlyData.slice(0, currentMonthIdx + 1);
  const totalYearDistance = monthsToAverage.reduce((sum, m) => sum + m.distance, 0);
  const averageMonthlyDistance = totalYearDistance / (currentMonthIdx + 1);

  const points = monthlyData.map((d, index) => {
    const x = 35 + index * 24.54;
    const y = 110 - (d.distance / maxMonthlyDistance) * 90;
    return { x, y, label: d.label, distance: d.distance };
  });

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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Profile Header */}
        <View style={styles.profileHeaderNew}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              style={styles.avatarContainerNew}
              onPress={handlePickImage}
              disabled={uploadingAvatar}
              activeOpacity={0.7}
            >
              {uploadingAvatar ? (
                <ActivityIndicator color={Colors.primary} size="small" />
              ) : user?.avatar ? (
                <Image
                  source={{ uri: getAvatarUri(user.avatar) }}
                  style={styles.avatarImageNew}
                />
              ) : (
                <Text style={styles.avatarPlaceholderNew}>👤</Text>
              )}
              <View style={styles.editBadgeNew}>
                <Text style={styles.editBadgeIconNew}>📷</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.headerInfoCol}>
              <Text style={styles.profileNameNew}>{user?.name || "Atleta"}</Text>
              <TouchableOpacity
                style={styles.customizeCompanionBtnNew}
                onPress={() => {
                  setCompanionName(user?.profile?.companionName || "");
                  setCompanionAvatar(user?.profile?.companionAvatar || "🤖");
                  setIsCompanionModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.customizeCompanionTextNew}>
                  {user?.profile?.companionAvatar || "🦖"} Personalizar {user?.profile?.companionName || "Sidekick"}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.settingsGearBtn}
              onPress={() => setIsSettingsModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.settingsGearIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sub Tab Bar selector */}
        <View style={styles.subTabBarContainer}>
          <TouchableOpacity
            style={[styles.subTabItem, activeProfileTab === "evolucao" && styles.subTabItemActive]}
            onPress={() => setActiveProfileTab("evolucao")}
            activeOpacity={0.8}
          >
            <Text style={[styles.subTabText, activeProfileTab === "evolucao" && styles.subTabTextActive]}>
              Evolução
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.subTabItem, activeProfileTab === "conquistas" && styles.subTabItemActive]}
            onPress={() => setActiveProfileTab("conquistas")}
            activeOpacity={0.8}
          >
            <Text style={[styles.subTabText, activeProfileTab === "conquistas" && styles.subTabTextActive]}>
              Conquistas
            </Text>
          </TouchableOpacity>
        </View>

        {/* Active Tab: Evolução Content */}
        {activeProfileTab === "evolucao" && (
          <View style={{ width: "100%" }}>
            {user?.profile?.isConfigured && (
              <View style={styles.goalCard}>
                <View style={styles.goalHeaderRow}>
                  <Text style={styles.goalName}>
                    🎯 {user.profile.goalDistance === "5k" ? "Corrida de 5km" :
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
                      {currentWeekData.weeklyWorkouts.length} de {user.profile.weeklyFrequency || 3} treinos realizados
                    </Text>
                  </View>
                  {/* Progress bar */}
                  <View style={styles.progressBarBg}>
                    <View 
                      style={[
                        styles.progressBarFill, 
                        { 
                          width: `${Math.min(100, (currentWeekData.weeklyWorkouts.length / (user.profile.weeklyFrequency || 3)) * 100)}%`,
                          backgroundColor: currentWeekData.weeklyWorkouts.length >= (user.profile.weeklyFrequency || 3) ? Colors.success : Colors.primary
                        }
                      ]} 
                    />
                  </View>
                </View>

                {/* Weekly accumulated metrics inside the goal card */}
                <View style={styles.goalStatsRow}>
                  <View style={styles.goalStatMiniCard}>
                    <Text style={styles.goalStatMiniLabel}>Tempo Acumulado</Text>
                    <Text style={styles.goalStatMiniValue}>⏱️ {currentWeekData.timeStr}</Text>
                  </View>
                  <View style={styles.goalStatMiniCard}>
                    <Text style={styles.goalStatMiniLabel}>Distância Semanal</Text>
                    <Text style={styles.goalStatMiniValue}>🏃 {currentWeekData.distanceStr}</Text>
                  </View>
                </View>

                {/* Highlight best workout against target */}
                <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.darkBorder }}>
                  <Text style={styles.goalAdviseText}>
                    {currentWeekData.weeklyWorkouts.length === 0 
                      ? "Nenhum treino realizado ainda esta semana. Calce os tênis e comece!"
                      : currentWeekData.weeklyWorkouts.length >= (user.profile.weeklyFrequency || 3)
                      ? "Meta de frequência semanal batida! Excelente consistência! 🔥"
                      : "Continue firme! Você está no caminho certo para cumprir sua planilha."}
                  </Text>
                </View>
              </View>
            )}
            {/* Card 2: Evolução & Nível (IA) */}
            <View style={styles.levelCardNew}>
              <View style={styles.levelHeaderNew}>
                <View>
                  <Text style={styles.levelLabelNew}>NÍVEL DE ATLETA</Text>
                  <Text style={styles.levelValueNew}>Atleta Lvl {currentLevel}</Text>
                </View>
                <Text style={styles.xpTextNew}>{currentXpInLevel} / {xpPerLevel} XP</Text>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressBarBgNew}>
                <View style={[styles.progressBarFillNew, { width: `${xpProgressPct}%` }]} />
              </View>

              <Text style={styles.xpTipTextNew}>
                Você ganha 150 XP por treino sincronizado e bônus extras ao bater desafios semanais e mensais!
              </Text>

              {/* Weekly IA Progress Narrative */}
              <View style={styles.iaNarrativeSectionNew}>
                <View style={styles.iaNarrativeHeaderNew}>
                  <Text style={styles.iaNarrativeTitleNew}>🦖 Feedback do seu Sidekick</Text>
                  <TouchableOpacity
                    style={styles.iaNarrativeUpdateBtnNew}
                    onPress={handleUpdateHistoryAnalysis}
                    disabled={updatingHistoryAnalysis}
                    activeOpacity={0.7}
                  >
                    {updatingHistoryAnalysis ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <Text style={styles.iaNarrativeUpdateBtnTextNew}>🔄 Atualizar</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {historyAnalysis ? (
                  <View style={styles.iaNarrativeBoxNew}>
                    <Text style={styles.iaNarrativeTextNew}>{historyAnalysis}</Text>
                    {historyAnalysisUpdatedAt && (
                      <Text style={styles.iaNarrativeTimeNew}>
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
                  <View style={styles.iaNarrativeEmptyNew}>
                    <Text style={styles.iaNarrativeEmptyTextNew}>
                      Seu companheiro ainda não analisou seu histórico desta semana.
                    </Text>
                    <TouchableOpacity
                      style={styles.iaNarrativeGenBtnNew}
                      onPress={handleUpdateHistoryAnalysis}
                      disabled={updatingHistoryAnalysis}
                      activeOpacity={0.7}
                    >
                      {updatingHistoryAnalysis ? (
                        <ActivityIndicator color="#0a0a0a" size="small" />
                      ) : (
                        <Text style={styles.iaNarrativeGenBtnTextNew}>Analisar Evolução com IA</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            {/* Card 3: Annual Volume Chart */}
            <View style={styles.annualChartCardNew}>
              <View style={styles.chartCardHeaderRow}>
                <View>
                  <Text style={styles.annualChartTitleNew}>📊 Volume de Corrida Anual ({currentYear})</Text>
                  <Text style={styles.annualChartSubtitleNew}>Corrida acumulada mês a mês (km)</Text>
                </View>
                <View style={styles.chartHeaderValContainer}>
                  <Text style={styles.chartHeaderValSub}>Mês Atual</Text>
                  <Text style={styles.chartHeaderValMain}>
                    {monthlyData[currentMonthIdx]?.distance.toFixed(1)} km
                  </Text>
                </View>
              </View>
              
              <View style={styles.chartContainerNew}>
                <Svg width="100%" height={130} viewBox="0 0 320 130">
                  <Defs>
                    <LinearGradient id="orangeGrad" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0%" stopColor="#fc4c02" stopOpacity="0.5" stopOpacityAlpha={0.5} />
                      <Stop offset="100%" stopColor="#fc4c02" stopOpacity="0.0" stopOpacityAlpha={0.0} />
                    </LinearGradient>
                  </Defs>

                  {/* Vertical grid lines separator */}
                  {points.map((p, index) => (
                    <Line
                      key={`v-grid-${index}`}
                      x1={p.x}
                      y1={20}
                      x2={p.x}
                      y2={110}
                      stroke="#222222"
                      strokeWidth="1"
                    />
                  ))}

                  {/* Horizontal grid lines */}
                  <Line x1={35} y1={20} x2={305} y2={20} stroke="#222222" strokeWidth="1" />
                  <Line x1={35} y1={65} x2={305} y2={65} stroke="#222222" strokeWidth="1" />
                  <Line x1={35} y1={110} x2={305} y2={110} stroke="#333333" strokeWidth="1.5" />

                  {/* Y Axis Labels */}
                  <SvgText x={28} y={23} fill="#666666" fontSize="8" fontWeight="700" textAnchor="end">
                    {maxMonthlyDistance.toFixed(0)} km
                  </SvgText>
                  <SvgText x={28} y={68} fill="#666666" fontSize="8" fontWeight="700" textAnchor="end">
                    {(maxMonthlyDistance / 2).toFixed(0)} km
                  </SvgText>
                  <SvgText x={28} y={113} fill="#666666" fontSize="8" fontWeight="700" textAnchor="end">
                    0 km
                  </SvgText>

                  {/* Average Monthly Line */}
                  {averageMonthlyDistance > 0 && (
                    <>
                      <Line
                        x1={35}
                        y1={110 - (averageMonthlyDistance / maxMonthlyDistance) * 90}
                        x2={305}
                        y2={110 - (averageMonthlyDistance / maxMonthlyDistance) * 90}
                        stroke="#ff6b6b"
                        strokeDasharray="3 3"
                        strokeWidth="1"
                        opacity={0.6}
                      />
                      <SvgText
                        x={305}
                        y={110 - (averageMonthlyDistance / maxMonthlyDistance) * 90 - 4}
                        fill="#ff6b6b"
                        fontSize="8"
                        fontWeight="700"
                        textAnchor="end"
                      >
                        Média: {averageMonthlyDistance.toFixed(1)} km
                      </SvgText>
                    </>
                  )}

                  {/* Shaded Area Under Line */}
                  <Path
                    d={`M ${points[0].x} 110 ` + points.map(p => `L ${p.x} ${p.y}`).join(" ") + ` L ${points[points.length - 1].x} 110 Z`}
                    fill="url(#orangeGrad)"
                  />

                  {/* Connecting Line */}
                  <Path
                    d={points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")}
                    fill="none"
                    stroke="#fc4c02"
                    strokeWidth="2.5"
                  />

                  {/* Data Point Circles */}
                  {points.map((p, index) => {
                    const isCurrent = index === currentMonthIdx;
                    return (
                      <React.Fragment key={`point-${index}`}>
                        {isCurrent && (
                          <Circle
                            cx={p.x}
                            cy={p.y}
                            r="8"
                            fill="#fc4c02"
                            opacity={0.3}
                          />
                        )}
                        <Circle
                          cx={p.x}
                          cy={p.y}
                          r={isCurrent ? 4.5 : 3.5}
                          fill="#0a0a0c"
                          stroke={isCurrent ? "#fc4c02" : "#ff6b6b"}
                          strokeWidth={isCurrent ? 2.5 : 1.5}
                        />
                      </React.Fragment>
                    );
                  })}

                  {/* X Axis Labels */}
                  {points.map((p, index) => {
                    const isCurrent = index === currentMonthIdx;
                    return (
                      <SvgText
                        key={`x-lbl-${index}`}
                        x={p.x}
                        y={124}
                        fill={isCurrent ? "#ffffff" : "#666666"}
                        fontSize="8"
                        fontWeight="800"
                        textAnchor="middle"
                      >
                        {p.label.toUpperCase()}.
                      </SvgText>
                    );
                  })}
                </Svg>
              </View>
            </View>
          </View>
        )}

        {/* Active Tab: Conquistas Content */}
        {activeProfileTab === "conquistas" && (
          <View style={{ width: "100%" }}>
            {/* Trophy Shelf Container */}
            <View style={styles.trophyShelfNew}>
              <Text style={styles.trophyShelfTitleNew}>🏆 Coleção de Troféus</Text>
              <Text style={styles.trophyShelfSubtitleNew}>Toque em um troféu conquistado para comemorar nos Stories!</Text>
              
              <View style={styles.trophyGridNew}>
                {trophies.map(trophy => {
                  return (
                    <TouchableOpacity
                      key={trophy.id}
                      style={[styles.trophyPinNew, trophy.unlocked ? styles.trophyPinUnlockedNew : styles.trophyPinLockedNew]}
                      onPress={() => handleTrophyPress(trophy)}
                      activeOpacity={trophy.unlocked ? 0.7 : 1}
                    >
                      <View style={[styles.trophyHexagonNew, trophy.unlocked ? styles.trophyHexagonUnlockedNew : styles.trophyHexagonLockedNew]}>
                        <Text style={[styles.trophyEmojiNew, !trophy.unlocked && { opacity: 0.4 }]}>
                          {trophy.unlocked ? trophy.emoji : "🔒"}
                        </Text>
                      </View>
                      <Text style={styles.trophyTitleNew}>{trophy.title}</Text>
                      {trophy.id === "monthly_50k" && !trophy.unlocked && (
                        <View style={styles.trophyMiniProgressRowNew}>
                          <View style={styles.trophyProgressBarBgNew}>
                            <View style={[styles.trophyProgressBarFillNew, { width: `${Math.min(100, (currentMonthDistance / 50) * 100)}%` }]} />
                          </View>
                          <Text style={styles.trophyProgressTextNew}>
                            {currentMonthDistance.toFixed(0)}/50k
                          </Text>
                        </View>
                      )}
                      {trophy.unlocked && (
                        <Text style={styles.trophyUnlockedLabelNew}>Conquistado</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Card: Melhores marcas style Strava */}
            <View style={styles.stravaBestsCard}>
              <View style={styles.stravaBestsHeader}>
                <View style={styles.stravaBestsTitleRow}>
                  <Text style={styles.stravaBestsLogo}>⬢</Text>
                  <Text style={styles.stravaBestsTitle}>Melhores marcas</Text>
                </View>
                <Text style={styles.stravaBestsChevron}>›</Text>
              </View>

              <View style={styles.stravaBestsGrid}>
                {/* Column: 1 km */}
                {(() => {
                  const bestTime = getBestTimeForDistance(sportWorkouts, 1.0);
                  const hasPR = !!bestTime;
                  return (
                    <View style={styles.stravaBestsCol}>
                      <PRMedal active={hasPR} />
                      <Text style={styles.stravaBestsLabel}>1 km</Text>
                      <View style={styles.stravaBestsTimeRow}>
                        <Text style={styles.stravaBestsTimeIcon}>👟</Text>
                        <Text style={styles.stravaBestsTimeVal}>{bestTime || "--"}</Text>
                      </View>
                      <Text style={styles.stravaBestsSub}>Melhor de todos</Text>
                    </View>
                  );
                })()}

                {/* Column: 2 milhas */}
                {(() => {
                  const bestTime = getBestTimeForDistance(sportWorkouts, 3.22);
                  const hasPR = !!bestTime;
                  return (
                    <View style={styles.stravaBestsCol}>
                      <PRMedal active={hasPR} />
                      <Text style={styles.stravaBestsLabel}>2 milhas</Text>
                      <View style={styles.stravaBestsTimeRow}>
                        <Text style={styles.stravaBestsTimeIcon}>👟</Text>
                        <Text style={styles.stravaBestsTimeVal}>{bestTime || "--"}</Text>
                      </View>
                      <Text style={styles.stravaBestsSub}>Melhor de todos</Text>
                    </View>
                  );
                })()}

                {/* Column: 5 km */}
                {(() => {
                  const bestTime = getBestTimeForDistance(sportWorkouts, 5.0);
                  const hasPR = !!bestTime;
                  return (
                    <View style={styles.stravaBestsCol}>
                      <PRMedal active={hasPR} />
                      <Text style={styles.stravaBestsLabel}>5 km</Text>
                      <View style={styles.stravaBestsTimeRow}>
                        <Text style={styles.stravaBestsTimeIcon}>👟</Text>
                        <Text style={styles.stravaBestsTimeVal}>{bestTime || "--"}</Text>
                      </View>
                      <Text style={styles.stravaBestsSub}>Melhor de todos</Text>
                    </View>
                  );
                })()}

                {/* Column: 10 km */}
                {(() => {
                  const bestTime = getBestTimeForDistance(sportWorkouts, 10.0);
                  const hasPR = !!bestTime;
                  return (
                    <View style={styles.stravaBestsCol}>
                      <PRMedal active={hasPR} />
                      <Text style={styles.stravaBestsLabel}>10 km</Text>
                      <View style={styles.stravaBestsTimeRow}>
                        <Text style={styles.stravaBestsTimeIcon}>👟</Text>
                        <Text style={styles.stravaBestsTimeVal}>{bestTime || "--"}</Text>
                      </View>
                      <Text style={styles.stravaBestsSub}>Melhor de todos</Text>
                    </View>
                  );
                })()}

                {/* Column: 15 km */}
                {(() => {
                  const bestTime = getBestTimeForDistance(sportWorkouts, 15.0);
                  const hasPR = !!bestTime;
                  return (
                    <View style={styles.stravaBestsCol}>
                      <PRMedal active={hasPR} />
                      <Text style={styles.stravaBestsLabel}>15 km</Text>
                      <View style={styles.stravaBestsTimeRow}>
                        <Text style={styles.stravaBestsTimeIcon}>👟</Text>
                        <Text style={styles.stravaBestsTimeVal}>{bestTime || "--"}</Text>
                      </View>
                      <Text style={styles.stravaBestsSub}>Melhor de todos</Text>
                    </View>
                  );
                })()}

                {/* Column: 21 km */}
                {(() => {
                  const bestTime = getBestTimeForDistance(sportWorkouts, 21.097);
                  const hasPR = !!bestTime;
                  return (
                    <View style={styles.stravaBestsCol}>
                      <PRMedal active={hasPR} />
                      <Text style={styles.stravaBestsLabel}>21 km</Text>
                      <View style={styles.stravaBestsTimeRow}>
                        <Text style={styles.stravaBestsTimeIcon}>👟</Text>
                        <Text style={styles.stravaBestsTimeVal}>{bestTime || "--"}</Text>
                      </View>
                      <Text style={styles.stravaBestsSub}>Melhor de todos</Text>
                    </View>
                  );
                })()}

                {/* Column: 42 km */}
                {(() => {
                  const bestTime = getBestTimeForDistance(sportWorkouts, 42.195);
                  const hasPR = !!bestTime;
                  return (
                    <View style={styles.stravaBestsCol}>
                      <PRMedal active={hasPR} />
                      <Text style={styles.stravaBestsLabel}>42 km</Text>
                      <View style={styles.stravaBestsTimeRow}>
                        <Text style={styles.stravaBestsTimeIcon}>👟</Text>
                        <Text style={styles.stravaBestsTimeVal}>{bestTime || "--"}</Text>
                      </View>
                      <Text style={styles.stravaBestsSub}>Melhor de todos</Text>
                    </View>
                  );
                })()}

                {/* Placeholders to keep spacing balanced */}
                <View style={styles.stravaBestsCol} />
                <View style={styles.stravaBestsCol} />
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
      </View>
    )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Sidekick v1.0.0</Text>
          <Text style={styles.footerText}>© 2026 - Seu Companheiro Digital</Text>
        </View>

        <View style={{ height: 30 }} />

        {/* Settings Modal (Ajustes da Conta) */}
        <Modal
          visible={isSettingsModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsSettingsModalVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setIsSettingsModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.settingsModalContainer}>
                  <View style={styles.settingsModalHeader}>
                    <Text style={styles.settingsModalTitle}>⚙️ Configurações</Text>
                    <TouchableOpacity onPress={() => setIsSettingsModalVisible(false)}>
                      <Text style={styles.settingsModalCloseBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                    {/* Section: Conta */}
                    <View style={styles.settingsSection}>
                      <Text style={styles.settingsSectionTitle}>Sua Conta</Text>
                      <View style={styles.settingsInfoRow}>
                        <Text style={styles.settingsInfoLabel}>Nome:</Text>
                        <Text style={styles.settingsInfoVal}>{user?.name}</Text>
                      </View>
                      <View style={styles.settingsInfoRow}>
                        <Text style={styles.settingsInfoLabel}>E-mail:</Text>
                        <Text style={styles.settingsInfoVal}>{user?.email}</Text>
                      </View>
                    </View>

                    {/* Section: Configurações */}
                    <View style={styles.settingsSection}>
                      <Text style={styles.settingsSectionTitle}>Ajustes do App</Text>
                      
                      <TouchableOpacity
                        style={styles.settingsOptionItem}
                        onPress={() => {
                          setIsSettingsModalVisible(false);
                          router.push("/onboarding?edit=true");
                        }}
                      >
                        <Text style={styles.settingsOptionIcon}>🎯</Text>
                        <Text style={styles.settingsOptionText}>Ajustar Metas e Plano</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.settingsOptionItem}
                        onPress={() => {
                          setIsSettingsModalVisible(false);
                          setCompanionName(user?.profile?.companionName || "");
                          setCompanionAvatar(user?.profile?.companionAvatar || "🤖");
                          setIsCompanionModalVisible(true);
                        }}
                      >
                        <Text style={styles.settingsOptionIcon}>🦖</Text>
                        <Text style={styles.settingsOptionText}>Personalizar Sidekick</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Section: Strava */}
                    <View style={styles.settingsSection}>
                      <Text style={styles.settingsSectionTitle}>Integração Strava</Text>
                      {isConnected ? (
                        <View style={styles.settingsStravaStatusRow}>
                          <Text style={styles.settingsStravaText} numberOfLines={1} ellipsizeMode="tail">
                            ✅ Strava Ativo
                          </Text>
                          <TouchableOpacity
                            style={styles.settingsStravaBtnMini}
                            onPress={() => {
                              setIsSettingsModalVisible(false);
                              handleStravaDisconnect();
                            }}
                          >
                            <Text style={styles.settingsStravaBtnMiniText}>Desconectar</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.settingsStravaBtnConnect}
                          onPress={() => {
                            setIsSettingsModalVisible(false);
                            handleStravaConnect();
                          }}
                        >
                          <Text style={styles.settingsStravaBtnConnectText}>👟 Conectar Strava</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </ScrollView>

                  <View style={styles.settingsActionsRow}>
                    <TouchableOpacity
                      style={styles.settingsDiagBtn}
                      onPress={() => {
                        setIsSettingsModalVisible(false);
                        runDiagnostics();
                      }}
                    >
                      <Text style={styles.settingsDiagBtnText}>🛠️ Diagnóstico</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.settingsLogoutBtn}
                      onPress={() => {
                        setIsSettingsModalVisible(false);
                        handleLogout();
                      }}
                      disabled={isLoading}
                    >
                      <Text style={styles.settingsLogoutBtnText}>
                        {isLoading ? "Saindo..." : "Log Out"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

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
                    {["🤖", "🦖", "👨", "👩", "🦁", "🦊", "🦅", "🧔", "👩‍🦰", "⏱️", "⚡"].map((av) => (
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
  goalCard: {
    backgroundColor: Colors.darkCard,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    borderRadius: 16,
    padding: 16,
    width: "100%",
    marginBottom: 16,
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

  // Styles for unified profile header
  profileHeaderNew: {
    paddingHorizontal: 8,
    paddingTop: 16,
    paddingBottom: 8,
    width: "100%",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  avatarContainerNew: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.darkCard,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.primary,
    position: "relative",
  },
  avatarImageNew: {
    width: "100%",
    height: "100%",
    borderRadius: 36,
  },
  avatarPlaceholderNew: {
    fontSize: 32,
    color: Colors.textSecondary,
  },
  editBadgeNew: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.dark,
  },
  editBadgeIconNew: {
    fontSize: 10,
    color: "#0a0a0c",
  },
  headerInfoCol: {
    flex: 1,
    marginLeft: 14,
    justifyContent: "center",
  },
  profileNameNew: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  customizeCompanionBtnNew: {
    marginTop: 6,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#333",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    alignSelf: "flex-start",
  },
  customizeCompanionTextNew: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: "700",
  },
  settingsGearBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.darkCard,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.darkBorder,
  },
  settingsGearIcon: {
    fontSize: 18,
  },

  // Sub Tab Bar Styles
  subTabBarContainer: {
    flexDirection: "row",
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    padding: 4,
    marginVertical: 14,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    width: "100%",
  },
  subTabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  subTabItemActive: {
    backgroundColor: "#2a2a2a",
  },
  subTabText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  subTabTextActive: {
    color: Colors.text,
    fontWeight: "700",
  },

  // Evolution Level Card
  levelCardNew: {
    backgroundColor: Colors.darkCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    padding: 16,
    marginBottom: 16,
    width: "100%",
  },
  levelHeaderNew: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 10,
  },
  levelLabelNew: {
    color: Colors.textSecondary,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
  levelValueNew: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 2,
  },
  xpTextNew: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  progressBarBgNew: {
    height: 8,
    backgroundColor: Colors.dark,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 10,
    width: "100%",
  },
  progressBarFillNew: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  xpTipTextNew: {
    color: Colors.textSecondary,
    fontSize: 10.5,
    lineHeight: 14,
    marginBottom: 16,
  },

  // IA Narrative Section inside level card
  iaNarrativeSectionNew: {
    borderTopWidth: 1,
    borderTopColor: Colors.darkBorder,
    paddingTop: 14,
  },
  iaNarrativeHeaderNew: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  iaNarrativeTitleNew: {
    color: Colors.text,
    fontSize: 13.5,
    fontWeight: "700",
  },
  iaNarrativeUpdateBtnNew: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#1c1c24",
    borderWidth: 1,
    borderColor: Colors.darkBorder,
  },
  iaNarrativeUpdateBtnTextNew: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: "600",
  },
  iaNarrativeBoxNew: {
    backgroundColor: Colors.dark,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
  },
  iaNarrativeTextNew: {
    color: Colors.text,
    fontSize: 12,
    lineHeight: 17,
  },
  iaNarrativeTimeNew: {
    color: Colors.textSecondary,
    fontSize: 9.5,
    marginTop: 8,
    textAlign: "right",
    opacity: 0.6,
  },
  iaNarrativeEmptyNew: {
    alignItems: "center",
    padding: 14,
    backgroundColor: Colors.dark,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
  },
  iaNarrativeEmptyTextNew: {
    color: Colors.textSecondary,
    fontSize: 11,
    textAlign: "center",
    marginBottom: 10,
  },
  iaNarrativeGenBtnNew: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  iaNarrativeGenBtnTextNew: {
    color: "#0a0a0c",
    fontSize: 12,
    fontWeight: "700",
  },

  // Annual Volume Chart Styles
  annualChartCardNew: {
    backgroundColor: Colors.darkCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    padding: 16,
    marginBottom: 20,
    width: "100%",
  },
  annualChartTitleNew: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  annualChartSubtitleNew: {
    color: Colors.textSecondary,
    fontSize: 11.5,
    marginTop: 2,
  },
  chartCardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  chartHeaderValContainer: {
    alignItems: "flex-end",
  },
  chartHeaderValSub: {
    color: Colors.textSecondary,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  chartHeaderValMain: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 2,
  },
  chartContainerNew: {
    flexDirection: "row",
    height: 140,
    alignItems: "flex-end",
    justifyContent: "space-between",
    position: "relative",
    paddingTop: 15,
    width: "100%",
  },
  averageLineNew: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 1,
  },
  averageLineDashedNew: {
    borderTopWidth: 1,
    borderTopColor: Colors.primary,
    borderStyle: "dashed",
    opacity: 0.45,
    width: "100%",
  },
  averageLineLabelNew: {
    color: Colors.primary,
    fontSize: 9,
    fontWeight: "700",
    position: "absolute",
    right: 0,
    top: -12,
    backgroundColor: Colors.darkCard,
    paddingHorizontal: 4,
  },
  chartColumnWrapperNew: {
    flex: 1,
    alignItems: "center",
    height: "100%",
    justifyContent: "flex-end",
  },
  chartBarValNew: {
    color: Colors.text,
    fontSize: 8,
    fontWeight: "600",
    marginBottom: 4,
  },
  chartBarTrackNew: {
    width: 10,
    height: "75%",
    backgroundColor: Colors.dark,
    borderRadius: 5,
    overflow: "hidden",
  },
  chartBarFillNew: {
    width: "100%",
    backgroundColor: "#3a3a44",
    borderRadius: 5,
  },
  chartBarFillActiveNew: {
    backgroundColor: Colors.primary,
  },
  chartBarLabelNew: {
    color: Colors.textSecondary,
    fontSize: 9,
    marginTop: 6,
    fontWeight: "500",
  },
  chartBarLabelActiveNew: {
    color: Colors.text,
    fontWeight: "700",
  },

  // Trophy Shelf Styles
  trophyShelfNew: {
    backgroundColor: Colors.darkCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    padding: 16,
    marginBottom: 16,
    width: "100%",
  },
  trophyShelfTitleNew: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  trophyShelfSubtitleNew: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    marginBottom: 16,
  },
  trophyGridNew: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 16,
  },
  trophyPinNew: {
    width: "30%",
    alignItems: "center",
  },
  trophyPinUnlockedNew: {
    opacity: 1,
  },
  trophyPinLockedNew: {
    opacity: 0.65,
  },
  trophyHexagonNew: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  trophyHexagonUnlockedNew: {
    backgroundColor: "#2a2200",
    borderWidth: 2,
    borderColor: Colors.gold,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  trophyHexagonLockedNew: {
    backgroundColor: "#111",
    borderWidth: 1.5,
    borderColor: "#333",
  },
  trophyEmojiNew: {
    fontSize: 26,
  },
  trophyTitleNew: {
    color: Colors.text,
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },
  trophyUnlockedLabelNew: {
    color: Colors.gold,
    fontSize: 8,
    fontWeight: "700",
    marginTop: 2,
  },
  trophyMiniProgressRowNew: {
    width: "80%",
    alignItems: "center",
    marginTop: 4,
  },
  trophyProgressBarBgNew: {
    height: 3,
    backgroundColor: Colors.dark,
    borderRadius: 1.5,
    width: "100%",
    overflow: "hidden",
  },
  trophyProgressBarFillNew: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 1.5,
  },
  trophyProgressTextNew: {
    color: Colors.textSecondary,
    fontSize: 7.5,
    marginTop: 1,
  },

  // Settings Cog Modal Styles
  settingsModalContainer: {
    backgroundColor: Colors.darkCard,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    padding: 20,
    width: "90%",
  },
  settingsModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.darkBorder,
  },
  settingsModalTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  settingsModalCloseBtn: {
    color: Colors.textSecondary,
    fontSize: 18,
    fontWeight: "600",
    padding: 4,
  },
  settingsSection: {
    marginBottom: 16,
  },
  settingsSectionTitle: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 10,
  },
  settingsInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#222",
  },
  settingsInfoLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    width: 65,
  },
  settingsInfoVal: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  settingsOptionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    padding: 12,
    marginVertical: 4,
    gap: 12,
  },
  settingsOptionIcon: {
    fontSize: 18,
  },
  settingsOptionText: {
    color: Colors.text,
    fontSize: 13.5,
    fontWeight: "600",
  },
  settingsStravaStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#161616",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    padding: 12,
  },
  settingsStravaText: {
    color: Colors.text,
    fontSize: 12.5,
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
  },
  settingsStravaBtnMini: {
    backgroundColor: "#2c1c1c",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ff6b6b33",
  },
  settingsStravaBtnMiniText: {
    color: "#ff6b6b",
    fontSize: 10,
    fontWeight: "700",
  },
  settingsStravaBtnConnect: {
    backgroundColor: "#fc4c02",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  settingsStravaBtnConnectText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  settingsActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 12,
  },
  settingsDiagBtn: {
    flex: 1,
    backgroundColor: "#2c2c35",
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  settingsDiagBtnText: {
    color: Colors.text,
    fontSize: 13.5,
    fontWeight: "600",
  },
  settingsLogoutBtn: {
    flex: 1,
    backgroundColor: "#2c1c1c",
    borderWidth: 1,
    borderColor: "#ff6b6b33",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  settingsLogoutBtnText: {
    color: "#ff6b6b",
    fontSize: 13.5,
    fontWeight: "700",
  },

  // Strava Personal Best Marks Styles
  stravaBestsCard: {
    backgroundColor: Colors.darkCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    padding: 16,
    marginBottom: 16,
    width: "100%",
  },
  stravaBestsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  stravaBestsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stravaBestsLogo: {
    color: "#fc4c02",
    fontSize: 16,
    marginRight: 8,
  },
  stravaBestsTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  stravaBestsChevron: {
    color: Colors.textSecondary,
    fontSize: 18,
    opacity: 0.6,
  },
  stravaBestsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  stravaBestsCol: {
    width: "31%",
    alignItems: "center",
    marginBottom: 16,
  },
  stravaBestsLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 6,
    marginBottom: 4,
  },
  stravaBestsTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  stravaBestsTimeIcon: {
    fontSize: 12,
    marginRight: 3,
  },
  stravaBestsTimeVal: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  stravaBestsSub: {
    color: "#666666",
    fontSize: 8.5,
    fontWeight: "500",
    marginTop: 3,
  },
});
