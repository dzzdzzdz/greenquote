import Link from "next/link";
import type { QuoteModel } from "@/generated/prisma/models";
import { formatEuros } from "@/lib/money";
import type { RiskBand } from "@/lib/pricing";
import { describeRiskBand } from "@/lib/quotes";

/**
 * Shared by the personal and administrative listings. The owner column is the
 * only difference, so it is a prop rather than a second component.
 */
export function QuotesTable({
  quotes,
  showOwner = false,
}: {
  quotes: QuoteModel[];
  showOwner?: boolean;
}) {
  if (quotes.length === 0) {
    return <p className="mt-6 text-neutral-600">No quotes yet.</p>;
  }

  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-300">
            <th scope="col" className="py-2 pr-3 font-medium">
              Date
            </th>
            {showOwner ? (
              <th scope="col" className="py-2 pr-3 font-medium">
                Customer
              </th>
            ) : null}
            <th scope="col" className="py-2 pr-3 font-medium">
              System size
            </th>
            <th scope="col" className="py-2 pr-3 font-medium">
              Price
            </th>
            <th scope="col" className="py-2 pr-3 font-medium">
              Band
            </th>
            <th scope="col" className="py-2 font-medium">
              <span className="sr-only">Details</span>
            </th>
          </tr>
        </thead>

        <tbody>
          {quotes.map((quote) => (
            <tr key={quote.id} className="border-b border-neutral-200">
              <td className="py-2 pr-3 whitespace-nowrap">
                <time dateTime={quote.createdAt.toISOString()}>
                  {quote.createdAt.toLocaleDateString("en-GB")}
                </time>
              </td>
              {showOwner ? (
                <td className="py-2 pr-3">
                  {quote.fullName}
                  <span className="hidden text-neutral-600 sm:block">
                    {quote.email}
                  </span>
                </td>
              ) : null}
              <td className="py-2 pr-3">{quote.systemSizeKw} kW</td>
              <td className="py-2 pr-3">
                {formatEuros(quote.systemPriceCents)}
              </td>
              <td className="py-2 pr-3">
                {quote.riskBand}
                {/* The gloss is the widest column on a phone, and the letter
                    alone carries the meaning once you have seen it once. */}
                <span className="hidden text-neutral-600 sm:block">
                  {describeRiskBand(quote.riskBand as RiskBand)}
                </span>
              </td>
              <td className="py-2">
                <Link href={`/quotes/${quote.id}`} className="underline">
                  View
                  {/* Names the row for a screen reader jumping link to link. */}
                  <span className="sr-only">
                    {" "}
                    quote from {quote.createdAt.toLocaleDateString("en-GB")}
                  </span>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
