import { useCallback, useMemo, useState } from "react";
import type { FinanceCurrency } from "@/lib/api/types.ts";
import { FINANCE_CURRENCIES, financeCurrency } from "@/lib/finance.ts";
import { FinancePreferencesContext } from "./finance-preferences-context.ts";

export const FINANCE_PREFERENCES_STORAGE_KEY = "ilto_finance_preferences";

interface StoredPreferences {
  currency: FinanceCurrency;
  selectedCurrencies: FinanceCurrency[];
  masked: boolean;
}

const DEFAULT_PREFERENCES: StoredPreferences = {
  currency: "EUR",
  selectedCurrencies: [...FINANCE_CURRENCIES],
  masked: false,
};

function financeCurrencies(value: unknown): FinanceCurrency[] {
  if (!Array.isArray(value)) return [];
  return FINANCE_CURRENCIES.filter((currency) => value.includes(currency));
}

function loadPreferences(): StoredPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const value = JSON.parse(
      window.localStorage.getItem(FINANCE_PREFERENCES_STORAGE_KEY) ?? "null",
    ) as unknown;
    if (typeof value !== "object" || value === null) return DEFAULT_PREFERENCES;
    const stored = value as Record<string, unknown>;
    const legacyCurrency = financeCurrency(stored.currency);
    const selectedCurrencies = Array.isArray(stored.selectedCurrencies)
      ? financeCurrencies(stored.selectedCurrencies)
      : [legacyCurrency];
    return {
      currency: legacyCurrency,
      selectedCurrencies,
      masked: stored.masked === true,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function FinancePreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [preferences, setPreferences] = useState(loadPreferences);

  const save = useCallback((next: StoredPreferences) => {
    try {
      window.localStorage.setItem(
        FINANCE_PREFERENCES_STORAGE_KEY,
        JSON.stringify(next),
      );
    } catch {
      // The in-memory privacy control must still work when storage is blocked.
    }
    setPreferences(next);
  }, []);

  const setCurrency = useCallback(
    (currency: FinanceCurrency) => save({ ...preferences, currency }),
    [preferences, save],
  );
  const setSelectedCurrencies = useCallback(
    (selectedCurrencies: FinanceCurrency[]) =>
      save({
        ...preferences,
        selectedCurrencies: financeCurrencies(selectedCurrencies),
      }),
    [preferences, save],
  );
  const setMasked = useCallback(
    (masked: boolean) => save({ ...preferences, masked }),
    [preferences, save],
  );

  const value = useMemo(
    () => ({
      ...preferences,
      setCurrency,
      setSelectedCurrencies,
      setMasked,
    }),
    [preferences, setCurrency, setMasked, setSelectedCurrencies],
  );

  return (
    <FinancePreferencesContext.Provider value={value}>
      {children}
    </FinancePreferencesContext.Provider>
  );
}
