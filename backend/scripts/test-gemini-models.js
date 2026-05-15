const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });

async function listGeminiModels() {
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error('❌ Erro: GEMINI_API_KEY não está definida no backend/.env');
      process.exit(1);
    }

    const client = new GoogleGenerativeAI(apiKey);

    console.log('🔄 Listando modelos disponíveis no Gemini...\n');
    const models = await client.listModels();

    console.log('✅ Chave API válida!\n');
    console.log('📋 Modelos disponíveis:\n');
    
    let count = 0;
    for await (const model of models) {
      console.log(`${++count}. ${model.name}`);
      if (model.description) console.log(`   ${model.description}\n`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao listar modelos:');
    console.error(error.message || error);
    process.exit(1);
  }
}

listGeminiModels();
