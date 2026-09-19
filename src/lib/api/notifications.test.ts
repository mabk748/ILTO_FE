import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  dismissNotification,
  getNotifications,
  markAllRead,
  markNotificationRead,
} from "./notifications.ts";

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

describe("Notifications backend adapter", () => {
  it("keeps newest-first plain arrays and accepts records with no action_url", async () => {
    fetchMock.mockResolvedValue(
      Response.json([
        {
          id: "notification-2",
          domain: "logistics",
          title: "Newest",
          body: "Stored notification",
          severity: "info",
          status: "unread",
          created_at: "2026-09-19T11:00:00.000Z",
        },
      ]),
    );
    const notifications = await getNotifications();
    expect(notifications).toEqual([
      expect.objectContaining({ id: "notification-2", title: "Newest" }),
    ]);
    expect(notifications[0]).not.toHaveProperty("action_url");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/api/v1/notifications",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("sends exact read and dismissed PATCH bodies with encoded IDs", async () => {
    fetchMock
      .mockResolvedValueOnce(
        Response.json({ id: "notification-1", status: "read" }),
      )
      .mockResolvedValueOnce(
        Response.json({ id: "notification-1", status: "dismissed" }),
      );
    await markNotificationRead("notification/1");
    await dismissNotification("notification/1");
    expect(
      fetchMock.mock.calls.map(([url, options]) => [
        url,
        options?.method,
        JSON.parse(String(options?.body)),
      ]),
    ).toEqual([
      [
        "https://api.example.test/api/v1/notifications/notification%2F1",
        "PATCH",
        { status: "read" },
      ],
      [
        "https://api.example.test/api/v1/notifications/notification%2F1",
        "PATCH",
        { status: "dismissed" },
      ],
    ]);
  });

  it("posts an empty body to mark all notifications read", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await markAllRead();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/api/v1/notifications/read-all",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({});
  });
});
