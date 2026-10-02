const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });

async function testGemini() {
  try {
    const { testGeminiConnection } = require('../dist/src/services/geminiService.js');
    console.log('🔄 Testando Gemini API com fallback automático de modelos...\n');

    const result = await testGeminiConnection();

    console.log('✅ Gemini API funcionando perfeitamente!\n');
    console.log('📝 Resposta do Gemini:\n');
    console.log(result);
    return;
  } catch (error) {
    console.error('❌ Falha ao testar Gemini API:');
    console.error(error.message || error);
    process.exit(1);
  }
}

testGemini();
