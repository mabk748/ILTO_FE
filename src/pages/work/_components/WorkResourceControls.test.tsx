import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WorkResourceControls from "./WorkResourceControls.tsx";

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

describe("Work resource controls", () => {
  it("keeps a deadline form open and reports failed writes", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ detail: "Unavailable" }, { status: 503 }),
    );
    setup(<WorkResourceControls target={{ kind: "deadline" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Create deadline" }));
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Disposable deadline" },
    });
    fireEvent.change(screen.getByLabelText("Project or context"), {
      target: { value: "Frontend" },
    });
    fireEvent.change(screen.getByLabelText("Due date and time"), {
      target: { value: "2026-09-16T12:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("could not confirm"),
    );
    expect(screen.getByDisplayValue("Disposable deadline")).toBeInTheDocument();
  });

  it("invalidates Work and Dashboard only after a confirmed delete", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    setup(
      <WorkResourceControls
        target={{
          kind: "certification",
          record: {
            id: "cert-1",
            name: "Disposable certification",
            provider: "Provider",
            status: "planned",
            exam_date: null,
            expiry_date: null,
            study_hours_logged: 0,
            study_hours_target: 0,
          },
        }}
      />,
      client,
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Delete certification: Disposable certification",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    await waitFor(() => expect(invalidate).toHaveBeenCalled());
    expect(invalidate.mock.calls.map(([options]) => options)).toEqual(
      expect.arrayContaining([
        { queryKey: ["work"] },
        { queryKey: ["dashboard"] },
      ]),
    );
    expect(fetchMock.mock.calls[0][1]?.method).toBe("DELETE");
  });
});
