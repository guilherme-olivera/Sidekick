const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });

async function run() {
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

    const companionName = "Sidekick";
    const aiGender = "male";
    const aiPersonality = "sarcastic";
    const aiTone = "sarcastic";
    const trainingGoal = "correr 10km";
    const experienceLevel = "iniciante";

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
      model: 'gemini-flash-latest',
      systemInstruction: systemInstruction,
    });

    console.log("Starting raw chat session...");
    const chat = model.startChat({
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
      },
    });

    console.log("Sending: O que é pace?");
    const result = await chat.sendMessage("O que é pace?");

    console.log("\n=== RAW RESPONSE ===");
    console.log(JSON.stringify(result, null, 2));

    console.log("\n=== TEXT ===");
    console.log(result.response.text());
  } catch (error) {
    console.error("❌ ERROR:", error);
  }
}

run();
