import React, { useState, useEffect, useRef } from "react";
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Dimensions,
  Alert,
} from "react-native";
import Svg, { Defs, LinearGradient, Stop, Circle, Path, G, Rect } from "react-native-svg";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import ViewShot, { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { useAuth } from "@/src/contexts/AuthContext";
import { useDashboard } from "@/src/contexts/DashboardContext";
import { apiService } from "@/src/services/apiService";

const Colors = {
  dark: "#0a0a0a",
  darkCard: "#1a1a1a",
  darkBorder: "#333333",
  text: "#ffffff",
  textSecondary: "#b0b0b0",
  primary: "#ff6b6b",
  success: "#51cf66",
  gold: "#ffd700",
  silver: "#e0e0e0",
  bronze: "#cd7f32",
};

const SCREEN_WIDTH = Dimensions.get("window").width;

interface Badge {
  id: string;
  title: string;
  description: string;
  emoji: string;
  unlocked: boolean;
  unlockedAt?: string;
}

interface PRRecord {
  distance: string; // "1k" | "5k" | "10k" | "21k" | "42k"
  rank: number; // 1 = Gold, 2 = Silver, 3 = Bronze
  time: number;
  workoutId: string;
  workoutTitle: string;
  date: string;
}

const MILESTONES = [
  { id: "1k", label: "1 km" },
  { id: "5k", label: "5 km" },
  { id: "10k", label: "10 km" },
  { id: "21k", label: "21.1 km (Meia)" },
  { id: "42k", label: "42.2 km (Maratona)" },
];

const milestoneLabels: Record<string, string> = {
  "1k": "1 km",
  "5k": "5 km",
  "10k": "10 km",
  "21k": "Meia Maratona",
  "42k": "Maratona",
};

// Formats seconds into mm:ss or hh:mm:ss
const formatDuration = (seconds: number) => {
  if (isNaN(seconds) || seconds <= 0) return "00:00";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const pad = (num: number) => String(num).padStart(2, "0");

  if (hrs > 0) {
    return `${hrs}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
};

// Premium SVG Medal Component
function PremiumMedal({ rank, size = 64 }: { rank: number; size?: number }) {
  const colors = {
    1: { main: "#ffb703", light: "#ffd700", dark: "#fb8500", glow: "rgba(255, 183, 3, 0.4)", label: "OURO" },
    2: { main: "#e0e0e0", light: "#ffffff", dark: "#9e9e9e", glow: "rgba(224, 224, 224, 0.3)", label: "PRATA" },
    3: { main: "#cd7f32", light: "#ffa07a", dark: "#8b5a2b", glow: "rgba(205, 127, 50, 0.3)", label: "BRONZE" },
  }[rank as 1 | 2 | 3] || { main: "#ffb703", light: "#ffd700", dark: "#fb8500", glow: "rgba(255, 183, 3, 0.4)", label: "OURO" };

  return (
    <View style={{ width: size, height: size * 1.3, alignItems: "center" }}>
      <Svg width={size} height={size * 1.3} viewBox="0 0 100 130">
        <Defs>
          <LinearGradient id={`grad-${rank}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colors.light} />
            <Stop offset="50%" stopColor={colors.main} />
            <Stop offset="100%" stopColor={colors.dark} />
          </LinearGradient>
          <LinearGradient id="ribbonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#ff4b4b" />
            <Stop offset="50%" stopColor="#ff6b6b" />
            <Stop offset="100%" stopColor="#c92a2a" />
          </LinearGradient>
        </Defs>

        {/* Ribbons crossing */}
        <Path d="M 25,20 L 50,75 L 40,75 L 15,20 Z" fill="url(#ribbonGrad)" />
        <Path d="M 75,20 L 50,75 L 60,75 L 85,20 Z" fill="url(#ribbonGrad)" opacity={0.8} />

        {/* Ribbon Stripes */}
        <Path d="M 20,20 L 45,75" stroke="#ffffff" strokeWidth="2" opacity={0.3} />
        <Path d="M 80,20 L 55,75" stroke="#ffffff" strokeWidth="2" opacity={0.3} />

        {/* Neon Glow Outer Ring */}
        <Circle cx="50" cy="80" r="32" fill="transparent" stroke={colors.glow} strokeWidth="6" />

        {/* Medal Body */}
        <Circle cx="50" cy="80" r="28" fill={`url(#grad-${rank})`} stroke={colors.dark} strokeWidth="2" />
        <Circle cx="50" cy="80" r="23" fill="transparent" stroke={colors.light} strokeWidth="1" opacity={0.5} />

        {/* Star for Rank 1 */}
        {rank === 1 && (
          <Path d="M 50,70 L 52.5,75 L 58,75.5 L 54,79 L 55.5,84.5 L 50,81.5 L 44.5,84.5 L 46,79 L 42,75.5 L 47.5,75 Z" fill="#ffffff" opacity={0.9} />
        )}
        
        {/* Inner shadow */}
        <Circle cx="50" cy="80" r="16" fill="rgba(0, 0, 0, 0.12)" />
      </Svg>
      
      {/* Rank Emojis */}
      <View style={styles.medalLabelOverlay}>
        <Text style={styles.medalEmojiText}>
          {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
        </Text>
      </View>
    </View>
  );
}

export default function AchievementsScreen() {
  const { user } = useAuth();
  const { workouts } = useDashboard();

  // State Hooks
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<PRRecord[]>([]);
  const [monthlyChallenge, setMonthlyChallenge] = useState<{ distance: number; target: number; completed: boolean } | null>(null);
  const [isPrSectionExpanded, setIsPrSectionExpanded] = useState(true);
  
  // Share Stories Modal States
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedRecordForShare, setSelectedRecordForShare] = useState<PRRecord | null>(null);
  const viewShotRef = useRef<any>(null);

  const [trophyModalVisible, setTrophyModalVisible] = useState(false);
  const [selectedTrophyForShare, setSelectedTrophyForShare] = useState<Badge | null>(null);
  const trophyViewShotRef = useRef<any>(null);

  const handleShareTrophyImage = async () => {
    try {
      if (!trophyViewShotRef.current) {
        Alert.alert("Erro", "Não foi possível capturar a imagem da conquista.");
        return;
      }
      const uri = await captureRef(trophyViewShotRef, {
        format: "png",
        quality: 0.95,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: "Compartilhar Conquista - Sidekick",
        });
      } else {
        Alert.alert("Sucesso", "Imagem da conquista gerada com sucesso!");
      }
    } catch (err) {
      console.error("Failed to share trophy card image:", err);
      Alert.alert("Erro", "Não foi possível gerar a imagem da conquista.");
    }
  };

  const handleShareCardImage = async () => {
    try {
      if (!viewShotRef.current) {
        Alert.alert("Erro", "Não foi possível capturar a imagem. Tente novamente.");
        return;
      }
      const uri = await captureRef(viewShotRef, {
        format: "png",
        quality: 0.9,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: "Compartilhar Conquista Sidekick",
        });
      } else {
        Alert.alert("Sucesso", "Imagem do card gerada com sucesso!");
      }
    } catch (err) {
      console.error("Failed to share PR card image:", err);
      Alert.alert("Erro", "Não foi possível gerar ou compartilhar o card.");
    }
  };

  const totalWorkouts = workouts.length;
  const companionName = user?.profile?.companionName || "Rocky";
  const hasStrava = !!user?.stravaAthleteName;

  // Weekly stats
  const currentWeekDistance = workouts.filter(w => {
    const d = new Date(w.date);
    const today = new Date();
    const offset = today.getDay() === 0 ? -6 : 1 - today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() + offset);
    monday.setHours(0, 0, 0, 0);
    return d >= monday && w.type === "run";
  }).reduce((sum, w) => sum + (w.distance || 0), 0);

  const currentWeekWorkoutsCount = workouts.filter(w => {
    const d = new Date(w.date);
    const today = new Date();
    const offset = today.getDay() === 0 ? -6 : 1 - today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() + offset);
    monday.setHours(0, 0, 0, 0);
    return d >= monday;
  }).length;

  const challenge1Complete = currentWeekDistance >= 15;
  const challenge2Complete = currentWeekWorkoutsCount >= 3;
  const challenge3Complete = workouts.some(w => w.sufferScore && w.sufferScore >= 100);

  let challengeXp = 0;
  if (challenge1Complete) challengeXp += 200;
  if (challenge2Complete) challengeXp += 150;
  if (challenge3Complete) challengeXp += 150;

  // Monthly challenge check (Correr 50 km no mês)
  const monthlyCompleted = monthlyChallenge?.completed || false;
  const monthlyDistance = monthlyChallenge?.distance || 0;
  const monthlyTarget = monthlyChallenge?.target || 50;
  if (monthlyCompleted) challengeXp += 300;

  // XP progression calculation
  const totalXp = totalWorkouts * 150 + (hasStrava ? 200 : 0) + (user?.profile?.companionName ? 100 : 0) + challengeXp;
  const xpPerLevel = 500;
  const currentLevel = Math.max(1, Math.floor(totalXp / xpPerLevel) + 1);
  const currentXpInLevel = totalXp % xpPerLevel;
  const xpProgressPct = (currentXpInLevel / xpPerLevel) * 100;

  const fetchAchievements = async () => {
    try {
      setLoading(true);
      const res = await apiService.get("/user/achievements");
      if (res && res.success) {
        setRecords(res.records || []);
        setMonthlyChallenge(res.monthlyChallenge || null);
      }
    } catch (err) {
      console.error("Error loading achievements:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAchievements();
  }, [workouts]);

  const handleOpenShareModal = (record: PRRecord) => {
    setSelectedRecordForShare(record);
    setShareModalVisible(true);
  };

  // Hardcoded gamified badges list
  const BADGES: Badge[] = [
    {
      id: "partner",
      title: "Parceria Fechada",
      description: `Deu um nome ao seu companheiro digital (${companionName}).`,
      emoji: "🦖",
      unlocked: !!user?.profile?.companionName,
      unlockedAt: "Liberado",
    },
    {
      id: "strava",
      title: "Dev do Asfalto",
      description: "Conectou sua conta do Strava com o Sidekick.",
      emoji: "🔌",
      unlocked: hasStrava,
      unlockedAt: hasStrava ? "Liberado" : undefined,
    },
    {
      id: "first_workout",
      title: "Primeiro Passo",
      description: "Concluiu e sincronizou sua primeira atividade física.",
      emoji: "🥉",
      unlocked: totalWorkouts >= 1,
      unlockedAt: totalWorkouts >= 1 ? "Liberado" : undefined,
    },
    {
      id: "consistency_3",
      title: "Consistente",
      description: "Alcançou um histórico de 3 treinos concluídos.",
      emoji: "🥈",
      unlocked: totalWorkouts >= 3,
      unlockedAt: totalWorkouts >= 3 ? "Liberado" : undefined,
    },
    {
      id: "runner_10k",
      title: "Destruidor de 10K",
      description: "Correu uma distância maior ou igual a 10km.",
      emoji: "🏃‍♂️",
      unlocked: workouts.some(w => w.type === "run" && (w.distance || 0) >= 10),
      unlockedAt: workouts.some(w => w.type === "run" && (w.distance || 0) >= 10) ? "Liberado" : undefined,
    },
    {
      id: "early_bird",
      title: "Madrugador",
      description: "Realizou um treino antes das 7:00 da manhã.",
      emoji: "🌅",
      unlocked: workouts.some(w => {
        const h = new Date(w.date).getHours();
        return h < 7;
      }),
      unlockedAt: workouts.some(w => {
        const h = new Date(w.date).getHours();
        return h < 7;
      }) ? "Liberado" : undefined,
    },
    {
      id: "beast_mode",
      title: "Sem Limites",
      description: "Registrou um treino com intensidade máxima (RPE 5).",
      emoji: "💀",
      unlocked: workouts.some(w => w.effortRating === 5),
      unlockedAt: workouts.some(w => w.effortRating === 5) ? "Liberado" : undefined,
    },
    {
      id: "cyclist_30k",
      title: "Rolê Lendário",
      description: "Pedalou mais de 30km em uma única atividade.",
      emoji: "🚴",
      unlocked: workouts.some(w => w.type === "cycling" && (w.distance || 0) >= 30),
      unlockedAt: workouts.some(w => w.type === "cycling" && (w.distance || 0) >= 30) ? "Liberado" : undefined,
    },
  ];

  const unlockedCount = BADGES.filter(b => b.unlocked).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏆 Conquistas & Nível</Text>
        <Text style={styles.headerSubtitle}>Sua jornada de evolução física e consistência</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Level Progression Card */}
        <View style={styles.levelCard}>
          <View style={styles.levelHeader}>
            <View>
              <Text style={styles.levelLabel}>NÍVEL ATUAL</Text>
              <Text style={styles.levelValue}>Atleta Lvl {currentLevel}</Text>
            </View>
            <Text style={styles.xpText}>{currentXpInLevel} / {xpPerLevel} XP</Text>
          </View>

          {/* Level Progress Bar */}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${xpProgressPct}%` }]} />
          </View>

          <Text style={styles.levelDesc}>
            Você ganha 150 XP por treino registrado e XP extra por marcos alcançados!
          </Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>👟</Text>
            <Text style={styles.statValueText}>{totalWorkouts}</Text>
            <Text style={styles.statLabelText}>Treinos Totais</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>🎖️</Text>
            <Text style={styles.statValueText}>{unlockedCount}</Text>
            <Text style={styles.statLabelText}>Medalhas</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>🔥</Text>
            <Text style={styles.statValueText}>{totalWorkouts > 0 ? "5 dias" : "0 dias"}</Text>
            <Text style={styles.statLabelText}>Streak Ativo</Text>
          </View>
        </View>

        {/* Active Challenges Section */}
        <Text style={styles.sectionTitle}>🎯 Metas e Desafios Ativos</Text>
        <Text style={styles.sectionSubtitle}>Complete os desafios do app e ganhe bônus extras de XP!</Text>

        <View style={styles.challengesContainer}>
          {/* Monthly Challenge (50 km) */}
          <View style={[styles.challengeCard, monthlyCompleted && styles.challengeCardComplete]}>
            <View style={styles.challengeHeader}>
              <Text style={styles.challengeIcon}>📅</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.challengeTitle}>Desafio Mensal: Foco 50 km</Text>
                <Text style={styles.challengeDesc}>Acumular 50.00 km de corrida neste mês corrente.</Text>
              </View>
              <Text style={[styles.challengeXpReward, { color: Colors.gold }]}>+300 XP</Text>
            </View>
            <View style={styles.challengeProgressRow}>
              <View style={styles.challengeProgressBarBg}>
                <View style={[styles.challengeProgressBarFill, { backgroundColor: Colors.gold, width: `${Math.min(100, (monthlyDistance / monthlyTarget) * 100)}%` }]} />
              </View>
              <Text style={styles.challengeProgressText}>
                {monthlyDistance.toFixed(1)} / {monthlyTarget.toFixed(0)} km
              </Text>
            </View>
            {monthlyCompleted && (
              <View style={[styles.challengeBadge, { backgroundColor: "rgba(255, 215, 0, 0.15)" }]}>
                <Text style={[styles.challengeBadgeText, { color: Colors.gold }]}>COMPLETO ✅</Text>
              </View>
            )}
          </View>

          {/* Weekly Challenge 1 */}
          <View style={[styles.challengeCard, challenge1Complete && styles.challengeCardComplete]}>
            <View style={styles.challengeHeader}>
              <Text style={styles.challengeIcon}>🏃‍♂️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.challengeTitle}>Superando Limites</Text>
                <Text style={styles.challengeDesc}>Acumular 15.00 km de corrida nesta semana.</Text>
              </View>
              <Text style={styles.challengeXpReward}>+200 XP</Text>
            </View>
            <View style={styles.challengeProgressRow}>
              <View style={styles.challengeProgressBarBg}>
                <View style={[styles.challengeProgressBarFill, { width: `${Math.min(100, (currentWeekDistance / 15) * 100)}%` }]} />
              </View>
              <Text style={styles.challengeProgressText}>
                {currentWeekDistance.toFixed(1)} / 15.0 km
              </Text>
            </View>
            {challenge1Complete && (
              <View style={styles.challengeBadge}>
                <Text style={styles.challengeBadgeText}>COMPLETO ✅</Text>
              </View>
            )}
          </View>

          {/* Weekly Challenge 2 */}
          <View style={[styles.challengeCard, challenge2Complete && styles.challengeCardComplete]}>
            <View style={styles.challengeHeader}>
              <Text style={styles.challengeIcon}>🗓️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.challengeTitle}>Consistência é Tudo</Text>
                <Text style={styles.challengeDesc}>Realizar pelo menos 3 treinos nesta semana.</Text>
              </View>
              <Text style={styles.challengeXpReward}>+150 XP</Text>
            </View>
            <View style={styles.challengeProgressRow}>
              <View style={styles.challengeProgressBarBg}>
                <View style={[styles.challengeProgressBarFill, { width: `${Math.min(100, (currentWeekWorkoutsCount / 3) * 100)}%` }]} />
              </View>
              <Text style={styles.challengeProgressText}>
                {currentWeekWorkoutsCount} / 3 treinos
              </Text>
            </View>
            {challenge2Complete && (
              <View style={styles.challengeBadge}>
                <Text style={styles.challengeBadgeText}>COMPLETO ✅</Text>
              </View>
            )}
          </View>
        </View>

        {/* PR Interactive Trophy Shelf ("Estante de Troféus") */}
        <TouchableOpacity
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 }}
          onPress={() => setIsPrSectionExpanded(prev => !prev)}
          activeOpacity={0.8}
        >
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.sectionTitle}>🏆 Estante de Troféus (Recordes Pessoais)</Text>
            <Text style={styles.sectionSubtitle}>
              Seus 3 melhores tempos em distâncias clássicas. Toque para ver ou publicar no Stories!
            </Text>
          </View>
          <View style={{ backgroundColor: '#222', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#444' }}>
            <Text style={{ color: Colors.primary, fontSize: 11, fontWeight: '700' }}>
              {isPrSectionExpanded ? "Recolher 🔼" : "Ver marcas 🔽"}
            </Text>
          </View>
        </TouchableOpacity>

        {isPrSectionExpanded && (
          <>
            {loading ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.loaderText}>Carregando recordes pessoais...</Text>
              </View>
            ) : (
              <View style={styles.shelfContainer}>
                {MILESTONES.map(milestone => {
                  return (
                    <View key={milestone.id} style={styles.shelfRow}>
                      <View style={styles.shelfRowHeader}>
                        <Text style={styles.shelfRowTitle}>🏃‍♂️ Recorde de {milestoneLabels[milestone.id]}</Text>
                      </View>

                      <View style={styles.shelfMedalsRow}>
                        {[1, 2, 3].map(rank => {
                          const record = records.find(r => r.distance === milestone.id && r.rank === rank);
                          
                          if (record) {
                            return (
                              <TouchableOpacity
                                key={rank}
                                style={styles.medalSlotActive}
                                onPress={() => handleOpenShareModal(record)}
                                activeOpacity={0.8}
                              >
                                <PremiumMedal rank={rank} size={56} />
                                <Text style={styles.medalSlotTime}>{formatDuration(record.time)}</Text>
                                <Text style={styles.medalSlotDate} numberOfLines={1}>{new Date(record.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</Text>
                              </TouchableOpacity>
                            );
                          } else {
                            // Empty/Locked Slot
                            return (
                              <View key={rank} style={styles.medalSlotLocked}>
                                <View style={styles.medalLockCircle}>
                                  <Text style={styles.medalLockIcon}>🔒</Text>
                                </View>
                                <Text style={styles.medalSlotTimeLocked}>--:--</Text>
                                <Text style={styles.medalSlotLabelLocked}>
                                  {rank === 1 ? "Ouro" : rank === 2 ? "Prata" : "Bronze"}
                                </Text>
                              </View>
                            );
                          }
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}

        {/* Badges List Section */}
        <Text style={styles.sectionTitle}>Medalhas de Conquista</Text>

        <View style={styles.badgesGrid}>
          {BADGES.map(badge => (
            <TouchableOpacity
              key={badge.id}
              style={[styles.badgeCard, !badge.unlocked && styles.badgeCardLocked]}
              onPress={() => {
                if (badge.unlocked) {
                  setSelectedTrophyForShare(badge);
                  setTrophyModalVisible(true);
                } else {
                  Alert.alert("Medalha Bloqueada 🔒", `${badge.description}\n\nContinue treinando no Sidekick para conquistar esta medalha!`);
                }
              }}
              activeOpacity={badge.unlocked ? 0.7 : 1}
            >
              <View style={[styles.badgeEmojiWrapper, !badge.unlocked && styles.badgeEmojiWrapperLocked]}>
                <Text style={[styles.badgeEmoji, !badge.unlocked && styles.badgeEmojiLocked]}>
                  {badge.unlocked ? badge.emoji : "🔒"}
                </Text>
              </View>
              <View style={styles.badgeInfo}>
                <Text style={[styles.badgeTitle, !badge.unlocked && styles.badgeTitleLocked]}>
                  {badge.title}
                </Text>
                <Text style={styles.badgeDesc}>{badge.description}</Text>
                {badge.unlocked && (
                  <Text style={styles.badgeStatus}>✅ Desbloqueada (Compartilhar 📤)</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Trophy Stories Share Modal */}
      <Modal
        visible={trophyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setTrophyModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center" }}>
          <View style={{ width: "90%", backgroundColor: "#141416", borderRadius: 20, padding: 20, alignItems: "center", maxHeight: "85%" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%", alignItems: "center", marginBottom: 15 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#fff" }}>Compartilhar Conquista 🏆</Text>
              <TouchableOpacity onPress={() => setTrophyModalVisible(false)} style={{ padding: 5 }}>
                <Text style={{ color: "#aaa", fontSize: 18 }}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedTrophyForShare && (
              <ViewShot ref={trophyViewShotRef} options={{ format: "png", quality: 0.95 }} style={{ width: 280, backgroundColor: "#0a0a0c", borderRadius: 24, padding: 24, alignItems: "center", borderWidth: 2, borderColor: "#ffd700", marginVertical: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <Text style={{ fontSize: 22 }}>{user?.profile?.companionAvatar || "🦖"}</Text>
                  <View>
                    <Text style={{ color: "#ffd700", fontSize: 10, fontWeight: "900", letterSpacing: 1 }}>SIDEKICK • CONQUISTA</Text>
                    <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>{user?.profile?.companionName || "Rocky"}</Text>
                  </View>
                </View>

                <Text style={{ fontSize: 54, marginVertical: 8 }}>{selectedTrophyForShare.emoji}</Text>

                <View style={{ backgroundColor: "rgba(255, 215, 0, 0.15)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: "#ffd700", marginBottom: 8 }}>
                  <Text style={{ color: "#ffd700", fontSize: 10, fontWeight: "900", letterSpacing: 1 }}>
                    🏆 TROFÉU DESBLOQUEADO
                  </Text>
                </View>

                <Text style={{ color: "#fff", fontSize: 20, fontWeight: "900", textAlign: "center", marginVertical: 4 }}>
                  {selectedTrophyForShare.title}
                </Text>

                <Text style={{ color: "#aaa", fontSize: 12, textAlign: "center", marginVertical: 6, lineHeight: 16 }}>
                  {selectedTrophyForShare.description}
                </Text>

                <Text style={{ color: "#666", fontSize: 11, marginTop: 10 }}>
                  {user?.name || "Atleta Sidekick"}
                </Text>
              </ViewShot>
            )}

            <View style={{ flexDirection: "row", gap: 10, marginTop: 15, width: "100%" }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: "#222", paddingVertical: 12, borderRadius: 12, alignItems: "center" }}
                onPress={() => setTrophyModalVisible(false)}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ flex: 1.5, backgroundColor: "#ffd700", paddingVertical: 12, borderRadius: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 }}
                onPress={handleShareTrophyImage}
              >
                <FontAwesome name="instagram" size={16} color="#000" />
                <Text style={{ color: "#000", fontWeight: "700" }}>Instagram</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sharing Stories Template Modal */}
      {selectedRecordForShare && (
        <Modal
          visible={shareModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShareModalVisible(false)}
        >
          <View style={styles.shareOverlay}>
            <View style={styles.shareContent}>
              <View style={styles.shareHeader}>
                <Text style={styles.shareTitle}>Compartilhar Conquista</Text>
                <TouchableOpacity onPress={() => setShareModalVisible(false)} style={styles.shareCloseBtn}>
                  <Text style={styles.shareCloseBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Stories Card Body Preview */}
              <ViewShot ref={viewShotRef} options={{ format: "png", quality: 0.9 }} style={{ borderRadius: 20, overflow: 'hidden' }}>
                <View style={styles.storiesCard}>
                  {/* Visual Glow Layer */}
                  <View style={styles.storiesGlow} />

                  <Text style={styles.storiesWatermark}>SIDEKICK APP</Text>
                  
                  <View style={styles.storiesMedalContainer}>
                    <PremiumMedal rank={selectedRecordForShare.rank} size={110} />
                  </View>

                  <Text style={styles.storiesRankTitle}>
                    RECORDE DE {selectedRecordForShare.rank === 1 ? "OURO 🥇" : selectedRecordForShare.rank === 2 ? "PRATA 🥈" : "BRONZE 🥉"}
                  </Text>

                  <Text style={styles.storiesDistanceText}>
                    {milestoneLabels[selectedRecordForShare.distance].toUpperCase()}
                  </Text>

                  <View style={styles.storiesTimeBox}>
                    <Text style={styles.storiesTimeLabel}>TEMPO ESTABELECIDO</Text>
                    <Text style={styles.storiesTimeValue}>
                      {formatDuration(selectedRecordForShare.time)}
                    </Text>
                    <Text style={styles.storiesPaceValue}>
                      Pace Médio: {formatDuration(Math.round(selectedRecordForShare.time / (({ "1k": 1, "5k": 5, "10k": 10, "21k": 21.0975, "42k": 42.195 } as Record<string, number>)[selectedRecordForShare.distance] || 1)))}/km
                    </Text>
                  </View>

                  <View style={styles.storiesFooter}>
                    <Text style={styles.storiesWorkoutTitle} numberOfLines={1}>
                      Treino: "{selectedRecordForShare.workoutTitle}"
                    </Text>
                    <Text style={styles.storiesDate}>
                      Conquistado em: {new Date(selectedRecordForShare.date).toLocaleDateString("pt-BR")}
                    </Text>
                  </View>
                  
                  {/* Mascot evolutionary logo watermark */}
                  <View style={styles.storiesMascotLogo}>
                    <Text style={styles.storiesMascotEmoji}>{user?.profile?.companionAvatar || "🦖"}</Text>
                    <Text style={styles.storiesMascotText}>{companionName}</Text>
                  </View>
                </View>
              </ViewShot>

              {/* Share CTA button */}
              <TouchableOpacity
                style={styles.shareCtaButton}
                onPress={handleShareCardImage}
              >
                <Text style={styles.shareCtaButtonText}>
                  <FontAwesome name="instagram" size={18} color="#fff" /> Salvar e Compartilhar Conquista
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.darkBorder,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  headerSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  scrollContainer: {
    padding: 20,
  },
  levelCard: {
    backgroundColor: Colors.darkCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    padding: 18,
    marginBottom: 20,
  },
  levelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  levelLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  levelValue: {
    color: Colors.primary,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 2,
  },
  xpText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  progressBarBg: {
    height: 10,
    backgroundColor: Colors.dark,
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 5,
  },
  levelDesc: {
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  statValueText: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  statLabelText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
    marginTop: 10,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 16,
  },
  challengesContainer: {
    gap: 12,
    marginBottom: 25,
  },
  challengeCard: {
    backgroundColor: Colors.darkCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    padding: 16,
  },
  challengeCardComplete: {
    borderColor: Colors.success + "60",
    backgroundColor: "rgba(81, 207, 102, 0.02)",
  },
  challengeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  challengeIcon: {
    fontSize: 24,
  },
  challengeTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  challengeDesc: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  challengeXpReward: {
    color: Colors.primary,
    fontWeight: "700",
    fontSize: 12,
  },
  challengeProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    gap: 12,
  },
  challengeProgressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.dark,
    borderRadius: 3,
    overflow: "hidden",
  },
  challengeProgressBarFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  challengeProgressText: {
    color: Colors.text,
    fontSize: 11,
    fontWeight: "600",
  },
  challengeBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "rgba(81, 207, 102, 0.15)",
    borderBottomLeftRadius: 8,
    borderTopRightRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  challengeBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: Colors.success,
  },
  shelfContainer: {
    marginBottom: 25,
    gap: 16,
  },
  shelfRow: {
    backgroundColor: Colors.darkCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    padding: 16,
  },
  shelfRowHeader: {
    marginBottom: 14,
  },
  shelfRowTitle: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  shelfMedalsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  medalSlotActive: {
    alignItems: "center",
    width: 80,
  },
  medalSlotLocked: {
    alignItems: "center",
    width: 80,
    opacity: 0.35,
  },
  medalLockCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#222",
    borderWidth: 1,
    borderColor: "#444",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  medalLockIcon: {
    fontSize: 16,
  },
  medalSlotTime: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 6,
  },
  medalSlotTimeLocked: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },
  medalSlotDate: {
    color: Colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  medalSlotLabelLocked: {
    color: Colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  medalWrapper: {
    alignItems: "center",
    position: "relative",
  },
  medalLabelOverlay: {
    position: "absolute",
    bottom: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  medalEmojiText: {
    fontSize: 14,
  },
  loaderContainer: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loaderText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  badgesGrid: {
    gap: 12,
    marginBottom: 40,
  },
  badgeCard: {
    flexDirection: "row",
    backgroundColor: Colors.darkCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    padding: 16,
    alignItems: "center",
    gap: 16,
  },
  badgeCardLocked: {
    opacity: 0.5,
  },
  badgeEmojiWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeEmojiWrapperLocked: {
    backgroundColor: "#222",
  },
  badgeEmoji: {
    fontSize: 26,
  },
  badgeEmojiLocked: {
    fontSize: 18,
  },
  badgeInfo: {
    flex: 1,
  },
  badgeTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  badgeTitleLocked: {
    color: Colors.textSecondary,
  },
  badgeDesc: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  badgeStatus: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 6,
  },
  shareOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  shareContent: {
    width: SCREEN_WIDTH * 0.9,
    backgroundColor: Colors.darkCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    padding: 20,
    alignItems: "center",
  },
  shareHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
  },
  shareTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  shareCloseBtn: {
    padding: 4,
  },
  shareCloseBtnText: {
    color: Colors.textSecondary,
    fontSize: 18,
    fontWeight: "600",
  },
  storiesCard: {
    width: "100%",
    height: 420,
    backgroundColor: "#0d0d0d",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.primary + "30",
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  storiesGlow: {
    position: "absolute",
    top: -150,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: Colors.primary + "12",
    filter: "blur(50px)",
  },
  storiesWatermark: {
    color: "rgba(255, 255, 255, 0.08)",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 24,
  },
  storiesMedalContainer: {
    marginBottom: 20,
  },
  storiesRankTitle: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  storiesDistanceText: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginBottom: 20,
  },
  storiesTimeBox: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 24,
  },
  storiesTimeLabel: {
    color: Colors.textSecondary,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 4,
  },
  storiesTimeValue: {
    color: Colors.gold,
    fontSize: 28,
    fontWeight: "900",
  },
  storiesPaceValue: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: "600",
    marginTop: 4,
  },
  storiesFooter: {
    alignItems: "center",
  },
  storiesWorkoutTitle: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: "700",
    maxWidth: 240,
  },
  storiesDate: {
    color: Colors.textSecondary,
    fontSize: 10,
    marginTop: 4,
  },
  storiesMascotLogo: {
    position: "absolute",
    bottom: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    opacity: 0.7,
  },
  storiesMascotEmoji: {
    fontSize: 18,
  },
  storiesMascotText: {
    color: Colors.text,
    fontSize: 11,
    fontWeight: "700",
  },
  shareCtaButton: {
    backgroundColor: "#e1306c", // Instagram Pink
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 30,
    width: "100%",
    alignItems: "center",
    marginTop: 20,
  },
  shareCtaButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
});
