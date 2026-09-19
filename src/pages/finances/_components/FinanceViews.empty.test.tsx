import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import type { BudgetCategory } from "@/lib/api/types.ts";
import BudgetView from "./BudgetView.tsx";
import PortfolioView from "./PortfolioView.tsx";
import BillsView from "./BillsView.tsx";

function setup(children: React.ReactNode) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      {children}
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
      color: "#123456",
    };
    setup(<BudgetView categories={[category]} transactions={[]} />);
    expect(screen.getByText("No monthly limits set")).toBeInTheDocument();
    expect(screen.getByText("No spending to chart.")).toBeInTheDocument();
    expect(screen.getByText("No transactions yet.")).toBeInTheDocument();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });

  it("shows explicit empty states for stored portfolio datasets", () => {
    setup(<PortfolioView netWorth={[]} trades={[]} />);
    expect(
      screen.getByText("No net-worth snapshots available."),
    ).toBeInTheDocument();
    expect(screen.getByText("No trades available.")).toBeInTheDocument();
  });

  it("shows an explicit empty state for bills", () => {
    setup(<BillsView bills={[]} />);
    expect(screen.getByText("No bills listed yet.")).toBeInTheDocument();
  });
});
