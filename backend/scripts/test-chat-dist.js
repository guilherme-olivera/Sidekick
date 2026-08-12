const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const { generateChatResponse } = require("../dist/src/services/geminiService");

async function run() {
  try {
    console.log("Testing generateChatResponse on dist...");
    const res = await generateChatResponse(
      "O que é pace?",
      [
        { role: "user", parts: "Olá, quem é você?" },
        { role: "model", parts: "Olá! Eu sou o seu companheiro Sidekick." }
      ],
      {
        companionName: "Peidinho",
        aiPersonality: "sarcastic",
        aiTone: "sarcastic",
        trainingGoal: "Correr maratona",
        experienceLevel: "iniciante"
      }
    );
    console.log("✅ SUCCESS!");
    console.log("Response:", res);
  } catch (error) {
    console.error("❌ FAILED:", error);
  }
}

run();
