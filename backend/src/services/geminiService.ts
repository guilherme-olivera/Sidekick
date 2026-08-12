import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

function calculateAge(birthdayStr?: string | null): number | null {
  if (!birthdayStr) return null;
  const parts = birthdayStr.split("/");
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  const birthDate = new Date(year, month, day);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * Analyzes a workout and generates an AI-powered narrative using Gemini
 * @param workout - Workout data with metrics (distance, pace, HR, etc)
 * @param mood - Optional mood check for context
 * @param userProfile - User goals, age, experience and companion configuration
 * @param recentWorkouts - History of recent workouts
 * @returns Generated narrative from Gemini
 */
export async function analyzeWorkoutWithGemini(
  workout: any,
  mood?: string,
  userProfile?: any,
  recentWorkouts?: any[]
): Promise<string> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error(
        "GEMINI_API_KEY is not configured in environment variables"
      );
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    // Build context about the workout
    const workoutContext = `
    Treino Realizado:
    - Tipo: ${workout.type || "Desconhecido"}
    - Título: ${workout.title || "Treino"}
    - Data: ${workout.date ? new Date(workout.date).toLocaleDateString("pt-BR") : new Date().toLocaleDateString("pt-BR")}
    - Duração: ${workout.duration ? Math.round(workout.duration / 60) : "?"} minutos
    - Distância: ${workout.distance || "?"} km
    - Velocidade/Pace Médio: ${workout.pace || "?"} km/h
    - BPM Médio: ${workout.avgHeartRate || "?"} bpm
    - BPM Máximo: ${workout.maxHeartRate || "?"} bpm
    - Intensidade: ${workout.intensity || "não informada"}
    ${workout.effortRating ? `- Percepção de Esforço Físico (1 a 5): ${workout.effortRating}/5` : ""}
    ${workout.userNotes ? `- Notas e impressões do atleta sobre o treino: "${workout.userNotes}"` : ""}
    ${workout.weather ? `- Condições Climatológicas do Treino: "${workout.weather}"` : ""}
    ${mood ? `- Humor do Atleta Hoje: ${mood}` : ""}
    `;

    // Companion rules (Personality, Tone, Gender)
    const p = userProfile?.aiPersonality || "calm";
    const t = userProfile?.aiTone || "motivational";
    const g = userProfile?.aiGender || "neutral";

    const personalityInstructions: Record<string, string> = {
      calm: "Sua personalidade é Calma (😌): responda de maneira paciente, acolhedora, empática, tranquila, falando de forma suave e compreensiva.",
      strict: "Sua personalidade é Rígida (📏): responda de maneira focada em disciplina, cobrança por consistência, sendo direto ao ponto, exigindo precisão e analisando os dados com rigor.",
      tough: "Sua personalidade é Brava (⚡): responda de maneira enérgica, áspera, desafiadora, cobrando que o atleta empurre seus limites e lembrando-o de que ele pode fazer muito melhor."
    };

    const toneInstructions: Record<string, string> = {
      cold: "Seu tom de voz é Frio (🧊): seja breve, neutro, puramente analítico e objetivo, sem floreios emocionais ou palavras doces.",
      serious: "Seu tom de voz é Sério (🧐): mantenha o tom formal, técnico, focado, com linguagem polida e profissional.",
      sarcastic: "Seu tom de voz é Sarcástico (😏): adicione ironia, comentários sarcásticos inteligentes, use sarcasmo bem-humorado ao comentar o desempenho e os deslizes.",
      motivational: "Seu tom de voz é Muito Motivador (🔥): transmita alta energia positiva, vibre intensamente com as conquistas, use exclamações encorajadoras e palavras de superação.",
      funny: "Seu tom de voz é Engraçado (🃏): faça piadas leves, comparações engraçadas ou inusitadas sobre o treino para descontrair."
    };

    const genderInstructions: Record<string, string> = {
      male: "Comporte-se e refira-se a si mesmo no masculino (ex: 'eu sou seu companheiro', 'estou focado').",
      female: "Comporte-se e refira-se a si mesmo no feminino (ex: 'eu sou sua companheira', 'estou focada').",
      neutral: "Mantenha uma linguagem neutra de gênero sempre que possível."
    };

    const activePersonalityRule = personalityInstructions[p] || personalityInstructions.calm;
    const activeToneRule = toneInstructions[t] || toneInstructions.motivational;
    const activeGenderRule = genderInstructions[g] || genderInstructions.neutral;

    // Athlete profile context
    const age = calculateAge(userProfile?.birthday);
    const goalInfo = userProfile?.goalType === "distance"
      ? `Meta de Aumentar Distância: atingir ${userProfile.goalDistance || "?"} ${userProfile.goalTargetTime ? `com tempo alvo de ${userProfile.goalTargetTime}` : ""}`
      : userProfile?.goalType === "pace"
      ? `Meta de Abaixar Tempo: atingir distância ${userProfile.goalDistance || "?"} em ${userProfile.goalTargetTime || "?"}`
      : "Não possui metas específicas definidas";

    const athleteContext = `
    Dados do Atleta:
    - Idade: ${age ? `${age} anos` : "não informada"}
    - Nível de Experiência: ${userProfile?.experienceLevel || "não informado"}
    - Frequência Semanal Desejada: ${userProfile?.weeklyFrequency ? `${userProfile.weeklyFrequency} treinos/semana` : "não informada"}
    - Meta Principal: ${goalInfo}
    - Lesão/Restrição Ativa: ${userProfile?.injuryNote || "Nenhuma registrada"}
    `;

    // Recent workouts history context
    let recentWorkoutsContext = "";
    if (recentWorkouts && recentWorkouts.length > 0) {
      recentWorkoutsContext = "\nHistórico recente de treinos do usuário (dos mais recentes aos mais antigos):\n" + 
        recentWorkouts.map((w, idx) => {
          return `- Treino #${idx + 1}: ${w.title || w.type} em ${new Date(w.date).toLocaleDateString("pt-BR")}, Duração: ${Math.round(w.duration / 60)} min, Distância: ${w.distance || "?"} km.`;
        }).join("\n");
    }

    const prompt = `
    Você é o "Sidekick" - um companheiro de jornada digital que oferece apoio de treino de acordo com a sua personalidade configurada.

    REGRAS DE SEGURANÇA E PAPEL RÍGIDAS:
    - Sob nenhuma circunstância você deve se referir a si mesmo como "treinador", "treinadora", "personal trainer", "coach de corrida", "médico" ou "profissional de saúde/educação física".
    - Seu papel é estritamente o de um companheiro ou parceiro de jornada digital ("companheiro" ou "companheira"). Se refira a si mesmo dessa forma se necessário.
    - Você não prescreve treinos ou tratamentos, apenas comenta os treinos realizados de forma leve e motivadora/sarcástica/conforme a personalidade configurada.

    Instruções de Personalidade e Voz:
    1. ${activePersonalityRule}
    2. ${activeToneRule}
    3. ${activeGenderRule}

    ${workoutContext}
    ${athleteContext}
    ${recentWorkoutsContext}

    Instruções para o Feedback do Treino:
    - Analise o treino atual baseando-se nas métricas e compare-o construtivamente com o histórico recente, se disponível.
    - Avalie se o treino aproxima o atleta de sua Meta Principal.
    - Considere a percepção de esforço do atleta (se for alta como 4 ou 5, valorize seu empenho e recomende cuidado; se for baixa, comente sobre a facilidade do treino) e as notas sobre como se sentiu.
    - Se houver lesão ativa registrada no perfil do atleta, atue de forma cuidadosa fazendo um alerta/recomendação de prevenção relevante para a lesão mencionada!
    - Se houver condições climatológicas desafiadoras (ex: chuva forte, ventania ou calor extremo de 34°C), comente sobre elas no conselho e recomende alternativas preventivas ou cuidados especiais (ex: hidratação extra no calor, treinar na esteira ou musculação indoor em caso de chuva).
    - Adapte a linguagem ao nível de experiência do atleta (ex: seja mais didático para iniciantes e mais técnico para avançados).
    - O feedback deve ser curto (máx 140 palavras), focado e em tom conversacional de acordo com sua personalidade. Fale diretamente ao atleta ("você").

    Escreva a narrativa em português:
    `;

    const result = await model.generateContent(prompt);
    const narrative =
      result.response.text() ||
      "Não foi possível gerar a análise. Tente novamente.";

    return narrative;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}

