import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import type { BudgetCategory } from "@/lib/api/types.ts";
import BudgetView from "./BudgetView.tsx";
import PortfolioView from "./PortfolioView.tsx";
import BillsView from "./BillsView.tsx";
import TransactionsView from "./TransactionsView.tsx";
import type { Transaction } from "@/lib/api/types.ts";
import {
  FinancePreferencesContext,
  type FinancePreferencesValue,
} from "@/components/providers/finance-preferences-context.ts";

function setup(
  children: React.ReactNode,
  preferences: Partial<FinancePreferencesValue> = {},
) {
  const value: FinancePreferencesValue = {
    currency: "EUR",
    selectedCurrencies: ["EUR", "MAD", "USD"],
    masked: false,
    setCurrency: () => undefined,
    setSelectedCurrencies: () => undefined,
    setMasked: () => undefined,
    ...preferences,
  };
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <FinancePreferencesContext.Provider value={value}>
        {children}
      </FinancePreferencesContext.Provider>
    </QueryClientProvider>,
  );
}

describe("Finance empty and edge states", () => {
  it("does not render NaN for zero monthly limits or empty spending", () => {
    const category: BudgetCategory = {
      id: "category-1",
      name: "Unbudgeted",
      monthly_limit: 0,
      spent_this_month: 0,
      currency: "EUR",
      color: "#123456",
    };
    setup(<BudgetView categories={[category]} />);
    expect(screen.getAllByText("No monthly limits set")).toHaveLength(3);
    expect(
      screen.getByText("No spending to chart for EUR."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });

  it("shows explicit empty states for stored portfolio datasets", () => {
    setup(<PortfolioView netWorth={[]} trades={[]} />);
    expect(
      screen.getByText("No net-worth snapshots available for EUR."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No trades available for EUR."),
    ).toBeInTheDocument();
  });

  it("shows an explicit empty state for bills", () => {
    setup(<BillsView bills={[]} />);
    expect(
      screen.getByText("No bills match the selected currencies."),
    ).toBeInTheDocument();
  });

  it("keeps mixed-currency budget totals separate and masks monetary output", () => {
    const categories: BudgetCategory[] = [
      {
        id: "eur-category",
        name: "EUR category",
        monthly_limit: 1000,
        spent_this_month: 100,
        currency: "EUR",
        color: "#123456",
      },
      {
        id: "mad-category",
        name: "MAD category",
        monthly_limit: 200,
        spent_this_month: 20,
        currency: "MAD",
        color: "#654321",
      },
    ];
    setup(<BudgetView categories={categories} />, {
      currency: "MAD",
      selectedCurrencies: ["MAD"],
      masked: true,
    });

    expect(screen.getByText("Total spent this month (MAD)")).toBeVisible();
    expect(screen.getByText("Financial totals hidden")).toBeVisible();
    expect(screen.getByText("Financial chart hidden.")).toBeVisible();
    expect(screen.getAllByText(/••••/).length).toBeGreaterThan(1);
    expect(screen.queryByText(/MAD\s*200/)).not.toBeInTheDocument();
  });

  it("filters transactions by every selected currency and displays payment type", () => {
    const categories: BudgetCategory[] = [
      {
        id: "eur-category",
        name: "EUR category",
        monthly_limit: 100,
        spent_this_month: 10,
        currency: "EUR",
        color: "#123456",
      },
      {
        id: "mad-category",
        name: "MAD category",
        monthly_limit: 200,
        spent_this_month: 20,
        currency: "MAD",
        color: "#654321",
      },
    ];
    const transactions: Transaction[] = [
      {
        id: "transaction-eur",
        category_id: "eur-category",
        type: "expense",
        amount: 10,
        currency: "EUR",
        payment_type: "cash",
        description: "EUR purchase",
        date: "2026-09-15T10:00:00Z",
        tags: [],
      },
      {
        id: "transaction-mad",
        category_id: "mad-category",
        type: "expense",
        amount: 20,
        currency: "MAD",
        payment_type: "bank_transfer",
        description: "MAD purchase",
        date: "2026-09-15T09:00:00Z",
        tags: [],
      },
    ];

    setup(
      <TransactionsView categories={categories} transactions={transactions} />,
      { selectedCurrencies: ["MAD"] },
    );
    expect(screen.getByText("MAD purchase")).toBeInTheDocument();
    expect(screen.getByText("Bank transfer")).toBeInTheDocument();
    expect(screen.queryByText("EUR purchase")).not.toBeInTheDocument();
  });
});
