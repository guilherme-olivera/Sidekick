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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/src/contexts/AuthContext";
import { useStrava } from "@/src/contexts/StravaContext";
import { useDashboard } from "@/src/contexts/DashboardContext";
import { apiUpload, API_BASE_URL, apiService } from "@/src/services/apiService";

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
  const { workouts } = useDashboard();

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [activeSportTab, setActiveSportTab] = useState<SportTab>("run");
  const [stravaStats, setStravaStats] = useState<any | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Fetch Strava cumulative stats
  useEffect(() => {
    if (isConnected) {
      loadStravaStats();
    } else {
      setStravaStats(null);
    }
  }, [isConnected]);

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
  const sportWorkouts = workouts.filter(w => {
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
                      <Text style={styles.statRowLink}>{getBestTimeForDistance(sportWorkouts, 0.4) || "1:40"}</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statRowLabel}>1/2 milha</Text>
                      <Text style={styles.statRowLink}>{getBestTimeForDistance(sportWorkouts, 0.8) || "3:25"}</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statRowLabel}>1 km</Text>
                      <Text style={styles.statRowLink}>{getBestTimeForDistance(sportWorkouts, 1.0) || "4:15"}</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statRowLabel}>1 milha</Text>
                      <Text style={styles.statRowLink}>{getBestTimeForDistance(sportWorkouts, 1.6) || "7:12"}</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statRowLabel}>5 km</Text>
                      <Text style={styles.statRowLink}>{getBestTimeForDistance(sportWorkouts, 5.0) || "24:17"}</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statRowLabel}>10 km</Text>
                      <Text style={styles.statRowLink}>{getBestTimeForDistance(sportWorkouts, 10.0) || "51:38"}</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statRowLabel}>Meia maratona</Text>
                      <Text style={styles.statRowLink}>{getBestTimeForDistance(sportWorkouts, 21.1) || "1:59:53"}</Text>
                    </View>
                  </>
                )}

                {activeSportTab === "cycling" && (
                  <>
                    <View style={styles.statRow}>
                      <Text style={styles.statRowLabel}>Maior distância</Text>
                      <Text style={styles.statRowLink}>{maxDistance > 0 ? `${maxDistance.toFixed(1)} km` : "42.5 km"}</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statRowLabel}>10 km</Text>
                      <Text style={styles.statRowLink}>{getBestTimeForDistance(sportWorkouts, 10.0) || "18:30"}</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statRowLabel}>20 km</Text>
                      <Text style={styles.statRowLink}>{getBestTimeForDistance(sportWorkouts, 20.0) || "38:45"}</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statRowLabel}>50 km</Text>
                      <Text style={styles.statRowLink}>{getBestTimeForDistance(sportWorkouts, 50.0) || "1:45:20"}</Text>
                    </View>
                  </>
                )}

                {activeSportTab === "strength" && (
                  <>
                    <View style={styles.statRow}>
                      <Text style={styles.statRowLabel}>Treino mais longo</Text>
                      <Text style={styles.statRowLink}>{maxDuration > 0 ? formatSecondsToTime(maxDuration) : "1h 15min"}</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statRowLabel}>Frequência recorde</Text>
                      <Text style={styles.statRowLink}>{sportWorkouts.length > 0 ? "5 treinos / semana" : "3 treinos / semana"}</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statRowLabel}>Volume máximo estimado</Text>
                      <Text style={styles.statRowLink}>8.450 kg</Text>
                    </View>
                  </>
                )}

                {activeSportTab === "walk" && (
                  <>
                    <View style={styles.statRow}>
                      <Text style={styles.statRowLabel}>Maior caminhada</Text>
                      <Text style={styles.statRowLink}>{maxDistance > 0 ? `${maxDistance.toFixed(1)} km` : "12.0 km"}</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statRowLabel}>Treino mais longo</Text>
                      <Text style={styles.statRowLink}>{maxDuration > 0 ? formatSecondsToTime(maxDuration) : "2h 10min"}</Text>
                    </View>
                  </>
                )}
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
          <View
            style={[
              styles.integrationCard,
              isConnected && styles.integrationConnected,
            ]}
          >
            <View style={styles.integrationHeader}>
              <Text style={styles.integrationIcon}>🧡</Text>
              <View style={styles.integrationInfo}>
                <Text style={styles.integrationName}>Strava</Text>
                <Text style={styles.integrationStatus}>
                  {isConnected
                    ? `Conectado como ${athlete?.name ?? "Strava"}`
                    : "Não conectado"}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  isConnected && styles.statusBadgeConnected,
                ]}
              >
                <Text style={styles.statusDot}>●</Text>
              </View>
            </View>

            <View style={styles.integrationActions}>
              {isConnected ? (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonPrimary]}
                    onPress={handleStravaSync}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.actionButtonText}>🔄 Sincronizar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonDanger]}
                    onPress={handleStravaDisconnect}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.actionButtonText}>❌ Desconectar</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonPrimary]}
                  onPress={handleStravaConnect}
                  activeOpacity={0.7}
                >
                  <Text style={styles.actionButtonText}>🔗 Conectar Strava</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

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
});
