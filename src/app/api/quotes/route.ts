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
