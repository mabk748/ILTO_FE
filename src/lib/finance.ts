import type { FinanceCurrency } from "./api/types.ts";

export const FINANCE_CURRENCIES = [
  "EUR",
  "MAD",
  "USD",
] as const satisfies readonly FinanceCurrency[];
export const FINANCIAL_VALUE_MASK = "••••";

export function financeCurrency(value: unknown): FinanceCurrency {
  return FINANCE_CURRENCIES.includes(value as FinanceCurrency)
    ? (value as FinanceCurrency)
    : "EUR";
}

export function formatMoney(
  amount: number,
  currency: FinanceCurrency,
  masked = false,
  maximumFractionDigits = 2,
): string {
  if (masked) return FINANCIAL_VALUE_MASK;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(amount);
}

export function formatCompactMoney(
  amount: number,
  currency: FinanceCurrency,
  masked = false,
): string {
  if (masked) return FINANCIAL_VALUE_MASK;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}
