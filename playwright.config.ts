import { defineConfig } from "@playwright/test";
import { E2E_DATABASE_URL } from "./tests/e2e/global-setup";

const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  // Vitest owns tests/**/*.test.ts; Playwright owns *.spec.ts. One command each.
  testMatch: "**/*.spec.ts",
  globalSetup: "./tests/e2e/global-setup.ts",
  use: { baseURL: `http://localhost:${PORT}` },
  // The real journey depends on cookies surviving redirects, so retrying a
  // flake would hide exactly the kind of bug this suite exists to catch.
  retries: 0,
  webServer: {
    // A production build, not next dev: it is what actually ships, and Next 16
    // allows only one dev server per project, so this leaves yours alone.
    command: `npx next build && npx next start --port ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      DATABASE_URL: E2E_DATABASE_URL,
      AUTH_SECRET: "end-to-end-test-secret-32-bytes-min",
    },
  },
});
