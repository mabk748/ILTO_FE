import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TriggerLog from "./TriggerLog.tsx";

const fetchMock = vi.fn<typeof fetch>();
const entry = {
  id: "log-1",
  rule_id: "rule-1",
  rule_name: "Disposable rule",
  domain: "finances" as const,
  triggered_at: "2026-09-19T10:00:00.000Z",
  condition_summary: "Budget > 0%",
  action_summary: "Flagged",
  resolved: false,
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
      <TriggerLog />
    </QueryClientProvider>,
  );
  return client;
}

describe("Trigger log resolution", () => {
  it("sends exactly resolved true and refreshes triggers after the server response", async () => {
    const resolved = { ...entry, resolved: true };
    fetchMock
      .mockResolvedValueOnce(Response.json([entry]))
      .mockResolvedValueOnce(Response.json(resolved))
      .mockResolvedValueOnce(Response.json([resolved]));
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    setup(client);
    await screen.findByText(entry.rule_name);
    fireEvent.click(screen.getByRole("button", { name: "Resolve" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
      resolved: true,
    });
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["triggers"] }),
    );
    expect(
      screen.queryByRole("button", { name: "Resolve" }),
    ).not.toBeInTheDocument();
  });

  it("does not resolve a log locally when the backend rejects the write", async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json([entry]))
      .mockResolvedValueOnce(
        Response.json({ detail: "Unavailable" }, { status: 503 }),
      );
    setup();
    await screen.findByText(entry.rule_name);
    fireEvent.click(screen.getByRole("button", { name: "Resolve" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("could not confirm"),
    );
    expect(screen.getByRole("button", { name: "Resolve" })).toBeInTheDocument();
  });
});
