import { beforeEach, describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as me } from "@/app/api/auth/me/route";
import { POST as register } from "@/app/api/auth/register/route";
import { prisma } from "@/lib/db";
import { cookieJar } from "../helpers/cookie-jar";

const BASE = "http://localhost";

function post(path: string, body: unknown): Request {
  return new Request(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const credentials = {
  fullName: "Nina New",
  email: "nina@test.com",
  password: "correct-horse-battery",
};

beforeEach(async () => {
  await prisma.user.deleteMany();
  cookieJar.clear();
});

describe("the sign-in lifecycle", () => {
  it("registers, stays signed in, and signs out", async () => {
    const registered = await register(
      post("/api/auth/register", credentials),
      {},
    );
    expect(registered.status).toBe(201);

    // Registering signs you in, so the session cookie exists already.
    expect(
      await (
        await me(new Request(`${BASE}/api/auth/me`), {})
      ).status,
    ).toBe(200);

    expect((await logout(post("/api/auth/logout", {}), {})).status).toBe(204);

    const afterLogout = await me(new Request(`${BASE}/api/auth/me`), {});
    expect(afterLogout.status).toBe(401);

    const loggedIn = await login(
      post("/api/auth/login", {
        email: credentials.email,
        password: credentials.password,
      }),
      {},
    );
    expect(loggedIn.status).toBe(200);

    const identified = await me(new Request(`${BASE}/api/auth/me`), {});
    expect(identified.status).toBe(200);
    await expect(identified.json()).resolves.toMatchObject({
      user: { email: credentials.email, fullName: "Nina New", role: "USER" },
    });
  });

  it("stores a hash, never the password", async () => {
    await register(post("/api/auth/register", credentials), {});

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: credentials.email },
    });
    expect(user.passwordHash).not.toContain(credentials.password);
    expect(user.passwordHash).toMatch(/^\$2[aby]\$/);
  });
});
