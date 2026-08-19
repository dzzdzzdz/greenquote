import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/auth/guard";
import { formatEuros } from "@/lib/money";
import type { Offer, RiskBand } from "@/lib/pricing";
import { describeRiskBand, findVisibleQuote, formatApr } from "@/lib/quotes";

export default async function QuotePage({ params }: PageProps<"/quotes/[id]">) {
  const user = await requirePageUser();
  const { id } = await params;

  // The same rule the API applies. Two routes to the same row, one definition
  // of who may read it.
  const quote = await findVisibleQuote(id, user);
  if (!quote) notFound();

  const offers = quote.offers as Offer[];
  const riskBand = quote.riskBand as RiskBand;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 p-6">
      <h1 className="text-2xl font-semibold">Your pre-qualification</h1>
      <p className="mt-1 text-sm text-neutral-600">
        {quote.address} · {quote.systemSizeKw} kW ·{" "}
        {quote.monthlyConsumptionKwh} kWh per month
      </p>

      <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-neutral-300 p-4">
          <dt className="text-sm text-neutral-600">System price</dt>
          <dd className="mt-1 text-xl font-semibold">
            {formatEuros(quote.systemPriceCents)}
          </dd>
        </div>

        <div className="rounded-lg border border-neutral-300 p-4">
          <dt className="text-sm text-neutral-600">Risk band</dt>
          <dd className="mt-1 text-xl font-semibold">
            {riskBand}
            <span className="ml-2 text-sm font-normal text-neutral-600">
              {describeRiskBand(riskBand)}
            </span>
          </dd>
        </div>

        <div className="rounded-lg border border-neutral-300 p-4">
          <dt className="text-sm text-neutral-600">Amount financed</dt>
          <dd className="mt-1 text-xl font-semibold">
            {formatEuros(quote.principalCents)}
          </dd>
          {quote.downPaymentCents > 0 ? (
            <p className="mt-1 text-sm text-neutral-600">
              after {formatEuros(quote.downPaymentCents)} down
            </p>
          ) : null}
        </div>
      </dl>

      <h2 className="mt-8 text-lg font-semibold">Installment offers</h2>

      {quote.principalCents === 0 ? (
        <p className="mt-2 text-sm text-neutral-600">
          The down payment covers the system in full, so there is nothing to
          finance.
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {offers.map((offer) => (
            <li
              key={offer.termYears}
              className="rounded-lg border border-neutral-300 p-4"
            >
              <p className="text-sm text-neutral-600">
                {offer.termYears} years · {formatApr(offer.aprBps)} APR
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {formatEuros(offer.monthlyPaymentCents)}
                <span className="text-base font-normal text-neutral-600">
                  {" "}
                  / month
                </span>
              </p>
              <p className="mt-2 text-sm text-neutral-600">
                {formatEuros(offer.monthlyPaymentCents * offer.termYears * 12)}{" "}
                total
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
