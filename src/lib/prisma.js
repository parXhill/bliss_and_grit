import { PrismaClient } from '@prisma/client';

// Configure Prisma with options to handle SSL issues
const createPrismaClient = () => {
  return new PrismaClient({
    datasources: {
      db: {
        // Prefer the non-pooling URL if available, otherwise fall back to DATABASE_URL
        url: process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL
      }
    },
    log: ['error', 'warn']
  });
};

// Keep existing singleton pattern
let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = createPrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = createPrismaClient();
  }
  prisma = global.prisma;
}

export default prisma;