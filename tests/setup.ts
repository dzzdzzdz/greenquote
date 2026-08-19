import { vi } from "vitest";
import { fakeCookieStore } from "./helpers/cookie-jar";

// Set before any module is imported: db.ts reads DATABASE_URL at import time,
// and ES module imports are evaluated before any statement in a test file.
process.env.DATABASE_URL = "file:./test.db";
process.env.AUTH_SECRET = "integration-test-secret-32-bytes-min";
process.env.LOG_LEVEL = "silent";

vi.mock("next/headers", () => ({
  cookies: async () => fakeCookieStore,
}));
