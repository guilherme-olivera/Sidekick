require("dotenv").config();
const { Client } = require("pg");

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL is missing in .env");
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();

    const tables = [
      "users",
      "workouts",
      "mood_checks",
      "user_profiles",
      "usage_quotas",
      "calendar_events",
      "vip_codes",
      "password_reset_tokens"
    ];

    console.log("🔒 Ativando Row Level Security (RLS) no Supabase...");

    for (const table of tables) {
      try {
        await client.query(`ALTER TABLE "public"."${table}" ENABLE ROW LEVEL SECURITY;`);
        console.log(`✅ RLS ativado na tabela public.${table}`);
      } catch (err) {
        console.error(`⚠️ Erro ao ativar RLS na tabela public.${table}:`, err.message);
      }
    }
  } catch (err) {
    console.error("Erro de conexão ao banco de dados:", err);
  } finally {
    await client.end();
    console.log("🎉 Processo de segurança do Supabase concluído!");
  }
}

main();
