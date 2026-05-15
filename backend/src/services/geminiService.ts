import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Analyzes a workout and generates an AI-powered narrative using Gemini
 * @param workout - Workout data with metrics (distance, pace, HR, etc)
 * @param mood - Optional mood check for context
 * @returns Generated narrative from Gemini
 */
export async function analyzeWorkoutWithGemini(
  workout: any,
  mood?: string
): Promise<string> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error(
        "GEMINI_API_KEY is not configured in environment variables"
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    // Build context about the workout
    const workoutContext = `
    Treino Realizado:
    - Tipo: ${workout.type || "Desconhecido"}
    - Data: ${workout.date || new Date().toLocaleDateString("pt-BR")}
    - Duração: ${workout.duration ? Math.round(workout.duration / 60) : "?"} minutos
    - Distância: ${workout.distance || "?"} km
    - Velocidade Média: ${workout.pace || "?"} km/h
    - BPM Médio: ${workout.avgHeartRate || "?"} bpm
    - BPM Máximo: ${workout.maxHeartRate || "?"} bpm
    - Intensidade: ${workout.intensity || "não informada"}
    ${mood ? `\n    - Humor do Atleta: ${mood}` : ""}
    `;

    const prompt = `
    Você é o "Sidekick" - um companheiro de jornada digital que oferece apoio motivacional e análise narrativa de treinos.

    ${workoutContext}

    Baseado nestes dados, crie uma análise breve, empática e motivadora que:
    1. Reconheça o esforço do atleta
    2. Destaque os pontos positivos do treino
    3. Se houver queda de performance (comparado ao esperado), ofereça perspectiva construtiva
    4. ${mood ? `Integre o humor do atleta (${mood}) na análise` : ""}
    5. Termine com uma mensagem motivacional ou sugestão prática

    A resposta deve ser curta (máx 150 palavras), em tom conversacional e empático, como um amigo que entende de corrida/musculação/ciclismo.
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
