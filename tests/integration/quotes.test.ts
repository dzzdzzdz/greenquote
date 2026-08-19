import { beforeEach, describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as register } from "@/app/api/auth/register/route";
import { GET as getQuote } from "@/app/api/quotes/[id]/route";
import { GET as listQuotes, POST as createQuote } from "@/app/api/quotes/route";
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

const quoteInput = {
  fullName: "Ulrich User",
  email: "user@test.com",
  address: "5 Rue Test, Paris",
  monthlyConsumptionKwh: 450,
  systemSizeKw: 5,
};

/** Registering signs the caller in, which is how each test picks an identity. */
async function signUp(email: string, role: "USER" | "ADMIN" = "USER") {
  cookieJar.clear();
  await register(
    post("/api/auth/register", {
      fullName: `Test ${email}`,
      email,
      password: "a-long-enough-password",
    }),
    {},
  );

  if (role === "ADMIN") {
    await prisma.user.update({ where: { email }, data: { role: "ADMIN" } });
    // The role lives in the token, so re-issue it after the change.
    cookieJar.clear();
    await login(
      post("/api/auth/login", { email, password: "a-long-enough-password" }),
      {},
    );
  }

  return prisma.user.findUniqueOrThrow({ where: { email } });
}

function list(query = ""): Promise<Response> {
  return listQuotes(new Request(`${BASE}/api/quotes${query}`), {});
}

function fetchOne(id: string): Promise<Response> {
  return getQuote(new Request(`${BASE}/api/quotes/${id}`), {
    params: Promise.resolve({ id }),
  });
}

beforeEach(async () => {
  await prisma.quote.deleteMany();
  await prisma.user.deleteMany();
  cookieJar.clear();
});

describe("POST /api/quotes", () => {
  it("returns the inputs, the derived values and three offers", async () => {
    await signUp("owner@test.com");

    const response = await createQuote(post("/api/quotes", quoteInput), {});
    expect(response.status).toBe(201);

    const { quote } = await response.json();
    expect(quote.inputs).toMatchObject({
      systemSizeKw: 5,
      downPaymentCents: 0,
    });
    expect(quote.derived).toEqual({
      systemPriceCents: 600_000,
      principalCents: 600_000,
      riskBand: "A",
      aprBps: 690,
    });
    expect(
      quote.offers.map((offer: { termYears: number }) => offer.termYears),
    ).toEqual([5, 10, 15]);
  });

  it("takes ownership from the session, not the request body", async () => {
    const victim = await signUp("victim@test.com");
    await signUp("attacker@test.com");

    const response = await createQuote(
      post("/api/quotes", { ...quoteInput, userId: victim.id }),
      {},
    );
    expect(response.status).toBe(201);

    const { id } = (await response.json()).quote;
    const stored = await prisma.quote.findUniqueOrThrow({ where: { id } });
    expect(stored.userId).not.toBe(victim.id);
  });

  it("rejects a down payment above the system price", async () => {
    await signUp("owner@test.com");

    const response = await createQuote(
      post("/api/quotes", { ...quoteInput, downPaymentCents: 99_900_000 }),
      {},
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "INVALID_INPUT" },
    });
  });

  it("rejects invalid input with per-field messages", async () => {
    await signUp("owner@test.com");

    const response = await createQuote(
      post("/api/quotes", { ...quoteInput, systemSizeKw: -1 }),
      {},
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details[0].field).toBe("systemSizeKw");
  });
});

describe("GET /api/quotes", () => {
  it("returns only the caller's own quotes", async () => {
    await signUp("first@test.com");
    await createQuote(post("/api/quotes", quoteInput), {});

    await signUp("second@test.com");
    await createQuote(post("/api/quotes", quoteInput), {});

    const { quotes } = await (await list()).json();
    expect(quotes).toHaveLength(1);
  });

  it("returns every quote to an administrator, and filters by owner", async () => {
    const first = await signUp("first@test.com");
    await createQuote(post("/api/quotes", quoteInput), {});
    await signUp("second@test.com");
    await createQuote(post("/api/quotes", quoteInput), {});

    await signUp("boss@test.com", "ADMIN");
    expect((await (await list()).json()).quotes).toHaveLength(2);

    const filtered = await (await list(`?userId=${first.id}`)).json();
    expect(filtered.quotes).toHaveLength(1);
    expect(filtered.quotes[0].inputs.email).toBe(quoteInput.email);
  });
});

describe("GET /api/quotes/:id", () => {
  it("returns the caller's own quote", async () => {
    await signUp("owner@test.com");
    const created = await (
      await createQuote(post("/api/quotes", quoteInput), {})
    ).json();

    const response = await fetchOne(created.quote.id);
    expect(response.status).toBe(200);
  });

  it("hides another user's quote behind the same 404 as a missing one", async () => {
    await signUp("owner@test.com");
    const created = await (
      await createQuote(post("/api/quotes", quoteInput), {})
    ).json();

    await signUp("stranger@test.com");

    const forbidden = await fetchOne(created.quote.id);
    const missing = await fetchOne("no-such-quote");

    expect(forbidden.status).toBe(404);
    expect(missing.status).toBe(404);
    // Identical bodies: the endpoint never confirms that an id exists.
    expect(await forbidden.json()).toEqual(await missing.json());
  });

  it("lets an administrator read someone else's quote", async () => {
    await signUp("owner@test.com");
    const created = await (
      await createQuote(post("/api/quotes", quoteInput), {})
    ).json();

    await signUp("boss@test.com", "ADMIN");

    expect((await fetchOne(created.quote.id)).status).toBe(200);
  });
});

describe("without a session", () => {
  it("refuses to create, list or read", async () => {
    await signUp("owner@test.com");
    const created = await (
      await createQuote(post("/api/quotes", quoteInput), {})
    ).json();

    cookieJar.clear();

    expect(
      (await createQuote(post("/api/quotes", quoteInput), {})).status,
    ).toBe(401);
    expect((await list()).status).toBe(401);
    expect((await fetchOne(created.quote.id)).status).toBe(401);
  });
});
