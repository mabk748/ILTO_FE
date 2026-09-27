import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useFinancePreferences } from "./finance-preferences-context.ts";
import {
  FINANCE_PREFERENCES_STORAGE_KEY,
  FinancePreferencesProvider,
} from "./finance-preferences.tsx";

function Probe() {
  const {
    currency,
    selectedCurrencies,
    masked,
    setCurrency,
    setSelectedCurrencies,
    setMasked,
  } = useFinancePreferences();
  return (
    <>
      <p>Currency: {currency}</p>
      <p>Masked: {String(masked)}</p>
      <p>Visible: {selectedCurrencies.join(",")}</p>
      <button type="button" onClick={() => setCurrency("MAD")}>
        Use MAD
      </button>
      <button type="button" onClick={() => setMasked(!masked)}>
        Toggle mask
      </button>
      <button
        type="button"
        onClick={() => setSelectedCurrencies(["MAD", "USD"])}
      >
        Show MAD and USD
      </button>
    </>
  );
}

function setup() {
  return render(
    <FinancePreferencesProvider>
      <Probe />
    </FinancePreferencesProvider>,
  );
}

describe("finance preferences", () => {
  beforeEach(() => localStorage.clear());

  it("persists the selected currency and privacy mask without financial data", () => {
    const view = setup();
    fireEvent.click(screen.getByRole("button", { name: "Use MAD" }));
    fireEvent.click(screen.getByRole("button", { name: "Show MAD and USD" }));
    fireEvent.click(screen.getByRole("button", { name: "Toggle mask" }));
    expect(screen.getByText("Currency: MAD")).toBeInTheDocument();
    expect(screen.getByText("Masked: true")).toBeInTheDocument();
    expect(
      JSON.parse(localStorage.getItem(FINANCE_PREFERENCES_STORAGE_KEY) ?? ""),
    ).toEqual({
      currency: "MAD",
      selectedCurrencies: ["MAD", "USD"],
      masked: true,
    });

    view.unmount();
    setup();
    expect(screen.getByText("Currency: MAD")).toBeInTheDocument();
    expect(screen.getByText("Masked: true")).toBeInTheDocument();
    expect(screen.getByText("Visible: MAD,USD")).toBeInTheDocument();
  });

  it("falls back safely from malformed stored preferences", () => {
    localStorage.setItem(FINANCE_PREFERENCES_STORAGE_KEY, "not-json");
    setup();
    expect(screen.getByText("Currency: EUR")).toBeInTheDocument();
    expect(screen.getByText("Visible: EUR,MAD,USD")).toBeInTheDocument();
    expect(screen.getByText("Masked: false")).toBeInTheDocument();
  });

  it("migrates the old single-currency preference as one selected currency", () => {
    localStorage.setItem(
      FINANCE_PREFERENCES_STORAGE_KEY,
      JSON.stringify({ currency: "MAD", masked: false }),
    );
    setup();
    expect(screen.getByText("Currency: MAD")).toBeInTheDocument();
    expect(screen.getByText("Visible: MAD")).toBeInTheDocument();
  });
});
