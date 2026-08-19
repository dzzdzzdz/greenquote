import { clearSessionCookie } from "@/lib/auth/session";
import { withRoute } from "@/lib/http";

// No session check: logging out when already logged out is not an error, and
// POST rather than GET so a stray <img> tag cannot end someone's session.
export const POST = withRoute(async () => {
  await clearSessionCookie();

  return new Response(null, { status: 204 });
});
