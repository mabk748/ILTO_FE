import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NotificationsPage from "./page.tsx";

const fetchMock = vi.fn<typeof fetch>();
const unread = {
  id: "notification-1",
  domain: "logistics" as const,
  title: "Disposable unread notification",
  body: "Stored test record",
  severity: "warning" as const,
  status: "unread" as const,
  created_at: "2026-09-19T10:00:00.000Z",
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

function setup(
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <NotificationsPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
  return client;
}

describe("Notifications page", () => {
  it("marks a notification read only after the server response and retains the unread filter during refetch", async () => {
    const read = { ...unread, status: "read" as const };
    fetchMock
      .mockResolvedValueOnce(Response.json([unread]))
      .mockResolvedValueOnce(Response.json(read))
      .mockResolvedValueOnce(Response.json([read]));
    setup();
    await screen.findByText(unread.title);
    fireEvent.click(screen.getByRole("button", { name: /^Unread/ }));
    fireEvent.click(
      screen.getByRole("button", { name: "Mark notification as read" }),
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
      status: "read",
    });
    expect(
      screen.queryByRole("button", { name: "Mark notification as read" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("You're all caught up.")).toBeInTheDocument();
  });

  it("uses the server-dismissed response and does not retain a dismissed card", async () => {
    const dismissed = { ...unread, status: "dismissed" as const };
    fetchMock
      .mockResolvedValueOnce(Response.json([unread]))
      .mockResolvedValueOnce(Response.json(dismissed))
      .mockResolvedValueOnce(Response.json([dismissed]));
    setup();
    await screen.findByText(unread.title);
    fireEvent.click(
      screen.getByRole("button", { name: "Dismiss notification" }),
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
      status: "dismissed",
    });
    expect(screen.queryByText(unread.title)).not.toBeInTheDocument();
  });

  it("posts mark-all once, refetches server state, and leaves dismissed records dismissed", async () => {
    const read = { ...unread, status: "read" as const };
    const dismissed = {
      ...unread,
      id: "notification-dismissed",
      title: "Dismissed notification",
      status: "dismissed" as const,
    };
    fetchMock
      .mockResolvedValueOnce(Response.json([unread, dismissed]))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json([read, dismissed]));
    setup();
    await screen.findByText(unread.title);
    fireEvent.click(screen.getByRole("button", { name: "Mark all read" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[1][0]).toContain("notifications/read-all");
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({});
    expect(
      screen.queryByText("Dismissed notification"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Mark all read" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the displayed state unchanged and reports a failed write", async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json([unread]))
      .mockResolvedValueOnce(
        Response.json({ detail: "Unavailable" }, { status: 503 }),
      );
    setup();
    await screen.findByText(unread.title);
    fireEvent.click(
      screen.getByRole("button", { name: "Mark notification as read" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("could not confirm"),
    );
    expect(
      screen.getByRole("button", { name: "Mark notification as read" }),
    ).toBeInTheDocument();
  });

  it("renders records without action_url and an explicit empty state", async () => {
    fetchMock.mockResolvedValueOnce(Response.json([unread]));
    setup();
    await screen.findByText(unread.title);
    expect(
      screen.queryByRole("link", { name: /View in/ }),
    ).not.toBeInTheDocument();

    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(Response.json([]));
    setup();
    expect(await screen.findByText("No notifications")).toBeInTheDocument();
  });
});
