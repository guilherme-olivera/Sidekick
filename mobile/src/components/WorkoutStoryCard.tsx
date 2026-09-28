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

// -----------------------------------------------------------------------------
// Banco de Frases Motivacionais de Alto Impacto para os Fotocards (35+ Frases)
// -----------------------------------------------------------------------------
const HIGH_IMPACT_MOTIVATIONAL_QUOTES = [
  // Superação & Mentalidade Pro
  "A dor do treino é temporária, mas o orgulho de vencer é para sempre.",
  "Menos desculpas, mais foco e quilômetros rodados com garra.",
  "O único treino ruim é aquele que você não fez.",
  "Construindo hoje o atleta de alta performance que você será amanhã.",
  "Garra inabalável no processo, vitória garantida no resultado.",
  "Sua única competição real é contra a sua versão de ontem.",
  "Suor e dedicação no treino para celebrar com orgulho no topo.",
  "Disciplina é fazer o que precisa ser feito, mesmo sem motivação.",
  "Ritmo constante, mente blindada e foco total na evolução.",
  "A consistência diária constrói resultados extraordinários.",
  "Não espere o momento perfeito. Pegue o momento e faça perfeito.",
  "Seu corpo aguenta quase tudo. É a sua mente que você precisa convencer.",
  "Desafios são apenas convites para você demonstrar a sua força.",
  "Progresso diário é melhor do que perfeição ilusória.",

  // Corrida & Endurance
  "Cada passo dado é um metro a menos entre você e o seu objetivo.",
  "As pernas obedecem quando a mente recusa a desistir.",
  "Pace forte, respiração controlada e coração pulsando garra.",
  "O asfalto testa sua resistência, mas a sua determinação vence.",
  "Corra com o coração quando as pernas começarem a cansar.",
  "A linha de chegada é apenas o começo da sua nova meta.",

  // Ciclismo & Giro
  "Giro forte, pernas de aço e foco no horizonte.",
  "Nas subidas que testam as pernas, a mente do ciclista se fortalece.",
  "Empurre os pedais como se cada watt fosse um passo para a vitória.",
  "Vento no rosto, cadência perfeita e superação em cada quilômetro.",

  // Musculação & Força
  "Carga pesada constrói mente forte e físico inabalável.",
  "Uma repetição de cada vez. A força se constrói no limite.",
  "Sem atalhos no treino: o resultado vem do esforço bruto.",
  "Cada série é um degrau rumo ao seu topo pessoal.",

  // Geral Esportivo & Foco
  "Mais um treino gravado no histórico dos campeões.",
  "A constância silenciosa vence o talento sem disciplina.",
  "Vença a si mesmo todos os dias e o mundo respeitará o seu ritmo.",
  "O impossível é apenas algo que ainda não foi treinado o suficiente.",
  "Treine em silêncio. Deixe que o seu progresso faça todo o barulho.",
  "Foco no objetivo, energia no topo e orgulho inegociável."
];

function getPunchyMotivationalQuote(workout: any): string {
  // Utiliza estritamente o Banco de Frases Motivacionais de Alto Impacto como padrão!
  const seedStr = (workout?.id || workout?.title || workout?.date || "sidekick_quote").toString();
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % HIGH_IMPACT_MOTIVATIONAL_QUOTES.length;
  return HIGH_IMPACT_MOTIVATIONAL_QUOTES[idx];
}

// -----------------------------------------------------------------------------
// Formatters & Fun Calorie Equivalencies
// -----------------------------------------------------------------------------
function formatPace(pace: number | null | undefined): string {
  if (!pace || pace <= 0) return "--:--";
  const mins = Math.floor(pace);
  const secs = Math.round((pace - mins) * 60);
  return `${mins}'${secs < 10 ? "0" : ""}${secs}"/km`;
}

function formatSpeed(speedKmH: number | null | undefined, pace: number | null | undefined): string {
  if (speedKmH && speedKmH > 0) return `${speedKmH.toFixed(1)} km/h`;
  if (pace && pace > 0) {
    const kmh = 60 / pace;
    return `${kmh.toFixed(1)} km/h`;
  }
  return "-- km/h";
}

function formatSwimPace(paceMinKm: number | null | undefined): string {
  if (!paceMinKm || paceMinKm <= 0) return "--:--/100m";
  const pace100m = paceMinKm / 10;
  const mins = Math.floor(pace100m);
  const secs = Math.round((pace100m - mins) * 60);
  return `${mins}'${secs < 10 ? "0" : ""}${secs}"/100m`;
}

