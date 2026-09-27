import { createContext, useContext } from "react";
import type { FinanceCurrency } from "@/lib/api/types.ts";

export interface FinancePreferencesValue {
  /** Default used when a new finance editor opens. */
  currency: FinanceCurrency;
  selectedCurrencies: FinanceCurrency[];
  masked: boolean;
  setCurrency: (currency: FinanceCurrency) => void;
  setSelectedCurrencies: (currencies: FinanceCurrency[]) => void;
  setMasked: (masked: boolean) => void;
}

const DEFAULT_PREFERENCES: FinancePreferencesValue = {
  currency: "EUR",
  selectedCurrencies: ["EUR", "MAD", "USD"],
  masked: false,
  setCurrency: () => undefined,
  setSelectedCurrencies: () => undefined,
  setMasked: () => undefined,
};

export const FinancePreferencesContext =
  createContext<FinancePreferencesValue>(DEFAULT_PREFERENCES);

export function useFinancePreferences(): FinancePreferencesValue {
  return useContext(FinancePreferencesContext);
}
