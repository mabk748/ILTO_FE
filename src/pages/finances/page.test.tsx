import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import FinancesPage from "./page.tsx";

vi.mock("@/lib/api/finances.ts", () => ({
  getBudgetCategories: vi.fn().mockResolvedValue([]),
  getTransactions: vi.fn().mockResolvedValue([]),
  getTrades: vi.fn().mockResolvedValue([]),
  getNetWorthHistory: vi.fn().mockResolvedValue([]),
  getBills: vi.fn().mockResolvedValue([]),
  createBudgetCategory: vi.fn(),
  updateBudgetCategory: vi.fn(),
  deleteBudgetCategory: vi.fn(),
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
  createBill: vi.fn(),
  updateBill: vi.fn(),
  deleteBill: vi.fn(),
}));

describe("Finance page ordering", () => {
  it("opens on the complete Transactions view", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <FinancesPage />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText("Transactions (newest first)"),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button")[0]).toHaveTextContent("Transactions");
    expect(
      screen.getByText(
        "All matching transactions are shown; no hidden ten-row limit.",
      ),
    ).toBeInTheDocument();
  });
});