function getCalorieEquivalence(calories: number): string {
  if (calories >= 700) {
    const qty = (calories / 700).toFixed(1);
    return `🥩 Equivalente a ~${qty} picanhas suculentas queimadas!`;
  }
  if (calories >= 450) {
    const qty = Math.max(1, Math.round(calories / 450));
    return `🍔 Equivalente a ~${qty} ${qty === 1 ? "hambúrguer gourmet queimado" : "hambúrgueres gourmet queimados"}!`;
  }
  if (calories >= 250) {
    const qty = Math.max(1, Math.round(calories / 250));
    return `🍕 Equivalente a ~${qty} ${qty === 1 ? "fatia de pizza queimada" : "fatias de pizza queimadas"} com garra!`;
  }
  if (calories >= 140) {
    const qty = Math.max(1, Math.round(calories / 140));
    return `🍺 Equivalente a ~${qty} ${qty === 1 ? "chopp gelado queimado" : "chopps gelados queimados"}!`;
  }
  const qty = Math.max(1, Math.round(calories / 90));
  return `⚡ Equivalente a ~${qty} ${qty === 1 ? "coxinha queimada" : "coxinhas queimadas"} no treino!`;
}

function getShortCalorieBadge(calories: number): string {
  if (calories >= 700) return `🥩 ~${(calories / 700).toFixed(1)} picanha`;
  if (calories >= 450) return `🍔 ~${Math.max(1, Math.round(calories / 450))} burger`;
  if (calories >= 250) return `🍕 ~${Math.max(1, Math.round(calories / 250))} pizza`;
  if (calories >= 140) return `🍺 ~${Math.max(1, Math.round(calories / 140))} chopp`;
  return `⚡ ~${Math.max(1, Math.round(calories / 90))} coxinha`;
}

