import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AppLayout from "./AppLayout.tsx";
import { FinancePreferencesContext } from "@/components/providers/finance-preferences-context.ts";
import { SettingsContext } from "@/components/providers/settings-context.ts";
import { normalizeSettings } from "@/lib/settings.ts";

vi.mock("@/components/providers/owner-auth-context.ts", () => ({
  useOwnerAuth: () => ({
    owner: { username: "owner" },
    logout: vi.fn(),
  }),
}));

describe("application finance privacy controls", () => {
  it("exposes an accessible mask button and EUR/MAD/USD selector", () => {
    const setCurrency = vi.fn();
    const setSelectedCurrencies = vi.fn();
    const setMasked = vi.fn();
    render(
      <SettingsContext.Provider
        value={{
          settings: normalizeSettings({}),
          updateSettings: vi.fn(),
          resetSettings: vi.fn(),
        }}
      >
        <FinancePreferencesContext.Provider
          value={{
            currency: "EUR",
            selectedCurrencies: ["EUR", "MAD", "USD"],
            masked: false,
            setCurrency,
            setSelectedCurrencies,
            setMasked,
          }}
        >
          <MemoryRouter>
            <Routes>
              <Route element={<AppLayout />}>
                <Route index element={<p>Dashboard</p>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </FinancePreferencesContext.Provider>
      </SettingsContext.Provider>,
    );

    const maskButton = screen.getByRole("button", {
      name: "Mask financial data",
    });
    expect(maskButton).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(maskButton);
    expect(setMasked).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByText("Finance: All currencies"));
    const currency = screen.getByRole("combobox", {
      name: "Default finance entry currency",
    });
    expect(currency).toHaveValue("EUR");
    expect(screen.getByRole("option", { name: "MAD" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "USD" })).toBeInTheDocument();
    fireEvent.change(currency, { target: { value: "USD" } });
    expect(setCurrency).toHaveBeenCalledWith("USD");
    fireEvent.click(screen.getByRole("checkbox", { name: "MAD" }));
    expect(setSelectedCurrencies).toHaveBeenCalledWith(["EUR", "USD"]);
  });
});
