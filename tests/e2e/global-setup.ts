import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

export const E2E_DATABASE_URL = "file:./e2e.db";

/**
 * A database of its own, built from the real migrations and the real seed, so
 * an end-to-end run never touches development data and always starts from a
 * known state.
 */
export default function globalSetup() {
  rmSync("e2e.db", { force: true });

  const env = { ...process.env, DATABASE_URL: E2E_DATABASE_URL };
  execSync("npx prisma migrate deploy", { env, stdio: "pipe" });
  execSync("npx prisma db seed", { env, stdio: "pipe" });
}
