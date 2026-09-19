import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TriggerBuilder from "./TriggerBuilder.tsx";

const fetchMock = vi.fn<typeof fetch>();

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

describe("Trigger rule read states", () => {
  it("renders an explicit empty rule state", async () => {
    fetchMock.mockResolvedValue(Response.json([]));
    render(
      <QueryClientProvider client={new QueryClient()}>
        <TriggerBuilder />
      </QueryClientProvider>,
    );
    expect(
      await screen.findByText("No trigger rules yet."),
    ).toBeInTheDocument();
  });

  it("shows an honest failed-read state", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ detail: "Service unavailable" }, { status: 503 }),
    );
    render(
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        <TriggerBuilder />
      </QueryClientProvider>,
    );
    expect(
      await screen.findByText("Could not load this section"),
    ).toBeInTheDocument();
    expect(screen.getByText("Service unavailable")).toBeInTheDocument();
  });
});
