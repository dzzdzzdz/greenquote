import type { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { withRoute } from "@/lib/http";
import { calculateQuote } from "@/lib/pricing";
import { toQuoteResponse } from "@/lib/quotes";
import { quoteInputSchema } from "@/lib/validation";

export const POST = withRoute(async (request) => {
  const user = await requireUser();
  const input = quoteInputSchema.parse(await request.json());

  // Throws when the down payment exceeds the system price, which the HTTP
  // layer turns into a 400.
  const calculation = calculateQuote(input);

  const quote = await prisma.quote.create({
    data: {
      // Ownership comes from the verified session, never from the payload:
      // otherwise a caller could create quotes belonging to someone else.
      userId: user.id,
      ...input,
      downPaymentCents: input.downPaymentCents ?? 0,
      ...calculation,
    },
  });

  return Response.json({ quote: toQuoteResponse(quote) }, { status: 201 });
});

/** Caps an unbounded admin listing. Real pagination is a follow-up. */
const MAX_QUOTES = 100;

export const GET = withRoute(async (request) => {
  const user = await requireUser();
  const params = new URL(request.url).searchParams;
  const search = params.get("search")?.trim();
  const userId = params.get("userId")?.trim();

  // Own quotes unless something explicitly widens the scope, and only an
  // administrator can widen it. Building the filter the other way round - from
  // the query string, then checking - is how listings leak.
  let where: Prisma.QuoteWhereInput = { userId: user.id };

  if (user.role === "ADMIN") {
    if (userId) {
      where = { userId };
    } else if (search) {
      // Prisma compiles contains to LIKE. SQLite folds case for ASCII only,
      // so "ulrich" finds "Ulrich" but "emile" never finds "Émile". Postgres
      // folds nothing, so the same code is fully case-sensitive there and
      // would need mode: "insensitive". See the README.
      where = {
        OR: [
          { email: { contains: search } },
          { fullName: { contains: search } },
        ],
      };
    } else {
      where = {};
    }
  }

  const quotes = await prisma.quote.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: MAX_QUOTES,
  });

  return Response.json({ quotes: quotes.map(toQuoteResponse) });
});
