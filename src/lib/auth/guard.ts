import { redirect } from "next/navigation";
import { readSession, type SessionUser } from "./session";

/** No usable session: not signed in, or the token expired or was tampered with. */
export class UnauthorizedError extends Error {}

/** Signed in, but not allowed to do this. */
export class ForbiddenError extends Error {}

/**
 * The single server-side gate. Every protected route handler and server
 * component calls one of these; hiding a link in the UI is not access control.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await readSession();
  if (!user) throw new UnauthorizedError("Sign in to continue");

  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new ForbiddenError("Administrator access required");
  }

  return user;
}

/**
 * Page equivalent of requireUser. Pages are not wrapped by withRoute, so a
 * thrown error would render the error boundary instead of sending someone to
 * sign in.
 *
 * This is a convenience, not a boundary: every page still queries with an
 * ownership filter, and the API guards above remain the real gate.
 */
export async function requirePageUser(): Promise<SessionUser> {
  const user = await readSession();
  if (!user) redirect("/login");

  return user;
}

/** Sends a signed-in non-administrator away rather than showing an error. */
export async function requirePageAdmin(): Promise<SessionUser> {
  const user = await requirePageUser();
  if (user.role !== "ADMIN") redirect("/quotes");

  return user;
}