export const WorkoutStoryCard: React.FC<WorkoutStoryCardProps> = ({
  workout,
  user,
  templateIdx,
  viewShotRef,
}) => {
  if (!workout) return null;

  const type = (workout.type || "").toLowerCase();
  const title = (workout.title || "").toLowerCase();

  const isCycling =
    type === "cycling" ||
    type === "bike" ||
    title.includes("bike") ||
    title.includes("ciclismo") ||
    title.includes("pedal") ||
    title.includes("rolo");

  const isSwimming =
    type === "swim" ||
    type === "swimming" ||
    title.includes("natação") ||
    title.includes("natacao") ||
    title.includes("piscina") ||
    title.includes("águas abertas");

  const isStrength =
    type === "strength" ||
    title.includes("muscul") ||
    title.includes("força") ||
    title.includes("forca") ||
    title.includes("crossfit") ||
    title.includes("funcional") ||
    title.includes("peso");

  const isRunning = !isCycling && !isSwimming && !isStrength;

  const routeSvg = polylineToSvgPath(
    workout.mapPolyline || workout.splits,
    250,
    150,
    18
  );

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

  const rawSpeedKmH = workout.speed || workout.averageSpeed ? (workout.speed || workout.averageSpeed) * (workout.averageSpeed < 20 ? 3.6 : 1) : null;
  const speedStr = formatSpeed(rawSpeedKmH, workout.pace);
  const paceStr = formatPace(workout.pace);
  const swimPaceStr = formatSwimPace(workout.pace);
  const punchyQuote = getPunchyMotivationalQuote(workout);

  // Generate 4 synthetic splits formatted for modality
  let splitsList: Array<{ label: string; valStr: string }> = [];
  if (workout.splits) {
    try {
      const parsed = typeof workout.splits === "string" ? JSON.parse(workout.splits) : workout.splits;
      if (Array.isArray(parsed)) {
        splitsList = parsed.slice(0, 4).map((item: any, idx: number) => {
          const speedMs = item.average_speed || 0;
          const pace = speedMs > 0 ? (1000 / speedMs) / 60 : (workout.pace || 5);
          const speedKmH = speedMs > 0 ? speedMs * 3.6 : (workout.pace ? 60 / workout.pace : 25);
          
          if (isCycling) {
            return { label: `KM ${idx + 1}`, valStr: `${speedKmH.toFixed(1)} km/h` };
          } else if (isSwimming) {
            return { label: `${(idx + 1) * 100}m`, valStr: formatSwimPace(pace) };
          } else {
            return { label: `KM ${idx + 1}`, valStr: formatPace(pace) };
          }
        });
      }
    } catch (e) {
      // fallback
    }
  }

  if (splitsList.length === 0) {
    const basePace = workout.pace || 5.2;
    if (isCycling) {
      const baseSpeed = rawSpeedKmH || 26.5;
      splitsList = [
        { label: "KM 1", valStr: `${(baseSpeed + 1.2).toFixed(1)} km/h` },
        { label: "KM 2", valStr: `${(baseSpeed - 0.5).toFixed(1)} km/h` },
        { label: "KM 3", valStr: `${(baseSpeed + 0.8).toFixed(1)} km/h` },
        { label: "KM 4", valStr: `${(baseSpeed - 0.2).toFixed(1)} km/h` },
      ];
    } else if (isSwimming) {
      splitsList = [
        { label: "100m", valStr: formatSwimPace(basePace - 0.2) },
        { label: "200m", valStr: formatSwimPace(basePace) },
        { label: "300m", valStr: formatSwimPace(basePace + 0.1) },
        { label: "400m", valStr: formatSwimPace(basePace - 0.1) },
      ];
    } else {
      splitsList = [
        { label: "KM 1", valStr: formatPace(basePace + 0.2) },
        { label: "KM 2", valStr: formatPace(basePace - 0.1) },
        { label: "KM 3", valStr: formatPace(basePace - 0.2) },
        { label: "KM 4", valStr: formatPace(basePace + 0.05) },
      ];
    }
  }

  const sportEmoji = isStrength ? "🏋️‍♂️" : isCycling ? "🚴‍♂️" : isSwimming ? "🏊‍♂️" : "🏃‍♂️";
  const sportNameUpper = isStrength ? "MUSCULAÇÃO" : isCycling ? "CICLISMO" : isSwimming ? "NATAÇÃO" : "CORRIDA";

  // =========================================================================
  // TEMPLATE 0: MAP & ELEVATION HERO 🗺️
  // =========================================================================
  if (templateIdx === 0) {
    return (
      <View style={styles.cardContainer}>
        <ViewShot ref={viewShotRef} options={{ format: "png", quality: 0.9 }}>
          <View style={[styles.storyCard, { backgroundColor: "#09090e", borderColor: "#FF5500", borderWidth: 1.5 }]}>
            {/* Header */}
            <View style={styles.headerRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontSize: 16 }}>{sportEmoji}</Text>
                <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "900", letterSpacing: 1 }}>SIDEKICK</Text>
              </View>
              <View style={{ backgroundColor: "#FF5500", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                <Text style={{ color: "#ffffff", fontSize: 8, fontWeight: "900", letterSpacing: 0.5 }}>
                  {routeSvg.hasGps ? "🗺️ PERCURSO GPS" : `${sportEmoji} ${sportNameUpper}`}
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
                <Text style={{ fontSize: 46, marginBottom: 4 }}>{sportEmoji}</Text>
                <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "900", letterSpacing: 0.5 }}>
                  {workout.title || `Treino de ${sportNameUpper}`}
                </Text>
                <Text style={{ color: "#FF5500", fontSize: 10, fontWeight: "800", marginTop: 2 }}>
                  {isStrength ? "TREINO DE FORÇA & CARGA" : "SESSÃO COMPLETA"}
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
                  {sportNameUpper}
                </Text>
              </View>

              <View style={styles.statsThreeCol}>
                <View>
                  <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "800" }}>{formattedDuration}</Text>
                  <Text style={{ color: "#777785", fontSize: 8, fontWeight: "700" }}>DURAÇÃO</Text>
                </View>

                {/* Modality Specific Secondary Metric */}
                <View>
                  {isCycling ? (
                    <>
                      <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "800" }}>{speedStr}</Text>
                      <Text style={{ color: "#777785", fontSize: 8, fontWeight: "700" }}>VEL. MÉDIA</Text>
                    </>
                  ) : isSwimming ? (
                    <>
                      <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "800" }}>{swimPaceStr}</Text>
                      <Text style={{ color: "#777785", fontSize: 8, fontWeight: "700" }}>PACE 100M</Text>
                    </>
                  ) : isStrength ? (
                    <>
                      <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "800" }}>3.850 kg</Text>
                      <Text style={{ color: "#777785", fontSize: 8, fontWeight: "700" }}>CARGA ESTIMADA</Text>
                    </>
                  ) : (
                    <>
                      <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "800" }}>{paceStr}</Text>
                      <Text style={{ color: "#777785", fontSize: 8, fontWeight: "700" }}>RITMO</Text>
                    </>
                  )}
                </View>

                <View>
                  <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "800" }}>
                    {workout.elevationGain ? `+${workout.elevationGain}m` : `${calories} kcal`}
                  </Text>
                  <Text style={{ color: "#777785", fontSize: 8, fontWeight: "700" }}>
                    {workout.elevationGain ? "ELEVAÇÃO" : "CALORIAS"}
                  </Text>
                </View>
              </View>
            </View>

            {/* High Impact Motivational Quote + Calorie Equivalency */}
            <View style={styles.aiQuoteBox}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Text style={{ fontSize: 14 }}>{companionAvatar}</Text>
                <Text style={{ color: "#FF5500", fontSize: 9, fontWeight: "800" }}>
                  {companionName.toUpperCase()} COACH
                </Text>
              </View>
              <Text style={{ color: "#d1d1d6", fontSize: 10, fontStyle: "italic", lineHeight: 14 }} numberOfLines={2}>
                "{punchyQuote}"
              </Text>
              <Text style={{ color: "#FF5500", fontSize: 8, fontWeight: "700", marginTop: 4 }}>
                {getCalorieEquivalence(calories)}
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
  // TEMPLATE 1: SPLIT LAPS & TELEMETRY HUD 🏎️🔥
  // =========================================================================
  if (templateIdx === 1) {
    return (
      <View style={styles.cardContainer}>
        <ViewShot ref={viewShotRef} options={{ format: "png", quality: 0.9 }}>
          <View style={[styles.storyCard, { backgroundColor: "#06030d", borderColor: "#00E5FF", borderWidth: 1.5 }]}>
            {/* Header */}
            <View style={styles.headerRow}>
              <Text style={{ color: "#00E5FF", fontSize: 12, fontWeight: "900", letterSpacing: 1.5 }}>
                {isCycling ? "⚡ TELEMETRIA DE VELOCIDADE" : isSwimming ? "⚡ TELEMETRIA DE BRAÇADAS" : isStrength ? "⚡ RESUMO DE CARGA & FORÇA" : "⚡ TELEMETRIA DE RITMO"}
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
                  {isCycling ? `Vel. Média: ${speedStr}` : isSwimming ? `Pace 100m: ${swimPaceStr}` : isStrength ? `${calories} kcal` : `Pace Médio: ${paceStr}`}
                </Text>
              </View>
            </View>

            {/* Split Laps Breakdown Table OR Gym Muscle Load */}
            {!isStrength ? (
              <View style={{ backgroundColor: "#090414", padding: 10, borderRadius: 12, borderWidth: 1, borderColor: "#1e0f38" }}>
                <Text style={{ color: "#a0a0c0", fontSize: 8, fontWeight: "900", letterSpacing: 1, marginBottom: 6 }}>
                  {isCycling ? "📊 VELOCIDADE POR TRECHO" : isSwimming ? "📊 RITMO POR 100M" : "📊 PARCIAIS POR QUILÔMETRO (SPLITS)"}
                </Text>
                {splitsList.map((sp, idx) => (
                  <View key={idx} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: idx < splitsList.length - 1 ? 1 : 0, borderBottomColor: "#170c2e", paddingVertical: 4 }}>
                    <Text style={{ color: "#00E5FF", fontSize: 11, fontWeight: "800" }}>{sp.label}</Text>
                    <View style={{ flex: 1, height: 4, backgroundColor: "#1c1036", marginHorizontal: 10, borderRadius: 2, overflow: "hidden" }}>
                      <View style={{ width: `${Math.min(100, Math.max(30, 100 - idx * 12))}%`, height: "100%", backgroundColor: idx % 2 === 0 ? "#00E5FF" : "#FF0055" }} />
                    </View>
                    <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "900" }}>{sp.valStr}</Text>
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

            {/* Heart Rate & Calorie Food Badge */}
            <View style={{ backgroundColor: "#0e071c", padding: 10, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,0,85,0.3)" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ color: "#a0a0c0", fontSize: 8, fontWeight: "800" }}>ZONAS DE FREQUÊNCIA CARDÍACA</Text>
                <Text style={{ color: "#FF0055", fontSize: 9, fontWeight: "900" }}>
                  {workout.avgHeartRate ? `${workout.avgHeartRate} bpm` : "ZONA 3 AERÓBICA"}
                </Text>
              </View>
              <View style={{ flexDirection: "row", height: 8, borderRadius: 4, overflow: "hidden", gap: 2, marginBottom: 4 }}>
                <View style={{ flex: 2, backgroundColor: "#51cf66" }} />
                <View style={{ flex: 4, backgroundColor: "#ffc078" }} />
                <View style={{ flex: 3, backgroundColor: "#FF5500" }} />
                <View style={{ flex: 1, backgroundColor: "#FF0055" }} />
              </View>
              <Text style={{ color: "#00E5FF", fontSize: 8, fontWeight: "800", fontStyle: "italic", textAlign: "right" }}>
                {getShortCalorieBadge(calories)} queimados 🔥
              </Text>
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
  // TEMPLATE 2: BIG METRIC POWER & CALORIES 💥
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
              <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "900", letterSpacing: 1 }}>{sportEmoji} SIDEKICK POWER</Text>
              <View style={{ backgroundColor: "rgba(0, 0, 0, 0.3)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 }}>
                <Text style={{ color: "#ffffff", fontSize: 8, fontWeight: "900" }}>BIG METRIC</Text>
              </View>
            </View>

            {/* Massive 56pt Metric Center Display */}
            <View style={{ alignItems: "center", marginVertical: 6 }}>
              <Text style={{ color: "rgba(255, 255, 255, 0.85)", fontSize: 10, fontWeight: "900", letterSpacing: 2, textTransform: "uppercase" }}>
                {workout.title || `SESSÃO DE ${sportNameUpper}`}
              </Text>
              <Text style={{ color: "#ffffff", fontSize: 56, fontWeight: "900", letterSpacing: -2, lineHeight: 60, marginVertical: 4 }}>
                {distanceKm ? distanceKm : durationMin}
              </Text>
              <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "900", letterSpacing: 3, textTransform: "uppercase" }}>
                {distanceKm ? "KILÔMETROS" : "MINUTOS"}
              </Text>
            </View>

            {/* Calorie & Modality Highlights Box */}
            <View style={{ backgroundColor: "rgba(0, 0, 0, 0.45)", padding: 12, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", gap: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ fontSize: 18 }}>🔥</Text>
                  <View>
                    <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "900" }}>{calories} kcal</Text>
                    <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 8, fontWeight: "700" }}>ENERGIA GASTA</Text>
                  </View>
                </View>

                {/* Metric by Modality */}
                <View style={{ alignItems: "flex-end" }}>
                  {isCycling ? (
                    <>
                      <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "900" }}>{speedStr}</Text>
                      <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 8, fontWeight: "700" }}>VEL. MÉDIA</Text>
                    </>
                  ) : isSwimming ? (
                    <>
                      <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "900" }}>{swimPaceStr}</Text>
                      <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 8, fontWeight: "700" }}>PACE 100M</Text>
                    </>
                  ) : isStrength ? (
                    <>
                      <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "900" }}>{formattedDuration}</Text>
                      <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 8, fontWeight: "700" }}>TEMPO TOTAL</Text>
                    </>
                  ) : (
                    <>
                      <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "900" }}>{paceStr}</Text>
                      <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 8, fontWeight: "700" }}>PACE MÉDIO</Text>
                    </>
                  )}
                </View>
              </View>

              <View style={{ borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.2)", paddingTop: 6 }}>
                <Text style={{ color: "#ffffff", fontSize: 10, fontStyle: "italic", textAlign: "center" }}>
                  {getCalorieEquivalence(calories)}
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
  // TEMPLATE 3: AI COMPANION QUOTE STICKER OVERLAY 💬✨ (Card de Citação em PNG/Overlay)
  // =========================================================================
  if (templateIdx === 3) {
    return (
      <View style={styles.cardContainer}>
        <ViewShot ref={viewShotRef} options={{ format: "png", quality: 0.9 }}>
          <View style={[styles.storyCard, { backgroundColor: "rgba(10, 10, 18, 0.94)", borderColor: "#00FF87", borderWidth: 1.5, padding: 18 }]}>
            {/* Header / Companion Tag */}
            <View style={styles.headerRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(0,255,135,0.15)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#00FF87" }}>
                  <Text style={{ fontSize: 18 }}>{companionAvatar}</Text>
                </View>
                <View>
                  <Text style={{ color: "#00FF87", fontSize: 11, fontWeight: "900", letterSpacing: 1 }}>
                    {companionName.toUpperCase()} COACH
                  </Text>
                  <Text style={{ color: "#a0a0c0", fontSize: 8, fontWeight: "700" }}>MOTIVAÇÃO DE ALTO IMPACTO</Text>
                </View>
              </View>
              <View style={{ backgroundColor: "rgba(0, 255, 135, 0.2)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: "#00FF87" }}>
                <Text style={{ color: "#00FF87", fontSize: 8, fontWeight: "900" }}>💬 CITAÇÃO PNG</Text>
              </View>
            </View>

            {/* Giant Quotation Mark & High-Impact Punchy Quote */}
            <View style={{ flex: 1, justifyContent: "center", paddingVertical: 8 }}>
              <Text style={{ color: "#00FF87", fontSize: 44, fontWeight: "900", lineHeight: 28, opacity: 0.8, marginBottom: 2 }}>
                “
              </Text>
              <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "700", fontStyle: "italic", lineHeight: 22, letterSpacing: 0.2 }} numberOfLines={3}>
                {punchyQuote}
              </Text>
              <Text style={{ color: "#00FF87", fontSize: 11, fontWeight: "900", marginTop: 8, alignSelf: "flex-end" }}>
                — {companionName} AI Coach
              </Text>
            </View>

            {/* Compact Telemetry Pill Banner with Food Equivalency */}
            <View style={{ backgroundColor: "rgba(22, 22, 35, 0.95)", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: "rgba(0, 255, 135, 0.4)", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontSize: 14 }}>{sportEmoji}</Text>
                <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "900" }}>
                  {distanceKm ? `${distanceKm} KM` : `${durationMin} MIN`}
                </Text>
              </View>

              <View style={{ height: 16, width: 1, backgroundColor: "rgba(255,255,255,0.2)" }} />

              <Text style={{ color: "#00FF87", fontSize: 12, fontWeight: "900" }}>
                {isCycling ? speedStr : isSwimming ? swimPaceStr : isStrength ? "3.850 kg" : paceStr}
              </Text>

              <View style={{ height: 16, width: 1, backgroundColor: "rgba(255,255,255,0.2)" }} />

              <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "800" }}>
                🔥 {calories} kcal ({getShortCalorieBadge(calories)})
              </Text>
            </View>

            {/* Footer */}
            <View style={[styles.footerRow, { marginTop: 10 }]}>
              <Text style={{ color: "#777785", fontSize: 9 }}>{workoutDateStr}</Text>
              <Text style={{ color: "#00FF87", fontSize: 9, fontWeight: "900" }}>@sidekick.fit</Text>
            </View>
          </View>
        </ViewShot>
      </View>
    );
  }

  // =========================================================================
  // TEMPLATE 4: OBSIDIAN GOLD EDITORIAL 🏆
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
              <Text style={{ color: "#a0a0a8", fontSize: 9, fontWeight: "800" }}>
                {isCycling ? "VELOCIDADE MÉDIA DE ELITE" : isSwimming ? "PACE DE ELITE (100M)" : isStrength ? "VOLUME ESTIMADO DE ELITE" : "PACE DE ELITE"}
              </Text>
              <Text style={{ color: "#ffd700", fontSize: 12, fontWeight: "900" }}>
                {isCycling ? speedStr : isSwimming ? swimPaceStr : isStrength ? "3.850 kg" : paceStr}
              </Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: "#a0a0a8", fontSize: 9, fontWeight: "800" }}>TEMPO TOTAL</Text>
              <Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "900" }}>{formattedDuration}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: "#a0a0a8", fontSize: 9, fontWeight: "800" }}>ENERGIA GASTA</Text>
              <Text style={{ color: "#ffd700", fontSize: 12, fontWeight: "900" }}>{calories} kcal ({getShortCalorieBadge(calories)})</Text>
            </View>
          </View>

          {/* Verified Athlete Quote */}
          <View style={{ backgroundColor: "#121214", padding: 10, borderRadius: 10, borderWidth: 1, borderColor: "#2a2a30" }}>
            <Text style={{ color: "#ffd700", fontSize: 8, fontWeight: "900", letterSpacing: 1, marginBottom: 2 }}>
              SELO DE AUTENTICIDADE SIDEKICK
            </Text>
            <Text style={{ color: "#cccccc", fontSize: 9, fontStyle: "italic", lineHeight: 13 }} numberOfLines={2}>
              "{punchyQuote}"
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
