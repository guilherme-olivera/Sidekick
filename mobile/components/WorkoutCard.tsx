import React from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";

const Colors = {
  dark: "#0a0a0a",
  darkCard: "#1a1a1a",
  darkBorder: "#333333",
  text: "#ffffff",
  textSecondary: "#b0b0b0",
  primary: "#ff6b6b",
  success: "#51cf66",
};

interface Workout {
  id: string;
  title: string;
  type: "run" | "cycling" | "strength";
  date: Date;
  duration: number; // segundos
  distance?: number; // km
  pace?: number; // km/h
  avgHeartRate?: number;
  intensity: "low" | "moderate" | "high";
  aiNarrative?: string;
}

interface WorkoutCardProps {
  workout: Workout;
  onPress?: () => void;
  onAnalyze?: () => void;
  isAnalyzing?: boolean;
}

const getTypeEmoji = (type: string) => {
  switch (type) {
    case "run":
      return "🏃";
    case "cycling":
      return "🚴";
    case "strength":
      return "💪";
    default:
      return "⚡";
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case "run":
      return "Corrida";
    case "cycling":
      return "Ciclismo";
    case "strength":
      return "Musculação";
    default:
      return "Treino";
  }
};

const getIntensityColor = (intensity: string) => {
  switch (intensity) {
    case "low":
      return { bg: "#1f3a42", text: "#51cf66" };
    case "moderate":
      return { bg: "#422c1f", text: "#ffa94d" };
    case "high":
      return { bg: "#421f1f", text: "#ff6b6b" };
    default:
      return { bg: Colors.darkCard, text: Colors.textSecondary };
  }
};

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

const formatDate = (date: Date) => {
  return date.toLocaleDateString("pt-BR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function WorkoutCard({ workout, onPress, onAnalyze, isAnalyzing }: WorkoutCardProps) {
  const intensityStyle = getIntensityColor(workout.intensity);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.typeEmoji}>{getTypeEmoji(workout.type)}</Text>
          <View>
            <Text style={styles.title}>{workout.title}</Text>
            <Text style={styles.date}>{formatDate(workout.date)}</Text>
          </View>
        </View>
        <View
          style={[
            styles.intensityBadge,
            { backgroundColor: intensityStyle.bg },
          ]}
        >
          <Text style={[styles.intensityText, { color: intensityStyle.text }]}>
            {workout.intensity === "low"
              ? "Leve"
              : workout.intensity === "moderate"
              ? "Moderado"
              : "Intenso"}
          </Text>
        </View>
      </View>

      {/* Metrics */}
      <View style={styles.metricsContainer}>
        <MetricItem label="Duração" value={formatDuration(workout.duration)} />
        {workout.distance && (
          <MetricItem label="Distância" value={`${workout.distance.toFixed(1)} km`} />
        )}
        {workout.pace && (
          <MetricItem label="Velocidade" value={`${workout.pace.toFixed(1)} km/h`} />
        )}
        {workout.avgHeartRate && (
          <MetricItem label="BPM Médio" value={`${workout.avgHeartRate} bpm`} />
        )}
      </View>

      {/* AI Narrative or Analyze Button */}
      {workout.aiNarrative ? (
        <View style={styles.narrativeContainer}>
          <Text style={styles.narrativeLabel}>💭 Sidekick says:</Text>
          <Text style={styles.narrative} numberOfLines={3}>
            {workout.aiNarrative}
          </Text>
        </View>
      ) : onAnalyze ? (
        <TouchableOpacity
          style={styles.analyzeButton}
          onPress={onAnalyze}
          disabled={isAnalyzing}
        >
          <Text style={styles.analyzeButtonText}>
            {isAnalyzing ? "🤖 Analisando..." : "🧠 Analisar com IA"}
          </Text>
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
}

interface MetricItemProps {
  label: string;
  value: string;
}

function MetricItem({ label, value }: MetricItemProps) {
  return (
    <View style={styles.metricItem}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.darkCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  typeEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  title: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  date: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  intensityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  intensityText: {
    fontSize: 12,
    fontWeight: "600",
  },
  metricsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
    gap: 12,
  },
  metricItem: {
    backgroundColor: Colors.dark,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: "23%",
  },
  metricLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginBottom: 2,
  },
  metricValue: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  narrativeContainer: {
    backgroundColor: Colors.dark,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  narrativeLabel: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  narrative: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  analyzeButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  analyzeButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
});
