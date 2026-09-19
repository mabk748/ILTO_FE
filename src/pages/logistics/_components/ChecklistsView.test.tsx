import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ChecklistsView from "./ChecklistsView.tsx";

const fetchMock = vi.fn<typeof fetch>();
const checklist = {
  id: "checklist-1",
  name: "Disposable checklist",
  type: "travel" as const,
  items: [
    {
      id: "item-1",
      label: "Passport",
      completed: true,
      category: "Documents",
      priority: "high" as const,
    },
  ],
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
      <ChecklistsView checklists={[checklist]} />
    </QueryClientProvider>,
  );
  return client;
}

describe("Logistics checklist actions", () => {
  it("sends exactly completed false and invalidates only Logistics after confirmation", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ ...checklist.items[0], completed: false }),
    );
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    setup(client);
    fireEvent.click(screen.getByRole("checkbox"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      completed: false,
    });
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["logistics"] }),
    );
  });

  it("confirms before resetting and displays a failed reset without pretending it succeeded", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ detail: "Unavailable" }, { status: 503 }),
    );
    setup();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Reset checklist: Disposable checklist",
      }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm reset" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("could not confirm"),
    );
    expect(
      screen.getByRole("button", { name: "Confirm reset" }),
    ).toBeInTheDocument();
  });
});
