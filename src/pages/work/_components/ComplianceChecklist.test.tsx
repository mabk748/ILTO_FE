import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ComplianceChecklist from "./ComplianceChecklist.tsx";

const fetchMock = vi.fn<typeof fetch>();
const item = {
  id: "compliance-1",
  category: "Records",
  title: "Disposable compliance item",
  description: "Only a test fixture",
  due_date: null,
  completed: false,
  recurrence: null,
};

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test/api/v1");
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function setup(client = new QueryClient()) {
  render(
    <QueryClientProvider client={client}>
      <ComplianceChecklist items={[item]} />
    </QueryClientProvider>,
  );
  return client;
}

describe("Compliance completion toggle", () => {
  it("sends only completed and invalidates Work and Dashboard after confirmation", async () => {
    fetchMock.mockResolvedValue(Response.json({ ...item, completed: true }));
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    setup(client);
    fireEvent.click(screen.getByRole("button", { name: "Mark complete" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      completed: true,
    });
    await waitFor(() => expect(invalidate).toHaveBeenCalled());
    expect(invalidate.mock.calls.map(([options]) => options)).toEqual(
      expect.arrayContaining([
        { queryKey: ["work"] },
        { queryKey: ["dashboard"] },
      ]),
    );
  });

  it("keeps the displayed completion state server-confirmed when a write fails", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ detail: "Unavailable" }, { status: 503 }),
    );
    setup();
    const toggle = screen.getByRole("button", { name: "Mark complete" });
    fireEvent.click(toggle);
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("could not confirm"),
    );
    expect(toggle).toHaveAttribute("aria-label", "Mark complete");
  });
});
