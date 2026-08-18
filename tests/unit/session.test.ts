import { SignJWT } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import {
  signSession,
  verifySession,
  type SessionUser,
} from "@/lib/auth/session";

const SECRET = "test-secret-at-least-32-bytes-long!!";

const user: SessionUser = {
  id: "user_1",
  email: "ada@test.com",
  fullName: "Ada Admin",
  role: "ADMIN",
};

function encode(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

beforeAll(() => {
  process.env.AUTH_SECRET = SECRET;
});

describe("signSession / verifySession", () => {
  it("round-trips the session user", async () => {
    const token = await signSession(user);

    expect(await verifySession(token)).toEqual(user);
  });

  it("rejects a tampered token", async () => {
    const token = await signSession(user);
    // Flip the last character of the signature.
    const tampered = token.slice(0, -1) + (token.at(-1) === "A" ? "B" : "A");

    expect(await verifySession(tampered)).toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    const forged = await new SignJWT({ ...user, role: "ADMIN" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(user.id)
      .setExpirationTime("1h")
      .sign(encode("a-completely-different-secret-value!!"));

    expect(await verifySession(forged)).toBeNull();
  });

  it("rejects an expired token", async () => {
    const expired = await new SignJWT({
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(user.id)
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
      .sign(encode(SECRET));

    expect(await verifySession(expired)).toBeNull();
  });

  it("rejects a token whose payload is missing fields", async () => {
    const incomplete = await new SignJWT({ email: user.email })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(user.id)
      .setExpirationTime("1h")
      .sign(encode(SECRET));

    expect(await verifySession(incomplete)).toBeNull();
  });

  it("rejects a token with an unknown role", async () => {
    const escalated = await new SignJWT({
      email: user.email,
      fullName: user.fullName,
      role: "SUPERADMIN",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(user.id)
      .setExpirationTime("1h")
      .sign(encode(SECRET));

    expect(await verifySession(escalated)).toBeNull();
  });
});
