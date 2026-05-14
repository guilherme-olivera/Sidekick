import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  SafeAreaView,
  Text,
  TouchableOpacity,
} from "react-native";
import { useDashboard } from "@/src/contexts/DashboardContext";
import { useAuth } from "@/src/contexts/AuthContext";
import { MoodWidget } from "@/components/MoodWidget";
import { WorkoutCard } from "@/components/WorkoutCard";

const Colors = {
  dark: "#0a0a0a",
  darkCard: "#1a1a1a",
  darkBorder: "#333333",
  text: "#ffffff",
  textSecondary: "#b0b0b0",
  primary: "#ff6b6b",
  success: "#51cf66",
};

export default function HomeScreen() {
  const { user } = useAuth();
  const { workouts, currentMoodEmoji, setMood, currentMood, isLoading, analyzeWorkout } = useDashboard();
  const [analyzingWorkoutId, setAnalyzingWorkoutId] = useState<string | null>(null);
  const latestWorkout = workouts[0];

  const handleMoodSelect = (moodId: string, emoji: string) => {
    setMood(moodId, emoji);
  };

  const handleAnalyzeWorkout = async (workoutId: string) => {
    try {
      setAnalyzingWorkoutId(workoutId);
      await analyzeWorkout(workoutId);
    } catch (error) {
      console.error('Error analyzing workout:', error);
      // Aqui poderia mostrar um toast ou alert
    } finally {
      setAnalyzingWorkoutId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Welcome */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Olá, {user?.name}! 👋</Text>
          <Text style={styles.subtitle}>Bem-vindo ao seu Dashboard</Text>
        </View>

        {/* Stats Container */}
        <View style={styles.statsContainer}>
          <StatCard label="Treinos Semana" value={workouts.length.toString()} />
          <StatCard label="Tempo Total" value="8h 30m" />
          <StatCard label="Km Percorridos" value="35.8" />
        </View>

        {/* Latest Workout */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Último Treino</Text>
            <TouchableOpacity>
              <Text style={styles.sectionLink}>Ver mais</Text>
            </TouchableOpacity>
          </View>

          {latestWorkout ? (
            <WorkoutCard
              workout={latestWorkout}
              onAnalyze={() => handleAnalyzeWorkout(latestWorkout.id)}
              isAnalyzing={analyzingWorkoutId === latestWorkout.id}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🏃</Text>
              <Text style={styles.emptyText}>
                Nenhum treino registrado ainda
              </Text>
            </View>
          )}
        </View>

        {/* Quick Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo Semanal</Text>
          <View style={styles.weekSummary}>
            <DayBadge day="Seg" intensity="high" />
            <DayBadge day="Ter" intensity="moderate" />
            <DayBadge day="Qua" intensity="low" />
            <DayBadge day="Qui" intensity="high" />
            <DayBadge day="Sex" intensity="moderate" />
            <DayBadge day="Sab" intensity="high" />
            <DayBadge day="Dom" intensity="rest" />
          </View>
        </View>

        {/* Motivational Message */}
        <View style={styles.motivationalContainer}>
          <Text style={styles.motivationalIcon}>💪</Text>
          <Text style={styles.motivationalText}>
            Você está em uma sequência de 5 dias! Continue assim!
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Mood Widget - Positioned absolute */}
      <MoodWidget
        onMoodSelect={handleMoodSelect}
        currentMood={currentMood}
        currentMoodEmoji={currentMoodEmoji}
      />
    </SafeAreaView>
  );
}

interface StatCardProps {
  label: string;
  value: string;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

interface DayBadgeProps {
  day: string;
  intensity: "low" | "moderate" | "high" | "rest";
}

function DayBadge({ day, intensity }: DayBadgeProps) {
  const getIntensityColor = () => {
    switch (intensity) {
      case "low":
        return { bg: "#1f3a42", text: "#51cf66" };
      case "moderate":
        return { bg: "#422c1f", text: "#ffa94d" };
      case "high":
        return { bg: "#421f1f", text: "#ff6b6b" };
      case "rest":
        return { bg: Colors.darkCard, text: Colors.textSecondary };
      default:
        return { bg: Colors.darkCard, text: Colors.textSecondary };
    }
  };

  const style = getIntensityColor();

  return (
    <View style={[styles.dayBadge, { backgroundColor: style.bg }]}>
      <Text style={[styles.dayBadgeDay, { color: style.text }]}>{day}</Text>
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
    paddingBottom: 16,
  },
  header: {
    marginBottom: 24,
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
    marginBottom: 28,
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
    fontSize: 24,
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
    marginBottom: 28,
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
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
  },
  dayBadge: {
    width: "13%",
    aspectRatio: 1,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  dayBadgeDay: {
    fontSize: 12,
    fontWeight: "600",
  },
  motivationalContainer: {
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.darkBorder,
  },
  motivationalIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  motivationalText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
});
