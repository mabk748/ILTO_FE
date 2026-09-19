import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ReviewQueue from "./ReviewQueue.tsx";

const fetchMock = vi.fn<typeof fetch>();
const card = {
  id: "card-1",
  topic: "Testing",
  question: "What is a unit test?",
  answer: "An isolated test.",
  ease_factor: 2.5,
  interval_days: 1,
  next_review: "2026-09-17T09:00:00.000Z",
  times_reviewed: 2,
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
      <ReviewQueue cards={[card]} />
    </QueryClientProvider>,
  );
  return client;
}

describe("Learning review queue", () => {
  it("sends the review instant, uses the server schedule, and invalidates affected queries", async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        ...card,
        times_reviewed: 3,
        interval_days: 3,
        next_review: "2026-09-20T09:00:00.000Z",
      }),
    );
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    setup(client);
    fireEvent.click(screen.getByRole("button", { name: "Reveal answer" }));
    fireEvent.click(screen.getByRole("button", { name: "Mark reviewed" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toEqual({ reviewed_at: expect.stringMatching(/Z$/) });
    expect(screen.getByText("3× reviewed")).toBeInTheDocument();
    expect(screen.getByText(/Reviewed\. Next review:/)).toBeInTheDocument();
    await waitFor(() => expect(invalidate).toHaveBeenCalled());
    expect(invalidate.mock.calls.map(([options]) => options)).toEqual(
      expect.arrayContaining([
        { queryKey: ["learning"] },
        { queryKey: ["dashboard"] },
      ]),
    );
  });

  it("does not mark a card reviewed when the server rejects the write", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ detail: "Unavailable" }, { status: 503 }),
    );
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Reveal answer" }));
    fireEvent.click(screen.getByRole("button", { name: "Mark reviewed" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("could not confirm"),
    );
    expect(
      screen.getByRole("button", { name: "Mark reviewed" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Reviewed\. Next review:/),
    ).not.toBeInTheDocument();
  });
});
