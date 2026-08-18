/**
 * Every monetary value in this app is an integer number of cents.
 *
 * Floating point cannot represent most decimal fractions exactly, and the
 * error compounds: amortising a loan runs the same arithmetic 180 times.
 * Integers stay exact, so rounding happens once, deliberately, at the edges.
 */

const CENTS_PER_EURO = 100;

export function eurosToCents(euros: number): number {
  return Math.round(euros * CENTS_PER_EURO);
}

export function centsToEuros(cents: number): number {
  return cents / CENTS_PER_EURO;
}

const euroFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

export function formatEuros(cents: number): string {
  return euroFormatter.format(centsToEuros(cents));
}
