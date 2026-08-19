import { hashPassword } from "@/lib/auth/password";
import { setSessionCookie, signSession, type Role } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { ConflictError, withRoute } from "@/lib/http";
import { registerSchema } from "@/lib/validation";

export const POST = withRoute(async (request) => {
  const { fullName, email, password } = registerSchema.parse(
    await request.json(),
  );

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ConflictError("An account with that email already exists");
  }

  const user = await prisma.user.create({
    data: { fullName, email, passwordHash: await hashPassword(password) },
  });

  // Registering signs you in: everything the session needs is already here.
  const token = await signSession({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role as Role,
  });
  await setSessionCookie(token);

  return Response.json(
    {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    },
    { status: 201 },
  );
});
