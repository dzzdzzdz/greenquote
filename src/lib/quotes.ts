import type { QuoteModel } from "@/generated/prisma/models";
import type { SessionUser } from "./auth/session";
import { prisma } from "./db";
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

/**
 * One definition of "may this person see this quote", shared by the API and the
 * results page. Both reach the same row by different routes, so the rule cannot
 * live in only one of them.
 *
 * Returns null for a quote that is missing and for one that is merely not
 * yours, so neither caller can accidentally distinguish the two.
 */
export async function findVisibleQuote(
  id: string,
  user: SessionUser,
): Promise<QuoteModel | null> {
  const quote = await prisma.quote.findUnique({ where: { id } });
  if (!quote) return null;

  const mayRead = quote.userId === user.id || user.role === "ADMIN";

  return mayRead ? quote : null;
}

const RISK_BAND_SUMMARY: Record<RiskBand, string> = {
  A: "Best available rate",
  B: "Standard rate",
  C: "Higher rate",
};

export function describeRiskBand(band: RiskBand): string {
  return RISK_BAND_SUMMARY[band];
}

/** 690 basis points reads as "6.9%". */
export function formatApr(aprBps: number): string {
  return `${(aprBps / 100).toFixed(1)}%`;
}
