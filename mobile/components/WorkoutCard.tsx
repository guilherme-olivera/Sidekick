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
  averageCadence?: number;
  elevationGain?: number;
  averageWatts?: number;
}

interface WorkoutCardProps {
  workout: Workout;
  onPress?: () => void;
  onAnalyze?: () => void;
  isAnalyzing?: boolean;
  compact?: boolean;
}

const getTypeEmoji = (type: string) => {
  switch (type) {
    case "run":
      return "👟";
    case "cycling":
      return "🚲";
    case "strength":
      return "🏋️";
    default:
      return "⚡";
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

const formatPace = (paceKmh: number, type: string) => {
  if (type !== "run" || paceKmh <= 0) {
    return `${paceKmh.toFixed(1)} km/h`;
  }
  const decimalMin = 60 / paceKmh;
  const mins = Math.floor(decimalMin);
  const secs = Math.round((decimalMin - mins) * 60);
  const secsStr = secs < 10 ? `0${secs}` : secs;
  return `${mins}:${secsStr} /km`;
};

export function WorkoutCard({ workout, onPress, onAnalyze, isAnalyzing, compact }: WorkoutCardProps) {
  const intensityStyle = getIntensityColor(workout.intensity);

  // Expose active metrics list dynamically
  const metrics = [];

  // 1. Duration
  metrics.push({
    key: "duration",
    icon: "⏱️",
    label: "Duração",
    value: formatDuration(workout.duration)
  });

  // 2. Distance
  if (workout.distance !== undefined && workout.distance !== null) {
    metrics.push({
      key: "distance",
      icon: "🏃",
      label: "Distância",
      value: `${workout.distance.toFixed(1)} km`
    });
  }

  // 3. Pace / Speed
  if (workout.pace) {
    metrics.push({
      key: "pace",
      icon: "⚡",
      label: workout.type === "run" ? "Ritmo Médio" : "Velocidade",
      value: formatPace(workout.pace, workout.type)
    });
  }

  // 4. Heart Rate
  if (workout.avgHeartRate) {
    metrics.push({
      key: "heartrate",
      icon: "❤️",
      label: "BPM Médio",
      value: `${workout.avgHeartRate} bpm`
    });
  }

  // 5. Cadence (SPM for Running, RPM for Cycling)
  if (workout.averageCadence) {
    const unit = workout.type === "run" ? "ppm" : "rpm";
    metrics.push({
      key: "cadence",
      icon: "🔄",
      label: "Cadência",
      value: `${Math.round(workout.averageCadence)} ${unit}`
    });
  }

  // 6. Elevation Gain
  if (workout.elevationGain) {
    metrics.push({
      key: "elevation",
      icon: "⛰️",
      label: "Elevação",
      value: `+${Math.round(workout.elevationGain)}m`
    });
  }

  // 7. Average Power (Watts)
  if (workout.averageWatts) {
    metrics.push({
      key: "watts",
      icon: "🔌",
      label: "Potência",
      value: `${Math.round(workout.averageWatts)} W`
    });
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.typeEmoji}>{getTypeEmoji(workout.type)}</Text>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.title} numberOfLines={2}>{workout.title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.date}>{formatDate(workout.date)}</Text>
              {!!workout.aiNarrative && (
                <View style={styles.iaMiniBadge}>
                  <Text style={styles.iaMiniBadgeText}>🧠 IA</Text>
                </View>
              )}
            </View>
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

      {/* Metrics Grid */}
      <View style={styles.metricsContainer}>
        {metrics.map((m) => (
          <MetricItem key={m.key} icon={m.icon} label={m.label} value={m.value} />
        ))}
      </View>

      {/* AI Narrative or Analyze Button */}
      {!compact && workout.aiNarrative ? (
        <View style={styles.narrativeContainer}>
          <Text style={styles.narrativeLabel}>💭 Sidekick diz:</Text>
          <Text style={styles.narrative} numberOfLines={3}>
            {workout.aiNarrative}
          </Text>
        </View>
      ) : !compact && onAnalyze ? (
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
  icon: string;
  label: string;
  value: string;
}

function MetricItem({ icon, label, value }: MetricItemProps) {
  return (
    <View style={styles.metricItem}>
      <Text style={styles.metricIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricValue} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.darkCard,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  typeEmoji: {
    fontSize: 28,
    marginRight: 10,
  },
  title: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  date: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  intensityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 6,
  },
  intensityText: {
    fontSize: 11,
    fontWeight: "700",
  },
  metricsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 4,
    gap: 8,
  },
  metricItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0d0d11",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#222",
    width: "48%",
    gap: 8,
  },
  metricIcon: {
    fontSize: 14,
  },
  metricLabel: {
    color: Colors.textSecondary,
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  metricValue: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 1,
  },
  narrativeContainer: {
    backgroundColor: Colors.dark,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  narrativeLabel: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
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
    marginTop: 8,
  },
  analyzeButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  iaMiniBadge: {
    backgroundColor: "#171f1a",
    borderColor: "#51cf66",
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  iaMiniBadgeText: {
    color: "#51cf66",
    fontSize: 9,
    fontWeight: "bold",
  },
});
