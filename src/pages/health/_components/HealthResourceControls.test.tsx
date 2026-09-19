import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HealthResourceControls from "./HealthResourceControls.tsx";

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

function setup(client = new QueryClient()) {
  render(
    <QueryClientProvider client={client}>
      <HealthResourceControls target={{ kind: "plan" }} />
    </QueryClientProvider>,
  );
  return client;
}

describe("Health resource controls", () => {
  it("keeps the plan form open and reports a failed write", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ detail: "Unavailable" }, { status: 503 }),
    );
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Create plan" }));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Test plan" },
    });
    fireEvent.change(screen.getByLabelText("Goal"), {
      target: { value: "Test goal" },
    });
    fireEvent.change(screen.getByLabelText("Total weeks"), {
      target: { value: "4" },
    });
    fireEvent.change(screen.getByLabelText("Current week"), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("could not confirm"),
    );
    expect(screen.getByDisplayValue("Test plan")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("invalidates Health and Dashboard only after confirmed deletion", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    const client = setup();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    // Use a saved record to exercise deletion; server-owned fields are never in the request.
    // The create-only target above is replaced by a fresh render to keep the test focused.
    // (The button is exposed by the saved-record form below.)
    render(
      <QueryClientProvider client={client}>
        <HealthResourceControls
          target={{
            kind: "plan",
            record: {
              id: "plan-1",
              name: "Disposable plan",
              goal: "Test",
              weeks_total: 4,
              week_current: 1,
              status: "active",
              created_at: "2026-09-15T00:00:00.000Z",
            },
          }}
        />
      </QueryClientProvider>,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Delete plan: Disposable plan" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(invalidate).toHaveBeenCalled());
    expect(invalidate.mock.calls.map(([options]) => options)).toEqual(
      expect.arrayContaining([
        { queryKey: ["health"] },
        { queryKey: ["dashboard"] },
      ]),
    );
    expect(fetchMock.mock.calls[0][1]?.method).toBe("DELETE");
  });
});
