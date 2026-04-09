import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 requires an adapter for direct DB connections. PrismaPg wraps
// node-postgres and reads the connection string from DATABASE_URL.
const adapter = new PrismaPg(process.env.DATABASE_URL!);

// Singleton pattern — reuse in dev to avoid exhausting connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