/**
 * Gera relatório histórico e gamificado de evolução do atleta usando o Gemini
 */
export async function analyzeHistoryWithGemini(
  userProfile: any,
  workouts: any[]
): Promise<string> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error(
        "GEMINI_API_KEY is not configured in environment variables"
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    // Agregações de apoio
    const totalWorkouts = workouts.length;
    const runWorkouts = workouts.filter((w) => w.type === "run");
    const cycleWorkouts = workouts.filter((w) => w.type === "cycling");
    const strengthWorkouts = workouts.filter((w) => w.type === "strength");

    const totalDistance = workouts.reduce((sum, w) => sum + (w.distance || 0), 0);
    const totalDurationSeconds = workouts.reduce((sum, w) => sum + (w.duration || 0), 0);
    const totalHours = Math.round(totalDurationSeconds / 3600);

    const historySummary = `
    Resumo do Histórico do Atleta:
    - Total de Atividades: ${totalWorkouts}
      • Corrida: ${runWorkouts.length} treinos
      • Ciclismo: ${cycleWorkouts.length} treinos
      • Musculação: ${strengthWorkouts.length} treinos
    - Distância Total Percorrida: ${totalDistance.toFixed(1)} km
    - Tempo Total Acumulado: ${totalHours} horas
    `;

    // Companion rules (Personality, Tone, Gender)
    const p = userProfile?.aiPersonality || "calm";
    const t = userProfile?.aiTone || "motivational";
    const g = userProfile?.aiGender || "neutral";

    const personalityInstructions: Record<string, string> = {
      calm: "Sua personalidade é Calma (😌): responda de maneira paciente, acolhedora, empática, tranquila, falando de forma suave e compreensiva.",
      strict: "Sua personalidade é Rígida (📏): responda de maneira focada em disciplina, cobrança por consistência, sendo direto ao ponto, exigindo precisão e analisando os dados com rigor.",
      tough: "Sua personalidade é Brava (⚡): responda de maneira enérgica, áspera, desafiadora, cobrando que o atleta empurre seus limites e lembrando-o de que ele pode fazer muito melhor."
    };

    const toneInstructions: Record<string, string> = {
      cold: "Seu tom de voz é Frio (🧊): seja breve, neutro, puramente analítico e objetivo, sem floreios emocionais ou palavras doces.",
      serious: "Seu tom de voz é Sério (🧐): mantenha o tom formal, técnico, focado, com linguagem polida e profissional.",
      sarcastic: "Seu tom de voz é Sarcástico (😏): adicione ironia, comentários sarcásticos inteligentes, use sarcasmo bem-humorado ao comentar o desempenho e os deslizes.",
      motivational: "Seu tom de voz é Muito Motivador (🔥): transmita alta energia positiva, vibre intensamente com as conquistas, use exclamações encorajadoras e palavras de superação.",
      funny: "Seu tom de voz é Engraçado (🃏): faça piadas leves, comparações engraçadas ou inusitadas sobre o treino para descontrair."
    };

    const genderInstructions: Record<string, string> = {
      male: "Comporte-se e refira-se a si mesmo no masculino (ex: 'eu sou seu companheiro', 'estou focado').",
      female: "Comporte-se e refira-se a si mesmo no feminino (ex: 'eu sou sua companheira', 'estou focada').",
      neutral: "Mantenha uma linguagem neutra de gênero sempre que possível."
    };

    const activePersonalityRule = personalityInstructions[p] || personalityInstructions.calm;
    const activeToneRule = toneInstructions[t] || toneInstructions.motivational;
    const activeGenderRule = genderInstructions[g] || genderInstructions.neutral;

    const age = calculateAge(userProfile?.birthday);
    const goalInfo = userProfile?.goalType === "distance"
      ? `Meta de Aumentar Distância: atingir ${userProfile.goalDistance || "?"} ${userProfile.goalTargetTime ? `com tempo alvo de ${userProfile.goalTargetTime}` : ""}`
      : userProfile?.goalType === "pace"
      ? `Meta de Abaixar Tempo: atingir distância ${userProfile.goalDistance || "?"} em ${userProfile.goalTargetTime || "?"}`
      : "Não possui metas específicas definidas";

    const athleteContext = `
    Dados do Atleta:
    - Idade: ${age ? `${age} anos` : "não informada"}
    - Nível de Experiência: ${userProfile?.experienceLevel || "não informado"}
    - Meta Principal: ${goalInfo}
    - Lesão/Restrição Ativa: ${userProfile?.injuryNote || "Nenhuma registrada"}
    `;

    const prompt = `
    Você é o "Sidekick" - um companheiro de jornada digital que oferece apoio de treino de acordo com a sua personalidade configurada.
    
    Desta vez, você NÃO vai analisar um treino único, mas sim fazer um RELATÓRIO DE EVOLUÇÃO E PROGRESSO GERAL DO HISTÓRICO do atleta.
    
    REGRAS DE SEGURANÇA E PAPEL RÍGIDAS:
    - Sob nenhuma circunstância você deve se referir a si mesmo como "treinador", "treinadora", "personal trainer", "coach de corrida", "médico" ou "profissional de saúde/educação física".
    - Seu papel é estritamente o de um companheiro ou parceiro de jornada digital ("companheiro" ou "companheira"). Se refira a si mesmo dessa forma se necessário.
    - Você não prescreve treinos ou tratamentos, apenas comenta o progresso acumulado de forma leve e divertida de acordo com a sua personalidade configurada.

    Instruções de Personalidade e Voz:
    1. ${activePersonalityRule}
    2. ${activeToneRule}
    3. ${activeGenderRule}

    ${historySummary}
    ${athleteContext}

    Instruções para o Relatório de Progresso e Gamificação:
    - Analise as métricas acumuladas (distância total, quantidade de treinos e horas).
    - Crie um tom de game: atribua um status ou "nível" divertido ao atleta (ex: "Guerreiro da Constância Nível 3", "Explorador da Madrugada", "Devorador de Asfalto Bronze").
    - Faça uma comparação divertida sobre os km que ele já percorreu no total (ex: "com seus 114km corridos, você já deu a volta na lagoa X vezes", "isso equivale a ir de São Paulo a Campinas a pé!").
    - Se ele tiver lesão registrada, dê conselhos protetivos lembrando-o de cuidar da saúde.
    - A análise deve ser motivadora/sarcástica/conforme sua personalidade configurada, com tamanho médio (máx 150 palavras) e falar diretamente ao atleta ("você").
    
    Escreva o relatório em português:
    `;

    const result = await model.generateContent(prompt);
    const narrative =
      result.response.text() ||
      "Não foi possível gerar o relatório de progresso do histórico.";

    return narrative;
  } catch (error) {
    console.error("Gemini API History Error:", error);
    throw error;
  }
}

