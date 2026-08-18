import { describe, expect, it } from "vitest";
import {
  aprBpsForBand,
  calculateMonthlyPaymentCents,
  calculateQuote,
  calculateSystemPriceCents,
  determineRiskBand,
  InvalidQuoteInputError,
} from "@/lib/pricing";

describe("calculateSystemPriceCents", () => {
  it("charges 1200 EUR per kW", () => {
    expect(calculateSystemPriceCents(5)).toBe(600_000);
  });

  it("handles fractional system sizes", () => {
    expect(calculateSystemPriceCents(6.5)).toBe(780_000);
  });
});

describe("determineRiskBand", () => {
  it("returns A at the inclusive edge of both thresholds", () => {
    expect(determineRiskBand(400, 6)).toBe("A");
  });

  it("drops to B one step outside either A threshold", () => {
    expect(determineRiskBand(399, 6)).toBe("B");
    expect(determineRiskBand(400, 6.1)).toBe("B");
  });

  it("returns B down to 250 kWh regardless of system size", () => {
    expect(determineRiskBand(250, 20)).toBe("B");
  });

  it("returns C below 250 kWh", () => {
    expect(determineRiskBand(249, 20)).toBe("C");
  });
});

describe("aprBpsForBand", () => {
  it("maps each band to its base rate", () => {
    expect(aprBpsForBand("A")).toBe(690);
    expect(aprBpsForBand("B")).toBe(890);
    expect(aprBpsForBand("C")).toBe(1190);
  });
});

describe("calculateMonthlyPaymentCents", () => {
  it("matches a textbook amortisation figure", () => {
    // 100,000 at 6% over 30 years is a widely published 599.55 per month.
    expect(calculateMonthlyPaymentCents(10_000_000, 600, 30)).toBe(59_955);
  });

  it("divides evenly when the loan is interest-free", () => {
    expect(calculateMonthlyPaymentCents(120_000, 0, 10)).toBe(1_000);
  });

  it("is zero when the down payment covered the whole system", () => {
    expect(calculateMonthlyPaymentCents(0, 690, 5)).toBe(0);
  });

  it("is zero for a degenerate term rather than dividing by zero", () => {
    expect(calculateMonthlyPaymentCents(600_000, 690, 0)).toBe(0);
  });

  it("repays more than the principal over the life of the loan", () => {
    const principalCents = 600_000;
    const monthly = calculateMonthlyPaymentCents(principalCents, 690, 5);
    expect(monthly * 60).toBeGreaterThan(principalCents);
  });

  it("lowers the monthly payment as the term lengthens", () => {
    const five = calculateMonthlyPaymentCents(600_000, 690, 5);
    const ten = calculateMonthlyPaymentCents(600_000, 690, 10);
    const fifteen = calculateMonthlyPaymentCents(600_000, 690, 15);
    expect(ten).toBeLessThan(five);
    expect(fifteen).toBeLessThan(ten);
  });
});

describe("calculateQuote", () => {
  it("returns one offer per term, all sharing the band's rate", () => {
    const quote = calculateQuote({
      monthlyConsumptionKwh: 450,
      systemSizeKw: 5,
    });

    expect(quote.systemPriceCents).toBe(600_000);
    expect(quote.principalCents).toBe(600_000);
    expect(quote.riskBand).toBe("A");
    expect(quote.aprBps).toBe(690);
    expect(quote.offers.map((offer) => offer.termYears)).toEqual([5, 10, 15]);
    expect(quote.offers.every((offer) => offer.aprBps === 690)).toBe(true);
  });

  it("subtracts the down payment from the financed principal", () => {
    const quote = calculateQuote({
      monthlyConsumptionKwh: 450,
      systemSizeKw: 5,
      downPaymentCents: 100_000,
    });

    expect(quote.principalCents).toBe(500_000);
  });

  it("quotes a zero loan when the down payment covers the system exactly", () => {
    const quote = calculateQuote({
      monthlyConsumptionKwh: 450,
      systemSizeKw: 5,
      downPaymentCents: 600_000,
    });

    expect(quote.principalCents).toBe(0);
    expect(quote.offers.every((offer) => offer.monthlyPaymentCents === 0)).toBe(
      true,
    );
  });

  it("rejects a down payment larger than the system price", () => {
    expect(() =>
      calculateQuote({
        monthlyConsumptionKwh: 450,
        systemSizeKw: 5,
        downPaymentCents: 600_001,
      }),
    ).toThrow(InvalidQuoteInputError);
  });
});
