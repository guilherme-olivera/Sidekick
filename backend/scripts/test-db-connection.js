const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

const envPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('Erro: DATABASE_URL não está definido no backend/.env');
  process.exit(1);
}

const client = new Client({ connectionString: databaseUrl });

async function testConnection() {
  try {
    await client.connect();
    const result = await client.query('SELECT now() AS now, current_database() AS database, current_user AS user');
    const row = result.rows[0];
    console.log('✅ Conexão bem-sucedida ao PostgreSQL!');
    console.log(`Banco: ${row.database}`);
    console.log(`Usuário: ${row.user}`);
    console.log(`Hora atual do servidor: ${row.now}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Falha na conexão com o PostgreSQL:');
    console.error(error.message || error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

testConnection();
