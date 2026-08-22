import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/src/contexts/AuthContext";
import { useStrava } from "@/src/contexts/StravaContext";
import { apiService } from "@/src/services/apiService";

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

export default function OnboardingScreen() {
  const { user, refreshUser } = useAuth();
  const { edit } = useLocalSearchParams();
  const isEditMode = edit === "true";

  const { isConnected, athlete, connect, disconnect, syncActivities } = useStrava();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncedCount, setSyncedCount] = useState<number | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(isEditMode);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [hasSkippedStrava, setHasSkippedStrava] = useState(false);

  const [companionName, setCompanionName] = useState("Sidekick");
  const [companionAvatar, setCompanionAvatar] = useState("🦖");
  const [isCommentModalVisible, setIsCommentModalVisible] = useState(true);
  const [aiGender, setAiGender] = useState("neutral");
  const [aiPersonality, setAiPersonality] = useState("calm");
  const [aiTone, setAiTone] = useState("motivational");

  // User States
  const [birthday, setBirthday] = useState("");
  const [gender, setGender] = useState("male");
  const [experienceLevel, setExperienceLevel] = useState("intermediate");
  const [weeklyFrequency, setWeeklyFrequency] = useState(3);
  const [selectedInjuries, setSelectedInjuries] = useState<string[]>(["none"]);
  const [customInjury, setCustomInjury] = useState("");

  // Meta States
  const [goalType, setGoalType] = useState("distance");
  const [goalDistance, setGoalDistance] = useState("10k");
  const [customDistance, setCustomDistance] = useState("");
  const [goalTargetTime, setGoalTargetTime] = useState("");

  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Prefill when editing
  useEffect(() => {
    if (user?.profile) {
      const p = user.profile;
      if (p.companionName) setCompanionName(p.companionName);
      if (p.companionAvatar) setCompanionAvatar(p.companionAvatar);
      if (p.aiGender) setAiGender(p.aiGender);
      if (p.aiPersonality) setAiPersonality(p.aiPersonality);
      if (p.aiTone) setAiTone(p.aiTone);
      if (p.phoneNumber) setPhoneNumber(p.phoneNumber);
      if (p.gender) setGender(p.gender);
      if (p.birthday) setBirthday(p.birthday);
      if (p.experienceLevel) setExperienceLevel(p.experienceLevel);
      if (p.weeklyFrequency) setWeeklyFrequency(p.weeklyFrequency);
      if (p.injuryNote) {
        if (p.injuryNote === "none") {
          setSelectedInjuries(["none"]);
          setCustomInjury("");
        } else {
          const parts = p.injuryNote.split(",").map((s: string) => s.trim());
          const presets = ["joelho", "canela", "lombar"];
          const selected: string[] = [];
          const customParts: string[] = [];
          
          parts.forEach(part => {
            if (presets.includes(part)) {
              selected.push(part);
            } else {
              customParts.push(part);
            }
          });
          
          if (customParts.length > 0) {
            selected.push("custom");
            setCustomInjury(customParts.join(", "));
          }
          
          setSelectedInjuries(selected);
        }
      }
      if (p.goalType) setGoalType(p.goalType);
      
      if (p.goalDistance) {
        if (["5k", "10k", "15k", "half_marathon", "marathon"].includes(p.goalDistance)) {
          setGoalDistance(p.goalDistance);
        } else {
          setGoalDistance("custom");
          setCustomDistance(p.goalDistance);
        }
      }
      if (p.goalTargetTime) setGoalTargetTime(p.goalTargetTime);
    }
  }, [user]);

  // Trigger comment modal when Strava links successfully
  useEffect(() => {
    if (step === 4 && isConnected) {
      setHasSkippedStrava(false);
      setIsCommentModalVisible(true);
    }
  }, [isConnected, step]);

  const handleBirthdayChange = (text: string) => {
    // Remove formatting
    const cleaned = text.replace(/[^0-9]/g, "");
    let formatted = cleaned;
    
    if (cleaned.length > 2 && cleaned.length <= 4) {
      formatted = cleaned.substring(0, 2) + "/" + cleaned.substring(2);
    } else if (cleaned.length > 4) {
      formatted = cleaned.substring(0, 2) + "/" + cleaned.substring(2, 4) + "/" + cleaned.substring(4, 8);
    }
    
    setBirthday(formatted);
  };

  const validateBirthday = (dateStr: string): boolean => {
    if (dateStr.length !== 10) return false;
    const parts = dateStr.split("/");
    if (parts.length !== 3) return false;
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
    if (day < 1 || day > 31) return false;
    if (month < 1 || month > 12) return false;
    
    const currentYear = new Date().getFullYear();
    if (year < 1920 || year > currentYear) return false;
    
    return true;
  };

  const getDistanceLabel = (dist: string, custom?: string) => {
    if (dist === "5k") return "5 km";
    if (dist === "10k") return "10 km";
    if (dist === "15k") return "15 km";
    if (dist === "half_marathon") return "Meia Maratona (21.1 km)";
    if (dist === "marathon") return "Maratona (42.2 km)";
    if (dist === "custom") return `${custom || "0"} km`;
    return dist;
  };

  const handleSave = async () => {
    if (isSaving) return;

    if (!isEditMode && !termsAccepted) {
      Alert.alert("Aviso de Isenção", "Por favor, aceite a declaração de que o aplicativo é um companheiro digital e não um médico/treinador.");
      return;
    }

    // Validation checks
    if (!companionName.trim()) {
      Alert.alert("Nome do Companheiro", "Por favor, insira um nome para o seu companheiro digital.");
      setStep(1);
      return;
    }

    if (!validateBirthday(birthday)) {
      Alert.alert("Data de Nascimento", "Por favor, insira uma data de nascimento válida no formato DD/MM/AAAA.");
      setStep(2);
      return;
    }

    if (goalType === "pace" && !goalTargetTime) {
      Alert.alert("Tempo Alvo", "Por favor, insira o seu tempo alvo desejado.");
      setStep(3);
      return;
    }

    if (goalDistance === "custom" && !customDistance) {
      Alert.alert("Distância", "Por favor, preencha a distância personalizada.");
      setStep(3);
      return;
    }

    if (selectedInjuries.includes("custom") && !customInjury.trim()) {
      Alert.alert("Dor Customizada", "Por favor, preencha o campo com a descrição da sua lesão/dor.");
      setStep(2);
      return;
    }

    try {
      setIsSaving(true);
      
      const distance = goalDistance === "custom" ? customDistance : goalDistance;

      // Build injury string
      const filtered = selectedInjuries.filter(x => x !== "none");
      let finalInjury = "none";
      if (filtered.length > 0) {
        const parts = filtered.map(x => {
          if (x === "custom") return customInjury.trim();
          return x;
        }).filter(Boolean);
        finalInjury = parts.length > 0 ? parts.join(", ") : "none";
      }
      
      const payload = {
        companionName: companionName.trim(),
        companionAvatar,
        aiGender,
        aiPersonality,
        aiTone,
        birthday,
        goalType,
        goalDistance: distance,
        goalTargetTime,
        experienceLevel,
        weeklyFrequency,
        injuryNote: finalInjury,
        isConfigured: true,
        phoneNumber: phoneNumber.trim(),
        gender,
      };

      const response = await apiService.put("/user/profile", payload);
      
      if (response.success) {
        await refreshUser();
        if (isEditMode) {
          Alert.alert("Sucesso", "Configurações atualizadas!", [
            { text: "OK", onPress: () => router.back() }
          ]);
        } else {
          router.replace("/(tabs)");
        }
      } else {
        Alert.alert("Erro", response.error || "Falha ao salvar configurações");
      }
    } catch (error) {
      Alert.alert("Erro", "Ocorreu um erro ao salvar o perfil");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const nextStep = () => {
    if (step === 1) {
      if (!companionName.trim()) {
        Alert.alert("Nome do Companheiro", "Por favor, insira um nome para o seu companheiro digital.");
        return;
      }
    }
    if (step === 2) {
      if (!validateBirthday(birthday)) {
        Alert.alert("Data de Nascimento", "Por favor, insira uma data de nascimento válida (DD/MM/AAAA).");
        return;
      }
      if (selectedInjuries.includes("custom") && !customInjury.trim()) {
        Alert.alert("Dor Customizada", "Por favor, descreva sua dor/restrição.");
        return;
      }
    }
    if (step === 3) {
      if (goalType === "pace" && !goalTargetTime) {
        Alert.alert("Meta de Pace", "Por favor, informe o tempo que você deseja alcançar.");
        return;
      }
      if (goalDistance === "custom" && !customDistance) {
        Alert.alert("Meta de Distância", "Por favor, informe a distância em quilômetros.");
        return;
      }
    }
    if (step === 4) {
      if (!isConnected) {
        Alert.alert(
          "Strava Não Conectado",
          "Deseja conectar sua conta do Strava agora para importar suas atividades históricas? Você também pode fazer isso mais tarde no seu Perfil.",
          [
            { text: "Conectar Strava", style: "cancel" },
            {
              text: "Avançar assim mesmo",
              style: "destructive",
              onPress: () => {
                setHasSkippedStrava(true);
                setStep(5);
                setIsCommentModalVisible(true);
              }
            }
          ]
        );
        return;
      }
    }
    setStep(s => s + 1);
    setIsCommentModalVisible(true);
  };

  const prevStep = () => {
    setStep(s => s - 1);
    setIsCommentModalVisible(true);
  };

  const getCompanionComment = () => {
    const name = companionName || "Sidekick";
    const avatar = companionAvatar || "🦖";
    
    if (step === 1) {
      return `Fala parceiro! Eu sou o ${name} ${avatar}. Escolha meu tom e personalidade e vamos botar para quebrar nos treinos!`;
    }
    if (step === 2) {
      return `Legal! Agora preciso saber mais sobre você para podermos calcular a sua prontidão física (Readiness) e evitar lesões.`;
    }
    if (step === 3) {
      return `Trace uma meta clara de distância ou ritmo (pace). Juntos, com base na ciência fisiológica e INSCYD, vamos buscar essa marca!`;
    }
    if (step === 4) {
      if (isConnected) {
        return `Conexão realizada com sucesso! Já estou puxando seus treinos do Strava para fazer a pré-análise do seu perfil. Você é fera! 🏃‍♂️💨`;
      }
      return `Quase tudo pronto! Conecte seu Strava para que eu possa acompanhar sua telemetria física em tempo real!`;
    }
    if (step === 5) {
      if (hasSkippedStrava) {
        return `Só consigo te acompanhar de verdade se eu conseguir ver seus treinos! Não esqueça de fazer essa integração com o Strava mais tarde lá no seu perfil, combinado? 😉`;
      }
      return `Pronto, contrato assinado! Agora é só calçar o tênis e ir para o asfalto. Estou pronto para te motivar!`;
    }
    return "";
  };

  // Helper strings for summary
  const genderMap: Record<string, string> = { neutral: "Neutro 🤖", male: "Homem 👨", female: "Mulher 👩" };
  const userGenderMap: Record<string, string> = { male: "Masculino ♂️", female: "Feminino ♀️", other: "Não informado 🤐" };
  const persMap: Record<string, string> = { calm: "Calmo 😌", strict: "Rígido 📏", tough: "Bravo ⚡" };
  const toneMap: Record<string, string> = {
    cold: "Frio 🧊",
    serious: "Sério 🧐",
    sarcastic: "Sarcástico 😏",
    motivational: "Muito Motivador 🔥",
    funny: "Engraçado 🃏"
  };
  const expMap: Record<string, string> = { beginner: "Iniciante 🐢", intermediate: "Intermediário 🏃‍♂️", advanced: "Avançado 🚀" };
  
  const getInjuriesSummaryString = () => {
    const filtered = selectedInjuries.filter(x => x !== "none");
    if (filtered.length === 0) return "Sem dores ✅";
    
    const parts = filtered.map(x => {
      if (x === "joelho") return "Lombar/Joelho 🦵";
      if (x === "canela") return "Canelite/Canela 🦴";
      if (x === "lombar") return "Lombar 🎒";
      if (x === "custom") return customInjury ? `Outra: ${customInjury} ✏️` : "Outra Restrição ✏️";
      return x;
    });
    return parts.join(", ");
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {/* Top Header */}
        <View style={styles.header}>
          {isEditMode ? (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backButtonText}>✕ Fechar</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 60 }} />
          )}
          <Text style={styles.headerTitle}>
            {isEditMode ? "Ajustar Sidekick" : "Configuração Inicial"}
          </Text>
          <Text style={styles.stepIndicator}>{step} / 5</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* STEP 1: IA COMPANION */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              <Text style={styles.title}>Crie o seu Companheiro</Text>
              <Text style={styles.subtitle}>Personalize o nome, o avatar e a personalidade da IA que vai caminhar e treinar com você.</Text>

              {/* Companion Name */}
              <View style={styles.optionSection}>
                <Text style={styles.sectionLabel}>Nome do Companheiro</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ex: Rocky, Athena, Bolt"
                  placeholderTextColor="#666"
                  value={companionName}
                  onChangeText={setCompanionName}
                />
              </View>

              {/* Companion Avatar */}
              <View style={styles.optionSection}>
                <Text style={styles.sectionLabel}>Avatar / Mascote</Text>
                <View style={styles.gridRowWrap}>
                  {[
                    { id: "🤖", label: "🤖 Robô" },
                    { id: "🐶", label: "🐶 Cão" },
                    { id: "🦁", label: "🦁 Leão" },
                    { id: "🦉", label: "🦉 Coruja" },
                    { id: "🦊", label: "🦊 Raposa" },
                    { id: "🦖", label: "🦖 Dino" },
                    { id: "🐯", label: "🐯 Tigre" },
                  ].map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.avatarSelectorCard, companionAvatar === item.id && styles.gridCardActive]}
                      onPress={() => setCompanionAvatar(item.id)}
                    >
                      <Text style={styles.avatarEmojiText}>{item.id}</Text>
                      <Text style={[styles.avatarLabelText, companionAvatar === item.id && styles.gridCardTextActive]}>
                        {item.label.split(" ")[1]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* AI Gender */}
              <View style={styles.optionSection}>
                <Text style={styles.sectionLabel}>Sexo da IA</Text>
                <View style={styles.gridRow}>
                  {[
                    { id: "neutral", label: "Neutro 🤖" },
                    { id: "male", label: "Homem 👨" },
                    { id: "female", label: "Mulher 👩" },
                  ].map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.gridCard, aiGender === item.id && styles.gridCardActive]}
                      onPress={() => setAiGender(item.id)}
                    >
                      <Text style={[styles.gridCardText, aiGender === item.id && styles.gridCardTextActive]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* AI Personality */}
              <View style={styles.optionSection}>
                <Text style={styles.sectionLabel}>Atitude / Personalidade</Text>
                <View style={styles.gridRow}>
                  {[
                    { id: "calm", label: "Calmo 😌", desc: "Paciente e compreensivo" },
                    { id: "strict", label: "Rígido 📏", desc: "Disciplinado e objetivo" },
                    { id: "tough", label: "Bravo ⚡", desc: "Enérgico e exigente" },
                  ].map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.gridCardTall, aiPersonality === item.id && styles.gridCardActive]}
                      onPress={() => setAiPersonality(item.id)}
                    >
                      <Text style={[styles.gridCardText, aiPersonality === item.id && styles.gridCardTextActive]}>
                        {item.label}
                      </Text>
                      <Text style={styles.gridCardDesc}>{item.desc}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* AI Tone */}
              <View style={styles.optionSection}>
                <Text style={styles.sectionLabel}>Humor / Tom de Voz</Text>
                <View style={styles.verticalOptions}>
                  {[
                    { id: "motivational", label: "Muito Motivador 🔥", desc: "Focado em te encher de energia positiva" },
                    { id: "sarcastic", label: "Sarcástico 😏", desc: "Irônico e engraçado sobre suas métricas" },
                    { id: "serious", label: "Sério 🧐", desc: "Linguagem técnica, profissional e direta" },
                    { id: "funny", label: "Engraçado 🃏", desc: "Espirituoso, faz piadas e descontrai" },
                    { id: "cold", label: "Frio 🧊", desc: "Puramente analítico, curto e grosso" },
                  ].map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.listCard, aiTone === item.id && styles.listCardActive]}
                      onPress={() => setAiTone(item.id)}
                    >
                      <View style={styles.listCardInfo}>
                        <Text style={[styles.listCardText, aiTone === item.id && styles.listCardTextActive]}>
                          {item.label}
                        </Text>
                        <Text style={styles.listCardDesc}>{item.desc}</Text>
                      </View>
                      {aiTone === item.id && <Text style={styles.checkIcon}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* STEP 2: USER METADATA */}
          {step === 2 && (
            <View style={styles.stepContainer}>
              <Text style={styles.title}>Sobre Você</Text>
              <Text style={styles.subtitle}>Preencha seus dados para a IA calibrar as recomendações biológicas e de descanso.</Text>

              {/* Birthday */}
              <View style={styles.optionSection}>
                <Text style={styles.sectionLabel}>Data de Nascimento</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                  maxLength={10}
                  value={birthday}
                  onChangeText={handleBirthdayChange}
                />
              </View>

              {/* Phone Number */}
              <View style={styles.optionSection}>
                <Text style={styles.sectionLabel}>Telefone / WhatsApp</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="(11) 99999-9999"
                  placeholderTextColor="#666"
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/\D/g, "");
                    let formatted = cleaned;
                    if (cleaned.length > 2 && cleaned.length <= 7) {
                      formatted = `(${cleaned.substring(0, 2)}) ${cleaned.substring(2)}`;
                    } else if (cleaned.length > 7) {
                      formatted = `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7, 11)}`;
                    }
                    setPhoneNumber(formatted);
                  }}
                />
              </View>

              {/* Biological Sex (Gender) */}
              <View style={styles.optionSection}>
                <Text style={styles.sectionLabel}>Sexo Biológico</Text>
                <View style={styles.gridRow}>
                  {[
                    { id: "male", label: "Masculino ♂️" },
                    { id: "female", label: "Feminino ♀️" },
                    { id: "other", label: "Não informar 🤐" },
                  ].map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.gridCard,
                        gender === item.id && styles.gridCardActive,
                        { width: "31%" }
                      ]}
                      onPress={() => setGender(item.id)}
                    >
                      <Text style={[
                        styles.gridCardText,
                        gender === item.id && styles.gridCardTextActive,
                        { fontSize: 12 }
                      ]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Experience Level */}
              <View style={styles.optionSection}>
                <Text style={styles.sectionLabel}>Nível de Experiência</Text>
                <View style={styles.gridRow}>
                  {[
                    { id: "beginner", label: "Iniciante 🐢" },
                    { id: "intermediate", label: "Intermediário 🏃‍♂️" },
                    { id: "advanced", label: "Avançado 🚀" },
                  ].map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.gridCard, experienceLevel === item.id && styles.gridCardActive]}
                      onPress={() => setExperienceLevel(item.id)}
                    >
                      <Text style={[styles.gridCardText, experienceLevel === item.id && styles.gridCardTextActive]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Weekly Frequency */}
              <View style={styles.optionSection}>
                <Text style={styles.sectionLabel}>Meta de Treinos Semanais</Text>
                <View style={styles.gridRow}>
                  {[2, 3, 4, 5].map(freq => (
                    <TouchableOpacity
                      key={freq}
                      style={[styles.gridCard, weeklyFrequency === freq && styles.gridCardActive]}
                      onPress={() => setWeeklyFrequency(freq)}
                    >
                      <Text style={[styles.gridCardText, weeklyFrequency === freq && styles.gridCardTextActive]}>
                        {freq === 5 ? "5+ dias" : `${freq} dias`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Injuries / Active Pain */}
              <View style={styles.optionSection}>
                <Text style={styles.sectionLabel}>Você sente alguma dor/lesão ativa? (Selecione todas aplicáveis)</Text>
                <View style={styles.verticalOptions}>
                  {[
                    { id: "none", label: "Sem dores ativas ✅" },
                    { id: "joelho", label: "Joelho / Articulação do Joelho 🦵" },
                    { id: "canela", label: "Canelite / Canela 🦴" },
                    { id: "lombar", label: "Lombar / Costas 🎒" },
                  ].map(item => {
                    const isSelected = selectedInjuries.includes(item.id);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.listCard, isSelected && styles.listCardActive]}
                        onPress={() => {
                          if (item.id === "none") {
                            setSelectedInjuries(["none"]);
                            setCustomInjury("");
                          } else {
                            let updated = selectedInjuries.filter(x => x !== "none");
                            if (updated.includes(item.id)) {
                              updated = updated.filter(x => x !== item.id);
                            } else {
                              updated.push(item.id);
                            }
                            if (updated.length === 0) {
                              updated = ["none"];
                            }
                            setSelectedInjuries(updated);
                          }
                        }}
                      >
                        <Text style={[styles.listCardText, isSelected && styles.listCardTextActive]}>
                          {item.label}
                        </Text>
                        {isSelected && <Text style={styles.checkIcon}>✓</Text>}
                      </TouchableOpacity>
                    );
                  })}

                  {/* Custom injury toggle option */}
                  <TouchableOpacity
                    style={[
                      styles.listCard,
                      selectedInjuries.includes("custom") && styles.listCardActive
                    ]}
                    onPress={() => {
                      if (selectedInjuries.includes("custom")) {
                        setSelectedInjuries(selectedInjuries.filter(x => x !== "custom" && x !== "none"));
                        setCustomInjury("");
                      } else {
                        const updated = selectedInjuries.filter(x => x !== "none");
                        updated.push("custom");
                        setSelectedInjuries(updated);
                      }
                    }}
                  >
                    <Text style={[styles.listCardText, selectedInjuries.includes("custom") && styles.listCardTextActive]}>
                      Outra Restrição Customizada... ✏️
                    </Text>
                    {selectedInjuries.includes("custom") && <Text style={styles.checkIcon}>✓</Text>}
                  </TouchableOpacity>

                  {selectedInjuries.includes("custom") && (
                    <View style={styles.customInjuryContainer}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Descreva a lesão/dor (ex: Tornozelo, Ombro)"
                        placeholderTextColor="#666"
                        value={customInjury}
                        onChangeText={setCustomInjury}
                      />
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* STEP 3: ATHLETE GOALS */}
          {step === 3 && (
            <View style={styles.stepContainer}>
              <Text style={styles.title}>Sua Meta de Treino</Text>
              <Text style={styles.subtitle}>O que você está buscando conquistar nesse momento?</Text>

              {/* Goal Type */}
              <View style={styles.optionSection}>
                <Text style={styles.sectionLabel}>Tipo de Meta</Text>
                <View style={styles.gridRow}>
                  <TouchableOpacity
                    style={[styles.gridCard, goalType === "distance" && styles.gridCardActive]}
                    onPress={() => setGoalType("distance")}
                  >
                    <Text style={[styles.gridCardText, goalType === "distance" && styles.gridCardTextActive]}>
                      Aumentar Distância 🏃‍♂️
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.gridCard, goalType === "pace" && styles.gridCardActive]}
                    onPress={() => setGoalType("pace")}
                  >
                    <Text style={[styles.gridCardText, goalType === "pace" && styles.gridCardTextActive]}>
                      Abaixar Tempo (Pace) ⏱️
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Distance Choice */}
              <View style={styles.optionSection}>
                <Text style={styles.sectionLabel}>Qual a Distância Alvo?</Text>
                <View style={styles.distanceGrid}>
                  {[
                    { id: "5k", label: "5 km" },
                    { id: "10k", label: "10 km" },
                    { id: "15k", label: "15 km" },
                    { id: "half_marathon", label: "21.1 km (Meia)" },
                    { id: "marathon", label: "42.2 km (Maratona)" },
                    { id: "custom", label: "Personalizado ✏️" },
                  ].map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.distanceCard, goalDistance === item.id && styles.distanceCardActive]}
                      onPress={() => setGoalDistance(item.id)}
                    >
                      <Text style={[styles.gridCardText, goalDistance === item.id && styles.gridCardTextActive]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {goalDistance === "custom" && (
                  <View style={styles.customDistanceInput}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Distância em km (ex: 8.5)"
                      placeholderTextColor="#666"
                      keyboardType="numeric"
                      value={customDistance}
                      onChangeText={setCustomDistance}
                    />
                  </View>
                )}
              </View>

              {/* Target Time */}
              <View style={styles.optionSection}>
                <Text style={styles.sectionLabel}>
                  {goalType === "pace" ? "Tempo Alvo (Obrigatório)" : "Tempo Desejado (Opcional)"}
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ex: 00:45:00 ou 2 horas"
                  placeholderTextColor="#666"
                  value={goalTargetTime}
                  onChangeText={setGoalTargetTime}
                />
              </View>
            </View>
          )}

          {/* STEP 4: STRAVA CONNECTION */}
          {step === 4 && (
            <View style={styles.stepContainer}>
              <Text style={styles.title}>Conectar ao Strava</Text>
              <Text style={styles.subtitle}>
                Passo final! Conecte seu Strava para que seu companheiro possa puxar sua telemetria de treino automaticamente.
              </Text>

              <View style={styles.stravaBox}>
                {isConnected ? (
                  <View style={styles.stravaConnectedContainer}>
                    <Text style={styles.stravaStatusText}>✅ Strava Conectado!</Text>
                    <Text style={styles.stravaConnectedDesc}>
                      O Sidekick já está sincronizado com sua conta do Strava. Seus treinos históricos foram importados e estão calibrados!
                    </Text>
                  </View>
                ) : (
                  <View style={styles.stravaDisconnectedContainer}>
                    <Text style={styles.stravaStatusText}>⚠️ Strava Não Conectado</Text>
                    <Text style={styles.stravaHint}>
                      A sincronização do Strava permite ao seu companheiro monitorar seu ritmo e batimentos em tempo real para estruturar os conselhos de evolução fisiológica.
                    </Text>
                    
                    <TouchableOpacity
                      style={styles.connectButton}
                      onPress={async () => {
                        try {
                          await connect();
                        } catch (err) {
                          Alert.alert("Erro", "Falha ao iniciar conexão com o Strava.");
                        }
                      }}
                    >
                      <Text style={styles.connectButtonText}>👟 Conectar Conta Strava</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* STEP 5: FINAL SUMMARY */}
          {step === 5 && (
            <View style={styles.stepContainer}>
              <Text style={styles.title}>Jornada Pronta!</Text>
              <Text style={styles.subtitle}>Olha só a síntese do companheiro digital que estruturamos para você:</Text>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>🤖 Contrato do seu Sidekick</Text>
                <Text style={styles.summaryText}>
                  Seu parceiro de treinos se chamará <Text style={styles.summaryHighlight}>{companionName}</Text> e usará o mascote <Text style={styles.summaryHighlight}>{companionAvatar}</Text>.
                </Text>
                <Text style={styles.summaryText}>
                  Ele será configurado como {" "}
                  <Text style={styles.summaryHighlight}>{genderMap[aiGender] || aiGender}</Text> com a atitude {" "}
                  <Text style={styles.summaryHighlight}>{persMap[aiPersonality]}</Text> e tom de voz {" "}
                  <Text style={styles.summaryHighlight}>{toneMap[aiTone]}</Text>.
                </Text>

                <Text style={styles.summaryText}>
                  Ele sabe que seu sexo biológico é <Text style={styles.summaryHighlight}>{userGenderMap[gender] || gender}</Text>, seu nível é {" "}
                  <Text style={styles.summaryHighlight}>{expMap[experienceLevel]}</Text>, planeja treinar {" "}
                  <Text style={styles.summaryHighlight}>{weeklyFrequency} vezes por semana</Text> e está monitorando o status de:{" "}
                  <Text style={styles.summaryHighlight}>{getInjuriesSummaryString()}</Text>.
                </Text>

                <Text style={styles.summaryText}>
                  Sua meta principal é {" "}
                  <Text style={styles.summaryHighlight}>
                    {goalType === "distance" ? "aumentar a distância" : "reduzir o pace/tempo"}
                  </Text> para os {" "}
                  <Text style={styles.summaryHighlight}>
                    {getDistanceLabel(goalDistance, customDistance)}
                  </Text>
                  {goalTargetTime ? ` em ${goalTargetTime}` : ""}.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setTermsAccepted(!termsAccepted)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                  {termsAccepted && <Text style={styles.checkboxCheckMark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>
                  Estou ciente de que o Sidekick é um companheiro digital de apoio moral e NÃO substitui treinadores físicos profissionais ou aconselhamento médico.
                </Text>
              </TouchableOpacity>

              <View style={styles.savingLoaderContainer}>
                {isSaving ? (
                  <View style={styles.loadingWrapper}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>Configurando seu Sidekick...</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.finalButton,
                      (!isEditMode && !termsAccepted) && styles.finalButtonDisabled
                    ]}
                    onPress={handleSave}
                    disabled={!isEditMode && !termsAccepted}
                  >
                    <Text style={styles.finalButtonText}>
                      {isEditMode ? "Salvar e Concluir 💾" : "Iniciar Jornada 🚀"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Mascot Comment Popover Modal */}
          <Modal
            visible={isCommentModalVisible}
            animationType="fade"
            transparent={true}
            onRequestClose={() => setIsCommentModalVisible(false)}
          >
            <View style={styles.mascotModalOverlay}>
              <View style={styles.mascotModalContent}>
                <View style={styles.mascotAvatarWrapper}>
                  <Text style={styles.mascotModalAvatar}>{companionAvatar}</Text>
                </View>
                
                <Text style={styles.mascotModalName}>{companionName}</Text>
                
                <View style={styles.speechBubble}>
                  <Text style={styles.speechBubbleText}>{getCompanionComment()}</Text>
                </View>
                
                <TouchableOpacity
                  style={styles.mascotModalBtn}
                  onPress={() => setIsCommentModalVisible(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.mascotModalBtnText}>Bora! 🚀</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </ScrollView>

        {/* Bottom Actions Navigator */}
        <View style={styles.navigationFooter}>
          {step > 1 ? (
            <TouchableOpacity style={styles.navButtonSecondary} onPress={prevStep} disabled={isSaving}>
              <Text style={styles.navButtonSecondaryText}>Anterior</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 120 }} />
          )}

          {step < 5 ? (
            <TouchableOpacity style={styles.navButtonPrimary} onPress={nextStep}>
              <Text style={styles.navButtonPrimaryText}>Avançar</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 120 }} />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.darkBorder,
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#222",
    borderRadius: 6,
  },
  backButtonText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  stepIndicator: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "700",
    width: 50,
    textAlign: "right",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  stepContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  optionSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 12,
  },
  gridRow: {
    flexDirection: "row",
    gap: 8,
  },
  gridCard: {
    flex: 1,
    backgroundColor: Colors.darkCard,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  gridCardActive: {
    borderColor: Colors.primary,
    backgroundColor: "#2c1c1c",
  },
  gridCardText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  gridCardTextActive: {
    color: Colors.primary,
  },
  gridCardTall: {
    flex: 1,
    backgroundColor: Colors.darkCard,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  gridCardDesc: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
  verticalOptions: {
    gap: 8,
  },
  listCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.darkCard,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  listCardActive: {
    borderColor: Colors.primary,
    backgroundColor: "#2c1c1c",
  },
  listCardInfo: {
    flex: 1,
  },
  listCardText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  listCardTextActive: {
    color: Colors.primary,
  },
  listCardDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  checkIcon: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: "700",
  },
  textInput: {
    backgroundColor: Colors.darkCard,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: Colors.text,
    fontSize: 14,
  },
  customInjuryContainer: {
    marginTop: 4,
  },
  distanceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  distanceCard: {
    width: "48%",
    backgroundColor: Colors.darkCard,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  distanceCardActive: {
    borderColor: Colors.primary,
    backgroundColor: "#2c1c1c",
  },
  customDistanceInput: {
    marginTop: 12,
  },
  summaryCard: {
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    padding: 20,
    marginBottom: 30,
  },
  summaryTitle: {
    color: Colors.gold,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
  },
  summaryText: {
    color: Colors.text,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  summaryHighlight: {
    color: Colors.primary,
    fontWeight: "700",
  },
  savingLoaderContainer: {
    alignItems: "center",
    marginTop: 10,
  },
  loadingWrapper: {
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  finalButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 40,
    width: "100%",
    alignItems: "center",
  },
  finalButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  navigationFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === "android" ? 36 : 16,
    borderTopWidth: 1,
    borderTopColor: Colors.darkBorder,
    backgroundColor: Colors.dark,
  },
  navButtonPrimary: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
    width: 120,
    alignItems: "center",
  },
  navButtonPrimaryText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  navButtonSecondary: {
    backgroundColor: "#222",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
    width: 120,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.darkBorder,
  },
  navButtonSecondaryText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  stravaBox: {
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    padding: 20,
    marginTop: 10,
    width: "100%",
  },
  stravaConnectedContainer: {
    width: "100%",
    alignItems: "center",
  },
  stravaConnectedDesc: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  stravaDisconnectedContainer: {
    width: "100%",
    alignItems: "center",
  },
  stravaStatusText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  athleteProfile: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    width: "100%",
    marginBottom: 20,
    gap: 12,
  },
  athleteImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  athleteImagePlaceholder: {
    backgroundColor: "#222",
    alignItems: "center",
    justifyContent: "center",
  },
  athleteName: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  syncButton: {
    backgroundColor: Colors.gold,
    borderRadius: 10,
    paddingVertical: 14,
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
  },
  syncButtonText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "700",
  },
  syncResultText: {
    color: Colors.success,
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
  connectButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    width: "100%",
    alignItems: "center",
    marginBottom: 16,
  },
  connectButtonText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  stravaHint: {
    color: Colors.textSecondary,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 8,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 10,
    marginBottom: 24,
    gap: 10,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.darkBorder,
    backgroundColor: Colors.darkCard,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  checkboxCheckMark: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: "bold",
  },
  checkboxLabel: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  finalButtonDisabled: {
    opacity: 0.5,
  },
  gridRowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  avatarSelectorCard: {
    width: "31%",
    backgroundColor: Colors.darkCard,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  avatarEmojiText: {
    fontSize: 24,
    marginBottom: 2,
  },
  avatarLabelText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  mascotModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(5, 5, 8, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  mascotModalContent: {
    width: "90%",
    backgroundColor: "#111116",
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  mascotAvatarWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#1c1c24",
    borderWidth: 2,
    borderColor: Colors.primary + "33",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  mascotModalAvatar: {
    fontSize: 48,
  },
  mascotModalName: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  speechBubble: {
    backgroundColor: "#1c1c24",
    borderRadius: 16,
    padding: 18,
    width: "100%",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
  },
  speechBubbleText: {
    color: Colors.text,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  mascotModalBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  mascotModalBtnText: {
    color: "#0a0a0c",
    fontSize: 15,
    fontWeight: "700",
  },
});
