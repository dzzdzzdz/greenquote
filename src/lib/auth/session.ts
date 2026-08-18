import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";

export const ROLES = ["USER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
};

const COOKIE_NAME = "gq_session";

/**
 * Bounds how long a changed role stays stale: the token carries the role, so a
 * demoted admin keeps it until their token expires.
 */
const SESSION_TTL_SECONDS = 60 * 60 * 24;

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");

  return new TextEncoder().encode(secret);
}

export function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({
    email: user.email,
    fullName: user.fullName,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

/** Returns null for anything untrusted: bad signature, expired, malformed. */
export async function verifySession(
  token: string,
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });

    const { sub, email, fullName, role } = payload;
    if (
      typeof sub !== "string" ||
      typeof email !== "string" ||
      typeof fullName !== "string" ||
      !ROLES.includes(role as Role)
    ) {
      return null;
    }

    return { id: sub, email, fullName, role: role as Role };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function readSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  return verifySession(token);
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}
