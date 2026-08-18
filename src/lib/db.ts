import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
}

// Next.js re-evaluates modules on every edit in development, which would open a
// fresh connection pool each time. globalThis is process-level, so it survives
// the reload. Production never hot-reloads, so the cache would only leak there.
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
