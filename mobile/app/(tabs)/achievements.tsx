import React from "react";
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useAuth } from "@/src/contexts/AuthContext";
import { useDashboard } from "@/src/contexts/DashboardContext";

const Colors = {
  dark: "#0a0a0a",
  darkCard: "#1a1a1a",
  darkBorder: "#333333",
  text: "#ffffff",
  textSecondary: "#b0b0b0",
  primary: "#ff6b6b",
  success: "#51cf66",
  gold: "#ffd700",
};

interface Badge {
  id: string;
  title: string;
  description: string;
  emoji: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export default function AchievementsScreen() {
  const { user } = useAuth();
  const { workouts } = useDashboard();

  // Basic stats
  const totalWorkouts = workouts.length;
  const companionName = user?.profile?.companionName || "Rocky";
  const hasStrava = !!user?.stravaAthleteName;

  // Simple leveling formula: 150 XP per workout + bonus
  const totalXp = totalWorkouts * 150 + (hasStrava ? 200 : 0) + (user?.profile?.companionName ? 100 : 0);
  const xpPerLevel = 500;
  const currentLevel = Math.max(1, Math.floor(totalXp / xpPerLevel) + 1);
  const currentXpInLevel = totalXp % xpPerLevel;
  const xpProgressPct = (currentXpInLevel / xpPerLevel) * 100;

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

        {/* Badges List Section */}
        <Text style={styles.sectionTitle}>Medalhas de Conquista</Text>

        <View style={styles.badgesGrid}>
          {BADGES.map(badge => (
            <View
              key={badge.id}
              style={[styles.badgeCard, !badge.unlocked && styles.badgeCardLocked]}
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
                  <Text style={styles.badgeStatus}>✅ Desbloqueada</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
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
    marginTop: 2,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
  },
  badgesGrid: {
    gap: 12,
  },
  badgeCard: {
    flexDirection: "row",
    backgroundColor: Colors.darkCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    padding: 12,
    alignItems: "center",
    gap: 14,
  },
  badgeCardLocked: {
    opacity: 0.6,
  },
  badgeEmojiWrapper: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#222",
    borderWidth: 1,
    borderColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeEmojiWrapperLocked: {
    borderColor: "#444",
    backgroundColor: "#111",
  },
  badgeEmoji: {
    fontSize: 26,
  },
  badgeEmojiLocked: {
    fontSize: 20,
    opacity: 0.5,
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
    color: Colors.success,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 4,
  },
});
