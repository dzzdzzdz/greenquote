import pino from "pino";

/**
 * One JSON object per line on stdout. Nothing here writes or rotates files:
 * the platform collects the stream (docker logs, Cloud Logging).
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  formatters: {
    // Log "info" rather than 30, so the output is readable without a decoder.
    level: (label) => ({ level: label }),
  },
  // Credentials must never reach the log stream, however they are nested.
  redact: [
    "password",
    "passwordHash",
    "*.password",
    "*.passwordHash",
    "req.headers.cookie",
    "headers.cookie",
  ],
});
