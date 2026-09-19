import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import BillsView from "./BillsView.tsx";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it("keeps an overdue bill unpaid when saving fails", async () => {
  localStorage.clear();
  vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test/api/v1");
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      Response.json({ detail: "Save failed" }, { status: 503 }),
    );
  vi.stubGlobal("fetch", fetchMock);
  const client = new QueryClient();
  render(
    <QueryClientProvider client={client}>
      <BillsView
        bills={[
          {
            id: "bill1",
            name: "Overdue bill",
            amount: 10,
            due_date: "2020-01-01",
            recurrence: "one_time",
            paid: false,
            category: "Other",
          },
        ]}
      />
    </QueryClientProvider>,
  );
  expect(screen.getByText("Overdue bill")).toBeInTheDocument();
  const button = screen.getByRole("button", { name: "Mark complete" });
  fireEvent.click(button);
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(button).toBeEnabled());
  expect(button).toHaveTextContent("Mark paid");
  client.clear();
});
