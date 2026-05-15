const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });

async function testGemini() {
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error('❌ Erro: GEMINI_API_KEY não está definida no backend/.env');
      process.exit(1);
    }

    const client = new GoogleGenerativeAI(apiKey);
    // Altere para gemini-1.5-flash
    const model = client.getGenerativeModel({ model: 'gemini-flash-latest' });

    console.log('🔄 Testando Gemini API (gemini-flash-latest) com prompt simples...\n');

    const result = await model.generateContent(
      'Você é um assistente de treinamento de atletismo. Responda brevemente: qual é a importância do aquecimento?'
    );

    const text = result.response.text();
    console.log('✅ Gemini API funcionando corretamente!\n');
    console.log('📝 Resposta do Gemini:\n');
    console.log(text);
    process.exit(0);
  } catch (error) {
    console.error('❌ Falha ao testar Gemini API:');
    console.error(error.message || error);
    process.exit(1);
  }
}

testGemini();
