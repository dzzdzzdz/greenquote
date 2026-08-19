import Link from "next/link";
import { QuotesTable } from "@/components/QuotesTable";
import { requirePageUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";

export default async function MyQuotesPage() {
  const user = await requirePageUser();

  // Scoped to the signed-in user by the query itself, not by filtering after.
  const quotes = await prisma.quote.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">My quotes</h1>
        <Link
          href="/quotes/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white"
        >
          New quote
        </Link>
      </div>

      <QuotesTable quotes={quotes} />
    </main>
  );
}
