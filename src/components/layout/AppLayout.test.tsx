import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AppLayout from "./AppLayout.tsx";
import { FinancePreferencesContext } from "@/components/providers/finance-preferences-context.ts";
import { SettingsContext } from "@/components/providers/settings-context.ts";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";
import type { FinanceCurrency } from "@/lib/api/types.ts";
import { normalizeSettings } from "@/lib/settings.ts";
import { APP_VERSION } from "@/config/app-version.ts";

vi.mock("@/components/providers/owner-auth-context.ts", () => ({
  useOwnerAuth: () => ({
    owner: { username: "owner" },
    logout: vi.fn(),
  }),
}));

const SIDEBAR_COLLAPSED_STORAGE_KEY = "ilto_sidebar_collapsed";

function renderLayout({
  initialPath = "/horizon",
  setCurrency = vi.fn(),
  setSelectedCurrencies = vi.fn(),
  setMasked = vi.fn(),
}: {
  initialPath?: string;
  setCurrency?: (currency: FinanceCurrency) => void;
  setSelectedCurrencies?: (currencies: FinanceCurrency[]) => void;
  setMasked?: (masked: boolean) => void;
} = {}) {
  return render(
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
        <TooltipProvider>
          <MemoryRouter initialEntries={[initialPath]}>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="*" element={<p>Route content</p>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </TooltipProvider>
      </FinancePreferencesContext.Provider>
    </SettingsContext.Provider>,
  );
}

describe("application shell", () => {
  beforeEach(() => {
    window.localStorage.removeItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
  });

  it("exposes accessible finance privacy and currency controls", () => {
    const setCurrency = vi.fn();
    const setSelectedCurrencies = vi.fn();
    const setMasked = vi.fn();
    renderLayout({ setCurrency, setSelectedCurrencies, setMasked });

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

  it("places Horizon before Dashboard in desktop and mobile navigation", () => {
    renderLayout();

    const links = screen.getAllByRole("link");
    const labels = links.map((link) => link.textContent?.trim());
    expect(labels.indexOf("Horizon")).toBeLessThan(labels.indexOf("Dashboard"));
    expect(screen.getAllByRole("link", { name: /Horizon/ })[0]).toHaveAttribute(
      "href",
      "/horizon",
    );
    expect(
      screen.getAllByRole("link", { name: /Dashboard/ })[0],
    ).toHaveAttribute("href", "/dashboard");
    expect(screen.getByText(`Personal OS · V${APP_VERSION}`)).toBeVisible();
  });

  it("collapses the desktop sidebar and persists the preference", () => {
    const firstRender = renderLayout();
    const sidebar = screen.getByTestId("desktop-sidebar");

    expect(sidebar).toHaveAttribute("data-collapsed", "false");
    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(sidebar).toHaveAttribute("data-collapsed", "true");
    expect(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe(
      "true",
    );
    expect(
      screen.getByRole("button", { name: "Expand sidebar" }),
    ).toHaveAttribute("aria-expanded", "false");

    firstRender.unmount();
    renderLayout();
    expect(screen.getByTestId("desktop-sidebar")).toHaveAttribute(
      "data-collapsed",
      "true",
    );
  });

  it("opens the mobile navigation drawer and closes it after navigation", async () => {
    renderLayout();

    fireEvent.click(
      screen.getByRole("button", { name: "Open navigation menu" }),
    );
    const drawer = screen.getByRole("dialog", { name: "ILTO navigation" });
    const drawerNavigation = within(drawer).getByRole("navigation", {
      name: "Navigation drawer",
    });
    expect(
      within(drawerNavigation).getByRole("link", { name: "Work" }),
    ).toHaveAttribute("href", "/work");
    expect(
      within(drawerNavigation).getByRole("link", { name: "Settings" }),
    ).toBeInTheDocument();

    fireEvent.click(
      within(drawerNavigation).getByRole("link", { name: "Work" }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "ILTO navigation" }),
      ).not.toBeInTheDocument(),
    );
  });
});
