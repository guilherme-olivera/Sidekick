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

  // Weekly running distance
  const currentWeekDistance = workouts.filter(w => {
    const d = new Date(w.date);
    const today = new Date();
    const offset = today.getDay() === 0 ? -6 : 1 - today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() + offset);
    monday.setHours(0,0,0,0);
    return d >= monday && w.type === "run";
  }).reduce((sum, w) => sum + (w.distance || 0), 0);

  // Weekly workouts count
  const currentWeekWorkoutsCount = workouts.filter(w => {
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
  const challenge3Complete = workouts.some(w => w.sufferScore && w.sufferScore >= 100);

  let challengeXp = 0;
  if (challenge1Complete) challengeXp += 200;
  if (challenge2Complete) challengeXp += 150;
  if (challenge3Complete) challengeXp += 150;

  // Simple leveling formula: 150 XP per workout + bonus + challenges XP
  const totalXp = totalWorkouts * 150 + (hasStrava ? 200 : 0) + (user?.profile?.companionName ? 100 : 0) + challengeXp;
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

        {/* Weekly Challenges Section */}
        <Text style={styles.sectionTitle}>🎯 Desafios da Semana</Text>
        <Text style={styles.sectionSubtitle}>Complete as metas da semana para ganhar bônus de XP!</Text>

        <View style={styles.challengesContainer}>
          {/* Challenge 1 */}
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
                {currentWeekDistance.toFixed(2)} / 15.00 km
              </Text>
            </View>
            {challenge1Complete && (
              <View style={styles.challengeBadge}>
                <Text style={styles.challengeBadgeText}>COMPLETO ✅</Text>
              </View>
            )}
          </View>

          {/* Challenge 2 */}
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

          {/* Challenge 3 */}
          <View style={[styles.challengeCard, challenge3Complete && styles.challengeCardComplete]}>
            <View style={styles.challengeHeader}>
              <Text style={styles.challengeIcon}>❤️‍🔥</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.challengeTitle}>Esforço Máximo</Text>
                <Text style={styles.challengeDesc}>Bater 100+ de esforço relativo em algum treino.</Text>
              </View>
              <Text style={styles.challengeXpReward}>+150 XP</Text>
            </View>
            <View style={styles.challengeProgressRow}>
              <View style={styles.challengeProgressBarBg}>
                <View style={[styles.challengeProgressBarFill, { width: challenge3Complete ? "100%" : "0%" }]} />
              </View>
              <Text style={styles.challengeProgressText}>
                {challenge3Complete ? "1 / 1" : "0 / 1"} treinos
              </Text>
            </View>
            {challenge3Complete && (
              <View style={styles.challengeBadge}>
                <Text style={styles.challengeBadgeText}>COMPLETO ✅</Text>
              </View>
            )}
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
  sectionSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: -12,
    marginBottom: 16,
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
    padding: 14,
    position: "relative",
    overflow: "hidden",
  },
  challengeCardComplete: {
    borderColor: "#51cf6666",
  },
  challengeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
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
    lineHeight: 14,
  },
  challengeXpReward: {
    color: Colors.gold,
    fontSize: 12,
    fontWeight: "800",
    backgroundColor: "#2a2200",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  challengeProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: "700",
    width: 75,
    textAlign: "right",
  },
  challengeBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: Colors.success,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderBottomLeftRadius: 8,
  },
  challengeBadgeText: {
    color: "#0a0a0a",
    fontSize: 8,
    fontWeight: "900",
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
