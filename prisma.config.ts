import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// Prisma 7 no longer reads .env itself. Next.js loads it for the app, so this
// covers CLI commands only. An explicit DATABASE_URL wins, which is how the
// test harness points migrations at its own database, and deployments set real
// environment variables and have no .env file at all.
if (!process.env.DATABASE_URL && existsSync(".env")) {
  process.loadEnvFile(".env");
}

// Only migrate and seed need a connection. `prisma generate` reads the schema
// alone, and it runs from postinstall - before a fresh clone has copied
// .env.example. Demanding a URL here would fail `npm install` itself, so the
// datasource is declared only when one exists and migrate reports its absence.
const url = process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  ...(url ? { datasource: { url } } : {}),
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
