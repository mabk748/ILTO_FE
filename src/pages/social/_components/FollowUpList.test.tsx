import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FollowUpList from "./FollowUpList.tsx";

const fetchMock = vi.fn<typeof fetch>();
const followUp = {
  id: "followup-1",
  contact_id: "contact-1",
  contact_name: "Disposable contact",
  prompt: "Follow up for a test",
  due_date: "2026-09-20T10:00:00.000Z",
  completed: false,
  priority: "medium" as const,
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
      <FollowUpList followUps={[followUp]} />
    </QueryClientProvider>,
  );
  return client;
}

describe("Follow-up completion toggle", () => {
  it("sends only completed and refreshes Social and Dashboard after confirmation", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ ...followUp, completed: true }),
    );
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
        { queryKey: ["social"] },
        { queryKey: ["dashboard"] },
      ]),
    );
  });

  it("keeps the completion state server-confirmed if a write fails", async () => {
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