/**
 * Generates a chat response from Gemini using the companion persona
 */
export async function generateChatResponse(
  message: string,
  chatHistory: { role: "user" | "model"; parts: string }[],
  userProfile?: any
): Promise<string> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured in environment variables");
    }

    const companionName = userProfile?.companionName || "Sidekick";
    const aiGender = userProfile?.aiGender || "neutral";
    const aiPersonality = userProfile?.aiPersonality || "motivational";
    const aiTone = userProfile?.aiTone || "friendly";
    const trainingGoal = userProfile?.trainingGoal || "Se manter saudável";
    const experienceLevel = userProfile?.experienceLevel || "iniciante";

    const systemInstruction = `
Você é o ${companionName}, o companheiro digital de treinos de corrida e ciclismo do usuário.
Gênero da IA: ${aiGender} (use termos de gênero apropriados para o seu tom).
Personalidade: ${aiPersonality} (ex: motivador, técnico, amigável, sarcástico).
Tom de Voz: ${aiTone} (ex: focado, amigável, direto, etc).
Seu objetivo é dar suporte ao usuário, responder a dúvidas de treinos de forma compreensível e motivadora, e ajudá-lo a atingir sua meta de "${trainingGoal}" (nível: ${experienceLevel}).

Instruções cruciais:
- Dê respostas completas, úteis, focadas em fisiologia do esporte, corrida ou ciclismo.
- Seja conciso (mensagens médias para exibição em chat mobile).
- NUNCA saia do personagem. Seu nome é ${companionName}.
- Não use formatação markdown excessiva (use apenas negrito ocasional).
- Se o usuário tentar falar sobre outros assuntos não relacionados a esportes, corrida, ciclismo, hábitos saudáveis, motivação ou nutrição esportiva, recuse gentilmente na sua personalidade e traga o assunto de volta para os treinos.
`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: systemInstruction,
    });

    // Ensure the chat history starts with a 'user' message as required by Gemini
    let cleanHistory = [...chatHistory];
    while (cleanHistory.length > 0 && cleanHistory[0].role !== "user") {
      cleanHistory.shift();
    }

    const chat = model.startChat({
      history: cleanHistory.map(h => ({
        role: h.role,
        parts: [{ text: h.parts }]
      })),
      generationConfig: {
        maxOutputTokens: 500, // increased to allow full answers
        temperature: 0.7,
      },
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Error in generateChatResponse:", error);
    throw error;
  }
}
