import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { NotFoundError, withRoute } from "@/lib/http";
import { toQuoteResponse } from "@/lib/quotes";

export const GET = withRoute(
  async (_request, { params }: RouteContext<"/api/quotes/[id]">) => {
    const user = await requireUser();
    const { id } = await params;

    const quote = await prisma.quote.findUnique({ where: { id } });

    // A quote you may not see is reported exactly as one that does not exist.
    // Answering 403 here would confirm the id is real, letting a caller map out
    // which quotes exist without being able to read any of them.
    const visible =
      quote && (quote.userId === user.id || user.role === "ADMIN");
    if (!visible) throw new NotFoundError("Quote not found");

    return Response.json({ quote: toQuoteResponse(quote) });
  },
);
