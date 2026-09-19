import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import DeadlineQueue from "./DeadlineQueue.tsx";

const fetchMock = vi.fn<typeof fetch>();
const deadline = {
  id: "deadline-1",
  title: "Disposable deadline",
  project_or_context: "Frontend test",
  due_date: "2026-09-20T10:00:00.000Z",
  priority: "high" as const,
  status: "pending" as const,
  notes: "",
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

it("completes a deadline only after server confirmation and refreshes Work consumers", async () => {
  fetchMock.mockResolvedValue(
    Response.json({ ...deadline, status: "completed" }),
  );
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, "invalidateQueries");
  render(
    <QueryClientProvider client={client}>
      <DeadlineQueue deadlines={[deadline]} />
    </QueryClientProvider>,
  );
  fireEvent.click(
    screen.getByRole("button", {
      name: "Mark deadline completed: Disposable deadline",
    }),
  );
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
    status: "completed",
  });
  await waitFor(() => expect(invalidate).toHaveBeenCalled());
  expect(invalidate.mock.calls.map(([options]) => options)).toEqual(
    expect.arrayContaining([
      { queryKey: ["work"] },
      { queryKey: ["dashboard"] },
    ]),
  );
});
