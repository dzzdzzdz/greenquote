import { eurosToCents } from "./money";

/** Raised when inputs are self-contradictory; the API maps this to a 400. */
export class InvalidQuoteInputError extends Error {}

export type RiskBand = "A" | "B" | "C";

export type Offer = {
  termYears: number;
  aprBps: number;
  principalCents: number;
  monthlyPaymentCents: number;
};

export type AmortizationRow = {
  month: number;
  paymentCents: number;
  interestCents: number;
  principalCents: number;
  balanceCents: number;
};

export type QuoteCalculation = {
  systemPriceCents: number;
  principalCents: number;
  riskBand: RiskBand;
  aprBps: number;
  offers: Offer[];
};

/** Installed cost per kilowatt of capacity, in euros. */
const PRICE_PER_KW_EUROS = 1200;

/** Base annual rate per band, in basis points: 690 bps = 6.9%. */
const APR_BPS_BY_BAND: Record<RiskBand, number> = { A: 690, B: 890, C: 1190 };

const OFFER_TERM_YEARS = [5, 10, 15];

const BPS_PER_UNIT = 10_000;
const MONTHS_PER_YEAR = 12;

export function calculateSystemPriceCents(systemSizeKw: number): number {
  return eurosToCents(systemSizeKw * PRICE_PER_KW_EUROS);
}

export function determineRiskBand(
  monthlyConsumptionKwh: number,
  systemSizeKw: number,
): RiskBand {
  if (monthlyConsumptionKwh >= 400 && systemSizeKw <= 6) return "A";
  if (monthlyConsumptionKwh >= 250) return "B";
  return "C";
}

export function aprBpsForBand(band: RiskBand): number {
  return APR_BPS_BY_BAND[band];
}

/**
 * The fixed monthly payment whose present value equals the principal:
 *
 *   M = P * r / (1 - (1 + r)^-n)
 *
 * The denominator is the geometric series 1/(1+r) + ... + 1/(1+r)^n in closed
 * form, so it collapses to zero when either the rate or the term is zero.
 * Both cases are handled before the division.
 */
export function calculateMonthlyPaymentCents(
  principalCents: number,
  aprBps: number,
  termYears: number,
): number {
  const months = termYears * MONTHS_PER_YEAR;
  if (principalCents === 0 || months === 0) return 0;

  const monthlyRate = aprBps / BPS_PER_UNIT / MONTHS_PER_YEAR;
  if (monthlyRate === 0) return Math.round(principalCents / months);

  const payment =
    (principalCents * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));

  return Math.round(payment);
}

export function calculateQuote(input: {
  monthlyConsumptionKwh: number;
  systemSizeKw: number;
  downPaymentCents?: number;
}): QuoteCalculation {
  const downPaymentCents = input.downPaymentCents ?? 0;
  const systemPriceCents = calculateSystemPriceCents(input.systemSizeKw);

  if (downPaymentCents > systemPriceCents) {
    throw new InvalidQuoteInputError(
      "Down payment cannot exceed the system price",
    );
  }

  const principalCents = systemPriceCents - downPaymentCents;
  const riskBand = determineRiskBand(
    input.monthlyConsumptionKwh,
    input.systemSizeKw,
  );
  const aprBps = aprBpsForBand(riskBand);

  const offers = OFFER_TERM_YEARS.map((termYears) => ({
    termYears,
    aprBps,
    principalCents,
    monthlyPaymentCents: calculateMonthlyPaymentCents(
      principalCents,
      aprBps,
      termYears,
    ),
  }));

  return { systemPriceCents, principalCents, riskBand, aprBps, offers };
}

/**
 * Month by month breakdown of a single offer.
 *
 * Every figure is rounded to whole cents as it is computed, so after n months
 * the remaining balance is a few cents away from zero. The final row absorbs
 * that drift: its principal is whatever is left, and its payment is that
 * principal plus its interest. A borrower's last instalment differs slightly
 * from the rest, which is what real lenders do.
 */
export function buildAmortizationSchedule(
  principalCents: number,
  aprBps: number,
  termYears: number,
): AmortizationRow[] {
  const months = termYears * MONTHS_PER_YEAR;
  if (principalCents === 0 || months === 0) return [];

  const monthlyRate = aprBps / BPS_PER_UNIT / MONTHS_PER_YEAR;
  const payment = calculateMonthlyPaymentCents(
    principalCents,
    aprBps,
    termYears,
  );

  const schedule: AmortizationRow[] = [];
  let balance = principalCents;

  for (let month = 1; month <= months; month += 1) {
    const interest = Math.round(balance * monthlyRate);
    const isFinal = month === months;
    const principal = isFinal ? balance : payment - interest;

    balance -= principal;

    schedule.push({
      month,
      paymentCents: principal + interest,
      interestCents: interest,
      principalCents: principal,
      balanceCents: balance,
    });
  }

  return schedule;
}
