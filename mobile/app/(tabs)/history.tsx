import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  SafeAreaView,
  Text,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useDashboard } from "@/src/contexts/DashboardContext";
import { WorkoutCard } from "@/components/WorkoutCard";

const Colors = {
  dark: "#0a0a0a",
  darkCard: "#1a1a1a",
  darkBorder: "#333333",
  text: "#ffffff",
  textSecondary: "#b0b0b0",
  primary: "#ff6b6b",
};

type FilterType = "all" | "run" | "cycling" | "strength";

export default function HistoryScreen() {
  const { workouts } = useDashboard();
  const { workoutId } = useLocalSearchParams();
  const [filter, setFilter] = useState<FilterType>("all");

  const selectedWorkout = workoutId
    ? workouts.find((workout) => workout.id === workoutId)
    : null;

  const filteredWorkouts = selectedWorkout
    ? [selectedWorkout]
    : filter === "all"
    ? workouts
    : workouts.filter((w) => w.type === filter);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Histórico de Treinos</Text>
          <Text style={styles.subtitle}>
            {filteredWorkouts.length} treinos encontrados
          </Text>
        </View>

        {/* Filters */}
        <View style={styles.filterContainer}>
          <FilterButton
            label="Todos"
            icon="📊"
            active={filter === "all"}
            onPress={() => setFilter("all")}
          />
          <FilterButton
            label="Corrida"
            icon="🏃"
            active={filter === "run"}
            onPress={() => setFilter("run")}
          />
          <FilterButton
            label="Ciclismo"
            icon="🚴"
            active={filter === "cycling"}
            onPress={() => setFilter("cycling")}
          />
          <FilterButton
            label="Musculação"
            icon="💪"
            active={filter === "strength"}
            onPress={() => setFilter("strength")}
          />
        </View>

        {/* Workouts List */}
        {filteredWorkouts.length > 0 ? (
          filteredWorkouts.map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyText}>Nenhum treino neste filtro</Text>
          </View>
        )}

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

interface FilterButtonProps {
  label: string;
  icon: string;
  active: boolean;
  onPress: () => void;
}

function FilterButton({ label, icon, active, onPress }: FilterButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.filterButton, active && styles.filterButtonActive]}
      onPress={onPress}
    >
      <Text style={styles.filterIcon}>{icon}</Text>
      <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>
        {label}
      </Text>
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
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  filterContainer: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.darkCard,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  filterLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },
  filterLabelActive: {
    color: Colors.text,
  },
  emptyState: {
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    padding: 40,
    alignItems: "center",
    marginTop: 20,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
});
