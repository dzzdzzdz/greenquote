import { describe, expect, it } from "vitest";
import { centsToEuros, eurosToCents, formatEuros } from "@/lib/money";

describe("eurosToCents", () => {
  it("converts whole euros", () => {
    expect(eurosToCents(1200)).toBe(120000);
  });

  it("rounds to the nearest cent", () => {
    expect(eurosToCents(10.005)).toBe(1001);
    expect(eurosToCents(10.004)).toBe(1000);
  });

  it("survives values floats represent badly", () => {
    // 0.29 * 100 is 28.999999999999996 in IEEE 754.
    expect(eurosToCents(0.29)).toBe(29);
  });
});

describe("centsToEuros", () => {
  it("is the inverse of eurosToCents for whole cents", () => {
    expect(centsToEuros(120000)).toBe(1200);
  });
});

describe("formatEuros", () => {
  it("renders cents as a currency string", () => {
    // Non-breaking space before the symbol, per the de-DE locale.
    expect(formatEuros(120000)).toBe("1.200,00 €");
  });
});
