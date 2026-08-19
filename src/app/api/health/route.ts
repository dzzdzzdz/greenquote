import { withRoute } from "@/lib/http";

/**
 * Liveness only: 200 for as long as the process can serve a request.
 *
 * It deliberately does not touch the database. A liveness probe that fails
 * during a brief database outage restarts every otherwise healthy container,
 * turning a recoverable blip into a restart storm. Readiness - "should traffic
 * come here" - is the check that belongs on dependencies.
 */
export const GET = withRoute(async () => {
  return Response.json({
    status: "ok",
    uptimeSeconds: Math.round(process.uptime()),
  });
});
