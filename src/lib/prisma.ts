import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Query logging serializes every SQL statement and inflates latency.
    // Keep it opt-in via PRISMA_LOG=1 for debugging; default to errors only.
    log: process.env.PRISMA_LOG === '1' ? ['query', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
