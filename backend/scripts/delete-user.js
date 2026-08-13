const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const USER_ID_TO_DELETE = "cmsdvn8p100002ejrafaj7tou";

async function main() {
  console.log(`=== DELETANDO USUÁRIO: ${USER_ID_TO_DELETE} ===`);

  try {
    // Busca se o usuário existe
    const user = await prisma.user.findUnique({
      where: { id: USER_ID_TO_DELETE }
    });

    if (!user) {
      console.log(`❌ Usuário com ID "${USER_ID_TO_DELETE}" não foi encontrado.`);
      return;
    }

    console.log(`Usuário encontrado: ${user.name} (${user.email})`);

    // Deleta o usuário. Como temos onDelete: Cascade no banco,
    // todas as tabelas relacionadas (treinos, perfil, humor, cotas) serão limpas automaticamente.
    await prisma.user.delete({
      where: { id: USER_ID_TO_DELETE }
    });

    console.log(`✅ Usuário "${user.email}" e todos os seus dados vinculados foram deletados com sucesso!`);
  } catch (error) {
    console.error("❌ Erro ao deletar o usuário:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
