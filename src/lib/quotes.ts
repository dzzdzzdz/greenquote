import type { QuoteModel } from "@/generated/prisma/models";
import type { Offer, RiskBand } from "./pricing";

/**
 * The public shape of a quote, grouped as the brief describes it: what was
 * submitted, what we derived, and the offers. Defined once so every endpoint
 * that returns a quote returns the same thing, and so the column layout stays
 * an implementation detail rather than the contract.
 */
export type QuoteResponse = {
  id: string;
  createdAt: string;
  inputs: {
    fullName: string;
    email: string;
    address: string;
    monthlyConsumptionKwh: number;
    systemSizeKw: number;
    downPaymentCents: number;
  };
  derived: {
    systemPriceCents: number;
    principalCents: number;
    riskBand: RiskBand;
    aprBps: number;
  };
  offers: Offer[];
};

export function toQuoteResponse(quote: QuoteModel): QuoteResponse {
  return {
    id: quote.id,
    createdAt: quote.createdAt.toISOString(),
    inputs: {
      fullName: quote.fullName,
      email: quote.email,
      address: quote.address,
      monthlyConsumptionKwh: quote.monthlyConsumptionKwh,
      systemSizeKw: quote.systemSizeKw,
      downPaymentCents: quote.downPaymentCents,
    },
    derived: {
      systemPriceCents: quote.systemPriceCents,
      principalCents: quote.principalCents,
      riskBand: quote.riskBand as RiskBand,
      aprBps: quote.aprBps,
    },
    // A Json column reads back untyped. We are the only writer and the shape
    // comes from calculateQuote, so it is asserted rather than re-parsed.
    offers: quote.offers as Offer[],
  };
}
