import { QuotesTable } from "@/components/QuotesTable";
import { requirePageAdmin } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";

export default async function AdminQuotesPage({
  searchParams,
}: PageProps<"/admin/quotes">) {
  // Redirects a non-administrator. The API enforces the same rule separately.
  await requirePageAdmin();

  const { search } = await searchParams;
  const term = typeof search === "string" ? search.trim() : "";

  const quotes = await prisma.quote.findMany({
    where: term
      ? {
          OR: [{ email: { contains: term } }, { fullName: { contains: term } }],
        }
      : {},
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 p-6">
      <h1 className="text-2xl font-semibold">All quotes</h1>

      {/* A plain GET form: the filter lives in the URL, so it survives a
          reload, can be shared, and needs no client-side JavaScript. */}
      <form method="GET" className="mt-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="search" className="text-sm font-medium">
            Filter by customer
          </label>
          <input
            id="search"
            name="search"
            type="search"
            defaultValue={term}
            placeholder="Name or email"
            className="rounded-md border border-neutral-400 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-neutral-700 focus:ring-offset-1"
          />
        </div>

        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-white"
        >
          Filter
        </button>
      </form>

      <p aria-live="polite" className="mt-4 text-sm text-neutral-600">
        {quotes.length} quote{quotes.length === 1 ? "" : "s"}
        {term ? ` matching "${term}"` : ""}
      </p>

      <QuotesTable quotes={quotes} showOwner />
    </main>
  );
}
