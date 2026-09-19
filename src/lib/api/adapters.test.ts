import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getTasks, getAllProjects } from "./projects.ts";
import { getWorkoutSessions } from "./health.ts";
import { getNetWorthHistory, updateBill } from "./finances.ts";
import { getSkills } from "./learning.ts";
import { getDeadlines } from "./work.ts";
import { getContact, getFollowUps } from "./social.ts";
import { getOutfitLogs } from "./appearance.ts";
import { getChecklists, updateChecklistItem } from "./logistics.ts";
import { getNodes } from "./infrastructure.ts";
import { getSleepTrend } from "./intelligence.ts";
import { getNotifications, markNotificationRead } from "./notifications.ts";
import {
  getTriggerRules,
  resolveTriggerLogEntry,
  updateTriggerRule,
} from "./triggers.ts";

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

describe("backend resource contracts", () => {
  const lists: [string, () => Promise<unknown>][] = [
    ["/projects/tasks?status=done", () => getTasks({ status: "done" })],
    ["/health/workouts?days=7", () => getWorkoutSessions(7)],
    ["/finances/net-worth?months=6", () => getNetWorthHistory(6)],
    ["/learning/skills?roadmap_id=road%2Fmap", () => getSkills("road/map")],
    ["/work/deadlines", () => getDeadlines()],
    ["/social/follow-ups?completed=false", () => getFollowUps(false)],
    ["/appearance/outfits?limit=5", () => getOutfitLogs(5)],
    ["/logistics/checklists", () => getChecklists()],
    ["/intelligence/sleep-trend", () => getSleepTrend()],
    ["/notifications", () => getNotifications()],
    ["/triggers/rules", () => getTriggerRules()],
  ];
  it.each(lists)("requests %s using the shared client", async (path, read) => {
    fetchMock.mockResolvedValue(Response.json([]));
    await expect(read()).resolves.toEqual([]);
    expect(fetchMock.mock.calls[0][0]).toBe(
      `https://api.example.test/api/v1${path}`,
    );
  });

  it("does not accept a missing or wrapped list as an empty collection", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ data: [] }));
    await expect(getNodes()).rejects.toMatchObject({
      code: "invalid_response",
    });
    await expect(getNotifications()).rejects.toMatchObject({
      code: "invalid_response",
    });
  });

  it("retrieves all project pages for overview screens", async () => {
    fetchMock
      .mockResolvedValueOnce(
        Response.json({
          data: [{ id: "p1" }],
          total: 2,
          page: 1,
          per_page: 1,
          total_pages: 2,
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          data: [{ id: "p2" }],
          total: 2,
          page: 2,
          per_page: 1,
          total_pages: 2,
        }),
      );
    await expect(getAllProjects()).resolves.toEqual([
      { id: "p1" },
      { id: "p2" },
    ]);
    expect(fetchMock.mock.calls[1][0]).toBe(
      "https://api.example.test/api/v1/projects?page=2&per_page=1",
    );
  });

  it("maps only entity 404s to null and preserves other errors", async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({}, { status: 404 }))
      .mockResolvedValueOnce(Response.json({}, { status: 401 }));
    await expect(getContact("missing")).resolves.toBeNull();
    await expect(getContact("private")).rejects.toMatchObject({
      status: 401,
    });
  });

  it("writes existing UI actions to the backend with encoded IDs", async () => {
    fetchMock.mockImplementation(async () => Response.json({ id: "saved" }));
    await updateBill("bill/1", { paid: true });
    await updateChecklistItem("list/1", "item/1", { completed: false });
    await markNotificationRead("notification/1");
    await resolveTriggerLogEntry("log/1");
    expect(
      fetchMock.mock.calls.map(([url, options]) => [
        url,
        options?.method,
        JSON.parse(String(options?.body)),
      ]),
    ).toEqual([
      [
        "https://api.example.test/api/v1/finances/bills/bill%2F1",
        "PATCH",
        { paid: true },
      ],
      [
        "https://api.example.test/api/v1/logistics/checklists/list%2F1/items/item%2F1",
        "PATCH",
        { completed: false },
      ],
      [
        "https://api.example.test/api/v1/notifications/notification%2F1",
        "PATCH",
        { status: "read" },
      ],
      [
        "https://api.example.test/api/v1/triggers/log/log%2F1",
        "PATCH",
        { resolved: true },
      ],
    ]);
  });

  it("does not fabricate successful mutations when the backend rejects a write", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ detail: "Unavailable" }, { status: 503 }),
    );
    await expect(
      updateTriggerRule("r1", { enabled: false }),
    ).rejects.toMatchObject({ status: 503 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
