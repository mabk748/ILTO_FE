import { describe, expect, it } from "vitest";
import {
  FINANCIAL_VALUE_MASK,
  financeCurrency,
  formatMoney,
} from "./finance.ts";

describe("finance currency formatting", () => {
  it.each(["EUR", "MAD", "USD"] as const)(
    "formats supported %s values without conversion",
    (currency) => {
      const formatted = formatMoney(1234.5, currency);
      expect(formatted).toMatch(/1.*234/);
      expect(formatted).not.toBe(FINANCIAL_VALUE_MASK);
    },
  );

  it("masks values and treats missing legacy currency as EUR", () => {
    expect(formatMoney(999, "MAD", true)).toBe(FINANCIAL_VALUE_MASK);
    expect(financeCurrency(undefined)).toBe("EUR");
    expect(financeCurrency("GBP")).toBe("EUR");
  });
});
