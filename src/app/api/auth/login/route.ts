import { verifyPassword } from "@/lib/auth/password";
import { setSessionCookie, signSession, type Role } from "@/lib/auth/session";
import { UnauthorizedError } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { withRoute } from "@/lib/http";
import { loginSchema } from "@/lib/validation";

/**
 * A real bcrypt hash of a value nobody knows, compared against when no account
 * matches. Without it a missing account answers in about a millisecond while a
 * wrong password takes the full cost of bcrypt, and that difference tells an
 * attacker which addresses are registered - which is exactly what the single
 * generic error message is there to hide.
 */
const DUMMY_HASH =
  "$2b$10$CwTycUXWue0Thq9StjUM0uJ8.kWuHRlLDKB2G0dPHwLfaGRhkGXNq";

export const POST = withRoute(async (request) => {
  const { email, password } = loginSchema.parse(await request.json());

  const user = await prisma.user.findUnique({ where: { email } });
  const passwordMatches = await verifyPassword(
    password,
    user?.passwordHash ?? DUMMY_HASH,
  );

  if (!user || !passwordMatches) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const token = await signSession({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role as Role,
  });
  await setSessionCookie(token);

  return Response.json({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    },
  });
});
