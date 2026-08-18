import { hashPassword } from "../src/lib/auth/password";
import { prisma } from "../src/lib/db";
import { eurosToCents } from "../src/lib/money";
import { calculateQuote } from "../src/lib/pricing";

/** Development credentials only, documented in the README. */
const SEED_PASSWORD = "Password123!";

const SEED_USERS = {
  admin: {
    email: "admin@test.com",
    fullName: "Ada Admin",
    role: "ADMIN",
  },
  customer: {
    email: "user@test.com",
    fullName: "Ulrich User",
    role: "USER",
  },
};

/** One sample per risk band, so every band renders somewhere in the UI. */
const SAMPLE_QUOTES = [
  {
    owner: "customer" as const,
    address: "12 Rue du Soleil, 75011 Paris",
    monthlyConsumptionKwh: 450,
    systemSizeKw: 5,
    downPaymentCents: eurosToCents(1000),
  },
  {
    owner: "customer" as const,
    address: "8 Avenue des Champs, 69003 Lyon",
    monthlyConsumptionKwh: 300,
    systemSizeKw: 8,
    downPaymentCents: 0,
  },
  {
    owner: "admin" as const,
    address: "44 Quai de la Marne, 33000 Bordeaux",
    monthlyConsumptionKwh: 180,
    systemSizeKw: 4,
    downPaymentCents: eurosToCents(500),
  },
];

async function main() {
  const passwordHash = await hashPassword(SEED_PASSWORD);

  const users = {
    admin: await prisma.user.upsert({
      where: { email: SEED_USERS.admin.email },
      update: {},
      create: { ...SEED_USERS.admin, passwordHash },
    }),
    customer: await prisma.user.upsert({
      where: { email: SEED_USERS.customer.email },
      update: {},
      create: { ...SEED_USERS.customer, passwordHash },
    }),
  };

  for (const [index, { owner, ...submitted }] of SAMPLE_QUOTES.entries()) {
    const user = users[owner];
    const data = {
      userId: user.id,
      fullName: user.fullName,
      email: user.email,
      ...submitted,
      ...calculateQuote(submitted),
    };

    // Deterministic ids keep re-seeding idempotent without deleting anything
    // a developer created by hand.
    await prisma.quote.upsert({
      where: { id: `seed-quote-${index}` },
      update: data,
      create: { id: `seed-quote-${index}`, ...data },
    });
  }

  console.log(
    `Seeded ${Object.keys(users).length} users and ${SAMPLE_QUOTES.length} quotes`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
