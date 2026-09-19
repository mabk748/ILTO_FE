import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LearningResourceControls from "./LearningResourceControls.tsx";

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

function setup(children: React.ReactNode, client = new QueryClient()) {
  render(<QueryClientProvider client={client}>{children}</QueryClientProvider>);
  return client;
}

describe("Learning resource controls", () => {
  it("posts writable roadmap fields and refreshes Learning and Dashboard after confirmation", async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        id: "roadmap-1",
        name: "Disposable roadmap",
        goal: "Verify API",
        status: "active",
        created_at: "2026-09-17T10:00:00.000Z",
        skills_total: 0,
        skills_completed: 0,
      }),
    );
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    setup(<LearningResourceControls target={{ kind: "roadmap" }} />, client);
    fireEvent.click(screen.getByRole("button", { name: "Create roadmap" }));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Disposable roadmap" },
    });
    fireEvent.change(screen.getByLabelText("Goal"), {
      target: { value: "Verify API" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      name: "Disposable roadmap",
      goal: "Verify API",
      status: "active",
    });
    await waitFor(() => expect(invalidate).toHaveBeenCalled());
    expect(invalidate.mock.calls.map(([options]) => options)).toEqual(
      expect.arrayContaining([
        { queryKey: ["learning"] },
        { queryKey: ["dashboard"] },
      ]),
    );
  });

  it("PATCHes only an explicit completed_at null and preserves zero pages read", async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        id: "reading-1",
        title: "Existing book",
        author: "Author",
        pages_total: 200,
        pages_read: 0,
        words_per_minute: 250,
        started_at: "2026-09-15T10:00:00.000Z",
        completed_at: null,
        tags: ["frontend"],
      }),
    );
    setup(
      <LearningResourceControls
        target={{
          kind: "reading",
          record: {
            id: "reading-1",
            title: "Existing book",
            author: "Author",
            pages_total: 200,
            pages_read: 0,
            words_per_minute: 250,
            started_at: "2026-09-15T10:00:00.000Z",
            completed_at: "2026-09-16T10:00:00.000Z",
            tags: ["frontend"],
          },
        }}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Edit reading: Existing book" }),
    );
    expect(screen.getByLabelText("Pages read")).toHaveValue(0);
    fireEvent.change(screen.getByLabelText("Completed at"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.example.test/api/v1/learning/reading/reading-1",
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      completed_at: null,
    });
  });

  it("keeps failed input open and reports server failures", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ detail: "Unavailable" }, { status: 503 }),
    );
    setup(<LearningResourceControls target={{ kind: "roadmap" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Create roadmap" }));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Disposable roadmap" },
    });
    fireEvent.change(screen.getByLabelText("Goal"), {
      target: { value: "Verify API" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("could not confirm"),
    );
    expect(screen.getByDisplayValue("Disposable roadmap")).toBeInTheDocument();
  });
});
