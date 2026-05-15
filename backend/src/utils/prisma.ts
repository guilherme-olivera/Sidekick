import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

// 1. Configura a conexão bruta
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

// 2. Cria o adaptador V7
const adapter = new PrismaPg(pool);

// 3. Instância global para evitar warnings do ts-node-dev
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ 
    adapter,
    log: ['query', 'info', 'warn', 'error']
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;


// import "dotenv/config";
// import { PrismaClient } from '@prisma/client';

// const prisma = new PrismaClient();

// export { prisma };


