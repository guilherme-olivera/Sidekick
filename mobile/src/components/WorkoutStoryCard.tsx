import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Circle, Line, Rect, Defs, LinearGradient, Stop } from "react-native-svg";
import ViewShot from "react-native-view-shot";
import { polylineToSvgPath } from "@/src/utils/polylineDecoder";

interface WorkoutStoryCardProps {
  workout: any;
  user: any;
  templateIdx: number;
  viewShotRef: React.RefObject<any>;
}

function formatPace(pace: number | null | undefined): string {
  if (!pace || pace <= 0) return "--:--";
  const mins = Math.floor(pace);
  const secs = Math.round((pace - mins) * 60);
  return `${mins}'${secs < 10 ? "0" : ""}${secs}"/km`;
}

export const WorkoutStoryCard: React.FC<WorkoutStoryCardProps> = ({
  workout,
  user,
  templateIdx,
  viewShotRef,
}) => {
  if (!workout) return null;

  const routeSvg = polylineToSvgPath(
    workout.mapPolyline || workout.splits,
    250,
    150,
    18
  );

  const isStrength =
    workout.type === "strength" ||
    workout.title?.toLowerCase().includes("muscul") ||
    workout.title?.toLowerCase().includes("força");
  const isCycling =
    workout.type === "cycling" ||
    workout.title?.toLowerCase().includes("bike") ||
    workout.title?.toLowerCase().includes("pedal");

  const durationMin = Math.floor((workout.duration || 0) / 60);
  const durationHours = Math.floor(durationMin / 60);
  const durationRemMin = durationMin % 60;
  const formattedDuration =
    durationHours > 0 ? `${durationHours}h ${durationRemMin}m` : `${durationMin} min`;

  const distanceKm = workout.distance ? workout.distance.toFixed(2) : null;
  const calories =
    workout.calories ||
    Math.round((workout.distance || durationMin * 0.1) * 65) ||
    Math.round(durationMin * 8) ||
    240;

  const companionAvatar = user?.profile?.companionAvatar || "🦖";
  const companionName = user?.profile?.companionName || "Sidekick";
  const workoutDateStr = new Date(workout.date || Date.now()).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  // Generate 4 synthetic splits if real splits metric is not provided
  let splitsList: Array<{ km: number; paceStr: string }> = [];
  if (workout.splits) {
    try {
      const parsed = typeof workout.splits === "string" ? JSON.parse(workout.splits) : workout.splits;
      if (Array.isArray(parsed)) {
        splitsList = parsed.slice(0, 4).map((item: any, idx: number) => {
          const speedMs = item.average_speed || 0;
          const pace = speedMs > 0 ? (1000 / speedMs) / 60 : (workout.pace || 5);
          return { km: idx + 1, paceStr: formatPace(pace) };
        });
      }
    } catch (e) {
      // fallback
    }
  }

  if (splitsList.length === 0) {
    const basePace = workout.pace || 5.2;
    splitsList = [
      { km: 1, paceStr: formatPace(basePace + 0.2) },
      { km: 2, paceStr: formatPace(basePace - 0.1) },
      { km: 3, paceStr: formatPace(basePace - 0.2) },
      { km: 4, paceStr: formatPace(basePace + 0.05) },
    ];
  }

  // =========================================================================
  // TEMPLATE 0: MAP & ELEVATION HERO 🗺️ (Foco Visual no Percurso GPS & Relevo)
  // =========================================================================
  if (templateIdx === 0) {
    return (
      <View style={styles.cardContainer}>
        <ViewShot ref={viewShotRef} options={{ format: "png", quality: 0.9 }}>
          <View style={[styles.storyCard, { backgroundColor: "#09090e", borderColor: "#FF5500", borderWidth: 1.5 }]}>
            {/* Header */}
            <View style={styles.headerRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontSize: 16 }}>👟</Text>
                <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "900", letterSpacing: 1 }}>SIDEKICK</Text>
              </View>
              <View style={{ backgroundColor: "#FF5500", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                <Text style={{ color: "#ffffff", fontSize: 8, fontWeight: "900", letterSpacing: 0.5 }}>
                  {routeSvg.hasGps ? "🗺️ PERCURSO GPS" : (isStrength ? "🏋️ MUSCULAÇÃO" : isCycling ? "🚴 CICLISMO" : "🏃 INDOOR")}
                </Text>
              </View>
            </View>

            {/* GPS Canvas or Sport Badge */}
            {routeSvg.hasGps ? (
              <View style={styles.mapCanvasBox}>
                <Svg width="250" height="150" viewBox="0 0 250 150">
                  <Line x1="0" y1="50" x2="250" y2="50" stroke="#18182e" strokeWidth="1" strokeDasharray="4 4" />
                  <Line x1="0" y1="100" x2="250" y2="100" stroke="#18182e" strokeWidth="1" strokeDasharray="4 4" />
                  <Line x1="83" y1="0" x2="83" y2="150" stroke="#18182e" strokeWidth="1" strokeDasharray="4 4" />
                  <Line x1="166" y1="0" x2="166" y2="150" stroke="#18182e" strokeWidth="1" strokeDasharray="4 4" />

                  {/* Glow path */}
                  <Path d={routeSvg.pathD} fill="none" stroke="rgba(255, 85, 0, 0.4)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
                  {/* Main path */}
                  <Path d={routeSvg.pathD} fill="none" stroke="#FF5500" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                  <Circle cx={routeSvg.startPoint.x} cy={routeSvg.startPoint.y} r="6" fill="#51cf66" stroke="#ffffff" strokeWidth="2" />
                  <Circle cx={routeSvg.endPoint.x} cy={routeSvg.endPoint.y} r="6" fill="#ff4d4d" stroke="#ffffff" strokeWidth="2" />
                </Svg>
                <View style={styles.mapOverlayLabel}>
                  <Text style={{ color: "#FF5500", fontSize: 8, fontWeight: "900" }}>GPS TRACK LOGGED</Text>
                </View>
              </View>
            ) : (
              <View style={styles.sportBadgeBox}>
                <Text style={{ fontSize: 46, marginBottom: 4 }}>
                  {isStrength ? "🏋️‍♂️" : isCycling ? "🚴‍♂️" : "🏃‍♂️"}
                </Text>
                <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "900", letterSpacing: 0.5 }}>
                  {workout.title || "Treino Esportivo"}
                </Text>
                <Text style={{ color: "#FF5500", fontSize: 10, fontWeight: "800", marginTop: 2 }}>
                  {isStrength ? "TREINO DE FORÇA & CARGA" : "SESSÃO INDOOR COMPLETA"}
                </Text>
              </View>
            )}

            {/* Distance & Primary Stats */}
            <View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                <Text style={{ color: "#ffffff", fontSize: 36, fontWeight: "900" }}>
                  {distanceKm ? `${distanceKm} km` : `${durationMin} min`}
                </Text>
                <Text style={{ color: "#FF5500", fontSize: 12, fontWeight: "800", textTransform: "uppercase" }}>
                  {workout.type === "run" ? "Corrida" : workout.type === "cycling" ? "Ciclismo" : "Musculação"}
                </Text>
              </View>

              <View style={styles.statsThreeCol}>
                <View>
                  <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "800" }}>{formattedDuration}</Text>
                  <Text style={{ color: "#777785", fontSize: 8, fontWeight: "700" }}>DURAÇÃO</Text>
                </View>
                {workout.pace ? (
                  <View>
                    <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "800" }}>{formatPace(workout.pace)}</Text>
                    <Text style={{ color: "#777785", fontSize: 8, fontWeight: "700" }}>RITMO</Text>
                  </View>
                ) : null}
                <View>
                  <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "800" }}>{workout.elevationGain ? `+${workout.elevationGain}m` : `${calories} kcal`}</Text>
                  <Text style={{ color: "#777785", fontSize: 8, fontWeight: "700" }}>{workout.elevationGain ? "ELEVAÇÃO" : "CALORIAS"}</Text>
                </View>
              </View>
            </View>

            {/* AI Quote */}
            <View style={styles.aiQuoteBox}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Text style={{ fontSize: 14 }}>{companionAvatar}</Text>
                <Text style={{ color: "#FF5500", fontSize: 9, fontWeight: "800" }}>
                  {companionName.toUpperCase()} COACH
                </Text>
              </View>
              <Text style={{ color: "#d1d1d6", fontSize: 10, fontStyle: "italic", lineHeight: 14 }} numberOfLines={2}>
                "{workout.aiNarrative || "Superação constante e ritmo sólido do início ao fim!"}"
              </Text>
            </View>

            {/* Footer */}
            <View style={styles.footerRow}>
              <Text style={{ color: "#777785", fontSize: 9 }}>{workoutDateStr}</Text>
              <Text style={{ color: "#FF5500", fontSize: 9, fontWeight: "800" }}>@sidekick.fit</Text>
            </View>
          </View>
        </ViewShot>
      </View>
    );
  }

  // =========================================================================
  // TEMPLATE 1: SPLIT LAPS & TELEMETRY HUD 🏎️🔥 (Tabela de Parciais & Zonas HR)
  // =========================================================================
  if (templateIdx === 1) {
    return (
      <View style={styles.cardContainer}>
        <ViewShot ref={viewShotRef} options={{ format: "png", quality: 0.9 }}>
          <View style={[styles.storyCard, { backgroundColor: "#06030d", borderColor: "#00E5FF", borderWidth: 1.5 }]}>
            {/* Header */}
            <View style={styles.headerRow}>
              <Text style={{ color: "#00E5FF", fontSize: 12, fontWeight: "900", letterSpacing: 1.5 }}>
                ⚡ TELEMETRIA DE RITMO
              </Text>
              <View style={{ backgroundColor: "#FF0055", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 }}>
                <Text style={{ color: "#ffffff", fontSize: 8, fontWeight: "900" }}>SPLIT HUD</Text>
              </View>
            </View>

            {/* Title & Distance Header */}
            <View style={{ backgroundColor: "#0e071c", padding: 10, borderRadius: 10, borderWidth: 1, borderColor: "rgba(0,229,255,0.3)" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "900" }}>
                  {distanceKm ? `${distanceKm} KM` : `${durationMin} MIN`}
                </Text>
                <Text style={{ color: "#00E5FF", fontSize: 11, fontWeight: "800" }}>
                  Pace Médio: {formatPace(workout.pace)}
                </Text>
              </View>
            </View>

            {/* Split Laps Breakdown Table OR Gym Muscle Load */}
            {!isStrength ? (
              <View style={{ backgroundColor: "#090414", padding: 10, borderRadius: 12, borderWidth: 1, borderColor: "#1e0f38" }}>
                <Text style={{ color: "#a0a0c0", fontSize: 8, fontWeight: "900", letterSpacing: 1, marginBottom: 6 }}>
                  📊 PARCIAIS POR QUILÔMETRO (SPLITS)
                </Text>
                {splitsList.map((sp, idx) => (
                  <View key={idx} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: idx < splitsList.length - 1 ? 1 : 0, borderBottomColor: "#170c2e", paddingVertical: 4 }}>
                    <Text style={{ color: "#00E5FF", fontSize: 11, fontWeight: "800" }}>KM {sp.km}</Text>
                    <View style={{ flex: 1, height: 4, backgroundColor: "#1c1036", marginHorizontal: 10, borderRadius: 2, overflow: "hidden" }}>
                      <View style={{ width: `${Math.min(100, Math.max(30, 100 - idx * 12))}%`, height: "100%", backgroundColor: idx % 2 === 0 ? "#00E5FF" : "#FF0055" }} />
                    </View>
                    <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "900" }}>{sp.paceStr}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={{ backgroundColor: "#090414", padding: 10, borderRadius: 12, borderWidth: 1, borderColor: "#1e0f38" }}>
                <Text style={{ color: "#a0a0c0", fontSize: 8, fontWeight: "900", letterSpacing: 1, marginBottom: 6 }}>
                  💪 RESUMO DE CARGA & GRUPOS MUSCULARES
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  <View style={{ width: "48%", backgroundColor: "#15092b", padding: 8, borderRadius: 8 }}>
                    <Text style={{ color: "#a0a0c0", fontSize: 8, fontWeight: "700" }}>VOLUME ESTIMADO</Text>
                    <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "900", marginTop: 2 }}>3.850 KG</Text>
                  </View>
                  <View style={{ width: "48%", backgroundColor: "#15092b", padding: 8, borderRadius: 8 }}>
                    <Text style={{ color: "#a0a0c0", fontSize: 8, fontWeight: "700" }}>SÉRIES TOTAIS</Text>
                    <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "900", marginTop: 2 }}>18 SÉRIES</Text>
                  </View>
                  <View style={{ width: "100%", backgroundColor: "#15092b", padding: 8, borderRadius: 8, marginTop: 2 }}>
                    <Text style={{ color: "#a0a0c0", fontSize: 8, fontWeight: "700" }}>FOCO PRINCIPAL</Text>
                    <Text style={{ color: "#00E5FF", fontSize: 12, fontWeight: "900", marginTop: 2 }}>HIPERTROFIA & RESISTÊNCIA</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Heart Rate Zone Bar Graphic */}
            <View style={{ backgroundColor: "#0e071c", padding: 10, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,0,85,0.3)" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ color: "#a0a0c0", fontSize: 8, fontWeight: "800" }}>ZONAS DE FREQUÊNCIA CARDÍACA</Text>
                <Text style={{ color: "#FF0055", fontSize: 9, fontWeight: "900" }}>
                  {workout.avgHeartRate ? `${workout.avgHeartRate} bpm méd` : "ZONA 3 AERÓBICA"}
                </Text>
              </View>
              <View style={{ flexDirection: "row", height: 8, borderRadius: 4, overflow: "hidden", gap: 2 }}>
                <View style={{ flex: 2, backgroundColor: "#51cf66" }} />
                <View style={{ flex: 4, backgroundColor: "#ffc078" }} />
                <View style={{ flex: 3, backgroundColor: "#FF5500" }} />
                <View style={{ flex: 1, backgroundColor: "#FF0055" }} />
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footerRow}>
              <Text style={{ color: "#a0a0c0", fontSize: 9 }}>{workoutDateStr}</Text>
              <Text style={{ color: "#00E5FF", fontSize: 9, fontWeight: "900" }}>@sidekick.fit</Text>
            </View>
          </View>
        </ViewShot>
      </View>
    );
  }

  // =========================================================================
  // TEMPLATE 2: BIG METRIC POWER & CALORIES 💥 (Tipografia Gigante 60pt & Calorias)
  // =========================================================================
  if (templateIdx === 2) {
    return (
      <View style={styles.cardContainer}>
        <ViewShot ref={viewShotRef} options={{ format: "png", quality: 0.9 }}>
          <View style={[styles.storyCard, { backgroundColor: "#fc4c02", overflow: "hidden", padding: 18 }]}>
            <Svg style={StyleSheet.absoluteFillObject} width="100%" height="100%">
              <Defs>
                <LinearGradient id="sunsetBg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#fc4c02" />
                  <Stop offset="100%" stopColor="#d90429" />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#sunsetBg)" />
            </Svg>

            {/* Header */}
            <View style={styles.headerRow}>
              <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "900", letterSpacing: 1 }}>👟 SIDEKICK POWER</Text>
              <View style={{ backgroundColor: "rgba(0, 0, 0, 0.3)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 }}>
                <Text style={{ color: "#ffffff", fontSize: 8, fontWeight: "900" }}>BIG METRIC</Text>
              </View>
            </View>

            {/* Massive 56pt Metric Center Display */}
            <View style={{ alignItems: "center", marginVertical: 6 }}>
              <Text style={{ color: "rgba(255, 255, 255, 0.85)", fontSize: 10, fontWeight: "900", letterSpacing: 2, textTransform: "uppercase" }}>
                {workout.title || "DISTÂNCIA RECORDE"}
              </Text>
              <Text style={{ color: "#ffffff", fontSize: 56, fontWeight: "900", letterSpacing: -2, lineHeight: 60, marginVertical: 4 }}>
                {distanceKm ? distanceKm : durationMin}
              </Text>
              <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "900", letterSpacing: 3, textTransform: "uppercase" }}>
                {distanceKm ? "KILÔMETROS" : "MINUTOS"}
              </Text>
            </View>

            {/* Calorie & Pace Highlights Box */}
            <View style={{ backgroundColor: "rgba(0, 0, 0, 0.45)", padding: 12, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", gap: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ fontSize: 18 }}>🔥</Text>
                  <View>
                    <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "900" }}>{calories} kcal</Text>
                    <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 8, fontWeight: "700" }}>ENERGIA GASTA</Text>
                  </View>
                </View>
                {workout.pace ? (
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "900" }}>{formatPace(workout.pace)}</Text>
                    <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 8, fontWeight: "700" }}>PACE MÉDIO</Text>
                  </View>
                ) : null}
              </View>

              <View style={{ borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.2)", paddingTop: 6 }}>
                <Text style={{ color: "#ffffff", fontSize: 10, fontStyle: "italic", textAlign: "center" }}>
                  🍕 Equivalente a ~{Math.max(1, Math.round(calories / 250))} fatias de pizza queimadas com garra!
                </Text>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footerRow}>
              <Text style={{ color: "#ffffff", fontSize: 9 }}>{workoutDateStr}</Text>
              <Text style={{ color: "#ffffff", fontSize: 9, fontWeight: "900" }}>@sidekick.fit</Text>
            </View>
          </View>
        </ViewShot>
      </View>
    );
  }

  // =========================================================================
  // TEMPLATE 3: SIDEKICK MASCOT AI COACH & XP RANK 🦖✨ (Card do Mascote & XP)
  // =========================================================================
  if (templateIdx === 3) {
    return (
      <View style={styles.cardContainer}>
        <ViewShot ref={viewShotRef} options={{ format: "png", quality: 0.9 }}>
          <View style={[styles.storyCard, { backgroundColor: "#0f0926", borderColor: "#00FF87", borderWidth: 1.5 }]}>
            {/* Header */}
            <View style={styles.headerRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontSize: 16 }}>{companionAvatar}</Text>
                <Text style={{ color: "#00FF87", fontSize: 13, fontWeight: "900", letterSpacing: 1 }}>
                  {companionName.toUpperCase()} RELATÓRIO
                </Text>
              </View>
              <View style={{ backgroundColor: "#00FF87", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 }}>
                <Text style={{ color: "#0f0926", fontSize: 8, fontWeight: "900" }}>LVL 14 ATHLETE</Text>
              </View>
            </View>

            {/* Mascot Avatar Circle & Tier Badge */}
            <View style={{ alignItems: "center", marginVertical: 4 }}>
              <View style={{
                width: 68,
                height: 68,
                borderRadius: 34,
                backgroundColor: "#1c1142",
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 2.5,
                borderColor: "#00FF87",
              }}>
                <Text style={{ fontSize: 36 }}>{companionAvatar}</Text>
              </View>
              <View style={{ backgroundColor: "#00FF87", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, marginTop: -10 }}>
                <Text style={{ color: "#0f0926", fontSize: 9, fontWeight: "900" }}>⭐ S-TIER WORKOUT</Text>
              </View>
            </View>

            {/* AI Speech Bubble */}
            <View style={{ backgroundColor: "#1a103c", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#312068" }}>
              <Text style={{ color: "#00FF87", fontSize: 9, fontWeight: "900", marginBottom: 2 }}>
                💬 ANÁLISE DO COMPANION
              </Text>
              <Text style={{ color: "#e0e0ff", fontSize: 10, lineHeight: 15, fontStyle: "italic" }} numberOfLines={3}>
                "{workout.aiNarrative || "Manteve ritmo forte e foco inabalável. Mais um treino gravado no histórico de vitória!"}"
              </Text>
            </View>

            {/* XP & Gamification Row */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: "#150c33", padding: 10, borderRadius: 10, borderWidth: 1, borderColor: "#28185c" }}>
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: "#00FF87", fontSize: 15, fontWeight: "900" }}>+350 XP</Text>
                <Text style={{ color: "#a0a0c0", fontSize: 7, fontWeight: "800" }}>EVOLUÇÃO</Text>
              </View>
              <View style={{ width: 1, backgroundColor: "#28185c" }} />
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "900" }}>🔥 14 DIAS</Text>
                <Text style={{ color: "#a0a0c0", fontSize: 7, fontWeight: "800" }}>SEQUÊNCIA</Text>
              </View>
              <View style={{ width: 1, backgroundColor: "#28185c" }} />
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: "#00FF87", fontSize: 15, fontWeight: "900" }}>{distanceKm ? `${distanceKm}k` : `${durationMin}m`}</Text>
                <Text style={{ color: "#a0a0c0", fontSize: 7, fontWeight: "800" }}>CONQUISTA</Text>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footerRow}>
              <Text style={{ color: "#a0a0c0", fontSize: 9 }}>{workoutDateStr}</Text>
              <Text style={{ color: "#00FF87", fontSize: 9, fontWeight: "900" }}>@sidekick.fit</Text>
            </View>
          </View>
        </ViewShot>
      </View>
    );
  }

  // =========================================================================
  // TEMPLATE 4: OBSIDIAN GOLD EDITORIAL 🏆 (Capa de Revista Esportiva)
  // =========================================================================
  return (
    <View style={styles.cardContainer}>
      <ViewShot ref={viewShotRef} options={{ format: "png", quality: 0.9 }}>
        <View style={[styles.storyCard, { backgroundColor: "#050508", borderColor: "#ffd700", borderWidth: 2 }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={{ color: "#ffd700", fontSize: 12, fontWeight: "900", letterSpacing: 1.5 }}>
              🏆 SIDEKICK GOLD EDITORIAL
            </Text>
            <View style={{ backgroundColor: "#ffd700", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 }}>
              <Text style={{ color: "#000000", fontSize: 8, fontWeight: "900" }}>RECORDE</Text>
            </View>
          </View>

          {/* Trophy & Main Title */}
          <View style={{ alignItems: "center", marginVertical: 4 }}>
            <Text style={{ fontSize: 44, marginBottom: 2 }}>🏆</Text>
            <Text style={{ color: "#ffd700", fontSize: 10, fontWeight: "900", letterSpacing: 2, textTransform: "uppercase" }}>
              CONQUISTA DE PERFORMANCE DE ELITE
            </Text>
            <Text style={{ color: "#ffffff", fontSize: 36, fontWeight: "900", marginTop: 2 }}>
              {distanceKm ? `${distanceKm} KM` : `${durationMin} MIN`}
            </Text>
          </View>

          {/* Gold Stats Panel */}
          <View style={{ backgroundColor: "#111116", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#2a2a35", gap: 6 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: "#a0a0a8", fontSize: 9, fontWeight: "800" }}>PACE DE ELITE</Text>
              <Text style={{ color: "#ffd700", fontSize: 12, fontWeight: "900" }}>{formatPace(workout.pace)}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: "#a0a0a8", fontSize: 9, fontWeight: "800" }}>TEMPO TOTAL</Text>
              <Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "900" }}>{formattedDuration}</Text>
            </View>
            {workout.avgHeartRate ? (
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: "#a0a0a8", fontSize: 9, fontWeight: "800" }}>FREQ. CARDÍACA MÉDIA</Text>
                <Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "900" }}>{workout.avgHeartRate} bpm</Text>
              </View>
            ) : null}
          </View>

          {/* Verified Athlete Quote */}
          <View style={{ backgroundColor: "#121214", padding: 10, borderRadius: 10, borderWidth: 1, borderColor: "#2a2a30" }}>
            <Text style={{ color: "#ffd700", fontSize: 8, fontWeight: "900", letterSpacing: 1, marginBottom: 2 }}>
              SELO DE AUTENTICIDADE SIDEKICK
            </Text>
            <Text style={{ color: "#cccccc", fontSize: 9, fontStyle: "italic", lineHeight: 13 }} numberOfLines={2}>
              "{workout.aiNarrative || "Superação técnica comprovada em sessão de treino de alta intensidade."}"
            </Text>
          </View>

          {/* Footer */}
          <View style={styles.footerRow}>
            <Text style={{ color: "#777785", fontSize: 9 }}>{workoutDateStr}</Text>
            <Text style={{ color: "#ffd700", fontSize: 9, fontWeight: "900" }}>@sidekick.fit</Text>
          </View>
        </View>
      </ViewShot>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: 290,
    height: 480,
  },
  storyCard: {
    width: 290,
    height: 480,
    borderRadius: 20,
    padding: 16,
    justifyContent: "space-between",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mapCanvasBox: {
    height: 150,
    backgroundColor: "#0d0d16",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1a1a2e",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 4,
    overflow: "hidden",
  },
  mapOverlayLabel: {
    position: "absolute",
    bottom: 6,
    right: 8,
    backgroundColor: "rgba(9, 9, 14, 0.8)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sportBadgeBox: {
    height: 150,
    backgroundColor: "#11111c",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222238",
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
    marginVertical: 4,
  },
  statsThreeCol: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#1f1f2e",
    paddingTop: 8,
    marginTop: 6,
    justifyContent: "space-between",
  },
  aiQuoteBox: {
    backgroundColor: "#12121e",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#1f1f35",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
