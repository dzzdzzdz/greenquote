import { requireUser } from "@/lib/auth/guard";
import { NotFoundError, withRoute } from "@/lib/http";
import { findVisibleQuote, toQuoteResponse } from "@/lib/quotes";

export const GET = withRoute(
  async (_request, { params }: RouteContext<"/api/quotes/[id]">) => {
    const user = await requireUser();
    const { id } = await params;

    // Returns null both for a missing quote and for one belonging to someone
    // else, so this answers 404 either way. A 403 here would confirm the id is
    // real, letting a caller map out which quotes exist without reading any.
    const quote = await findVisibleQuote(id, user);
    if (!quote) throw new NotFoundError("Quote not found");

    return Response.json({ quote: toQuoteResponse(quote) });
  },
);
