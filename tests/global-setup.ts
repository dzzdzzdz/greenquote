import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

const DATABASE_URL = "file:./test.db";

/** Runs once per suite: a throwaway database built from the real migrations. */
export default function setup() {
  rmSync("test.db", { force: true });

  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL },
    stdio: "pipe",
  });
}
