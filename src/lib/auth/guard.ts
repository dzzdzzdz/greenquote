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
