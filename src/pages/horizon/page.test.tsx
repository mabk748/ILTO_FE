import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsContext } from "@/components/providers/settings-context.ts";
import { normalizeSettings } from "@/lib/settings.ts";
import type { HorizonEntry } from "@/lib/api/types.ts";
import HorizonPage from "./page.tsx";

const fetchMock = vi.fn<typeof fetch>();

function Destination() {
  const location = useLocation();
  return <p>Destination: {location.pathname + location.search}</p>;
}

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <SettingsContext.Provider
      value={{
        settings: normalizeSettings({ timeZone: "UTC" }),
        updateSettings: vi.fn(),
        resetSettings: vi.fn(),
      }}
    >
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/horizon"]}>
          <Routes>
            <Route path="/horizon" element={<HorizonPage />} />
            <Route path="*" element={<Destination />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </SettingsContext.Provider>,
  );
  return client;
}

function currentEntry(
  sourceDomain: HorizonEntry["source_domain"] = "horizon",
): HorizonEntry {
  const start = new Date();
  start.setSeconds(0, 0);
  return {
    id: `${sourceDomain}-entry-1`,
    title:
      sourceDomain === "projects" ? "Production deployment" : "Focus block",
    starts_at: start.toISOString(),
    ends_at: null,
    all_day: false,
    source_domain: sourceDomain,
    source_type: sourceDomain === "projects" ? "milestone" : "item",
    source_id: `${sourceDomain}-record-1`,
    horizon_owned: sourceDomain === "horizon",
    detail:
      sourceDomain === "horizon"
        ? "Protected focus time"
        : sourceDomain === "projects"
          ? "Project: ILTO"
          : null,
    status: sourceDomain === "projects" ? "pending" : null,
  };
}

beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test/api/v1");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Horizon page", () => {
  it("shows loading and then an honest empty period with Month and Week controls", async () => {
    let resolve!: (response: Response) => void;
    fetchMock.mockImplementationOnce(
      () => new Promise<Response>((done) => (resolve = done)),
    );
    fetchMock.mockResolvedValue(Response.json([]));
    setup();
    expect(
      screen.getByLabelText("Loading Horizon calendar"),
    ).toBeInTheDocument();
    await act(async () => resolve(Response.json([])));
    expect(
      await screen.findByText(/Nothing is scheduled in this period/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Month" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Week" }));
    expect(await screen.findByRole("button", { name: "Week" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("shows a failed read instead of an empty calendar", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ detail: "Horizon unavailable" }, { status: 503 }),
    );
    setup();
    expect(
      await screen.findByText("Could not load this section"),
    ).toBeInTheDocument();
    expect(screen.getByText("Horizon unavailable")).toBeInTheDocument();
    expect(
      screen.queryByText(/Nothing is scheduled in this period/),
    ).not.toBeInTheDocument();
  });

  it("renders a domain entry read-only and navigates to its owning module", async () => {
    fetchMock.mockResolvedValue(Response.json([currentEntry("projects")]));
    setup();
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Open Production deployment from Projects",
      }),
    );
    expect(screen.getByText("Source: Projects")).toBeInTheDocument();
    expect(screen.getByText("Project: ILTO")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Edit" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Delete" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open in Projects" }));
    expect(
      await screen.findByText("Destination: /projects"),
    ).toBeInTheDocument();
  });

  it("creates a standalone block, preserves nullable end, and invalidates Horizon", async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json([]))
      .mockResolvedValueOnce(Response.json({ id: "item-1" }, { status: 201 }))
      .mockResolvedValueOnce(Response.json([]));
    const client = setup();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    await screen.findByText(/Nothing is scheduled in this period/);
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.click(screen.getByRole("button", { name: /Calendar block/ }));
    await screen.findByRole("heading", { name: "Add calendar block" });
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Disposable focus block" },
    });
    fireEvent.change(screen.getByLabelText("Start"), {
      target: { value: "2026-10-01T09:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
      title: "Disposable focus block",
      starts_at: "2026-10-01T09:00:00.000Z",
      ends_at: null,
      all_day: false,
      description: null,
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["horizon"] });
  });

  it("retains a failed form and shows the backend validation message", async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json([]))
      .mockResolvedValueOnce(
        Response.json({ detail: "Invalid calendar item" }, { status: 422 }),
      );
    setup();
    await screen.findByText(/Nothing is scheduled in this period/);
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.click(screen.getByRole("button", { name: /Calendar block/ }));
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Retained value" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /server rejected these calendar values/i,
    );
    expect(screen.getByDisplayValue("Retained value")).toBeInTheDocument();
  });

  it("edits only changed standalone fields and refreshes after confirmation", async () => {
    const entry = currentEntry();
    fetchMock
      .mockResolvedValueOnce(Response.json([entry]))
      .mockResolvedValueOnce(
        Response.json({
          ...entry,
          id: entry.source_id,
          title: "Updated focus block",
          detail: null,
        }),
      )
      .mockResolvedValueOnce(
        Response.json([
          { ...entry, title: "Updated focus block", detail: null },
        ]),
      );
    const client = setup();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Open Focus block from Horizon",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Updated focus block" },
    });
    fireEvent.change(screen.getByLabelText("Description (optional)"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[1][1]?.method).toBe("PATCH");
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
      title: "Updated focus block",
      description: null,
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["horizon"] });
  });

  it("requires confirmation before deleting a Horizon-owned block", async () => {
    const entry = currentEntry();
    fetchMock
      .mockResolvedValueOnce(Response.json([entry]))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json([]));
    setup();
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Open Focus block from Horizon",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[1][1]?.method).toBe("DELETE");
    expect(String(fetchMock.mock.calls[1][0])).toContain(
      "/horizon/items/horizon-record-1",
    );
  });

  it("hands domain creation off to the existing editor route", async () => {
    fetchMock.mockResolvedValue(Response.json([]));
    setup();
    await screen.findByText(/Nothing is scheduled in this period/);
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.click(screen.getByRole("button", { name: /Work deadline/ }));
    expect(
      await screen.findByText(
        "Destination: /work?tab=deadlines&create=deadline",
      ),
    ).toBeInTheDocument();
  });
});
