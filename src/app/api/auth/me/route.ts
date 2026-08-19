import { requireUser } from "@/lib/auth/guard";
import { withRoute } from "@/lib/http";

/** Reads the session token, not the database: the role is as of token issue. */
export const GET = withRoute(async () => {
  const user = await requireUser();

  return Response.json({ user });
});
