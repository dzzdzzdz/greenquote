import { existsSync } from "node:fs";
import { defineConfig, env } from "prisma/config";

// Prisma 7 no longer reads .env itself. Next.js loads it for the app, so this
// covers CLI commands only. An explicit DATABASE_URL wins, which is how the
// test harness points migrations at its own database, and deployments set real
// environment variables and have no .env file at all.
if (!process.env.DATABASE_URL && existsSync(".env")) {
  process.loadEnvFile(".env");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
