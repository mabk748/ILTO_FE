import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BudgetCategory } from "@/lib/api/types.ts";
import FinanceResourceControls from "./FinanceResourceControls.tsx";

const fetchMock = vi.fn<typeof fetch>();
const category: BudgetCategory = {
  id: "category-1",
  name: "Housing",
  monthly_limit: 1000,
  spent_this_month: 20,
  color: "#123456",
};

function setup(children: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  client.setQueryData(["finances"], {
    categories: [],
    transactions: [],
    bills: [],
  });
  client.setQueryData(["dashboard"], { budgetCategories: [] });
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    ),
  };
}

beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test/api/v1");
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Finance resource controls", () => {
  it("creates a category, then invalidates Finance and Dashboard after confirmation", async () => {
    fetchMock.mockResolvedValue(Response.json(category, { status: 201 }));
    const { client } = setup(
      <FinanceResourceControls target={{ kind: "category" }} categories={[]} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Create category" }));
    const dialog = within(screen.getByRole("dialog"));
    fireEvent.change(dialog.getByLabelText("Name"), {
      target: { value: "Housing" },
    });
    fireEvent.change(dialog.getByLabelText("Monthly limit"), {
      target: { value: "1000" },
    });
    fireEvent.click(dialog.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      name: "Housing",
      monthly_limit: 1000,
      color: "#6366f1",
    });
    expect(client.getQueryState(["finances"])?.isInvalidated).toBe(true);
    expect(client.getQueryState(["dashboard"])?.isInvalidated).toBe(true);
  });

  it("keeps a transaction editor open after a validation failure", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ detail: "Invalid amount" }, { status: 422 }),
    );
    setup(
      <FinanceResourceControls
        target={{ kind: "transaction" }}
        categories={[category]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Create transaction" }));
    const dialog = within(screen.getByRole("dialog"));
    fireEvent.change(dialog.getByLabelText("Budget category"), {
      target: { value: category.id },
    });
    fireEvent.change(dialog.getByLabelText("Amount (EUR)"), {
      target: { value: "12.50" },
    });
    fireEvent.click(dialog.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "backend rejected",
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][1]?.method).toBe("POST");
  });
});
