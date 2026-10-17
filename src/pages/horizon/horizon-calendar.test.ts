import { describe, expect, it } from "vitest";
import type { HorizonEntry } from "@/lib/api/types.ts";
import { groupEntriesByDay, horizonCalendarRange } from "./horizon-calendar.ts";

describe("Horizon calendar ranges", () => {
  it("requests only the visible Monday-first month grid", () => {
    const range = horizonCalendarRange(
      new Date("2026-10-15T12:00:00Z"),
      "month",
      "UTC",
    );
    expect(range.from).toBe("2026-09-28T00:00:00.000Z");
    expect(range.to).toBe("2026-11-01T23:59:59.999Z");
    expect(range.days).toHaveLength(35);
  });

  it("groups timed, all-day, and multi-day entries without fabricating data", () => {
    const entries: HorizonEntry[] = [
      {
        id: "later",
        title: "Deadline",
        starts_at: "2026-10-01T12:00:00Z",
        ends_at: null,
        all_day: false,
        source_domain: "work",
        source_type: "deadline",
        source_id: "deadline-1",
        horizon_owned: false,
        detail: null,
        status: "pending",
      },
      {
        id: "span",
        title: "Trip block",
        starts_at: "2026-09-30T23:00:00Z",
        ends_at: "2026-10-02T22:59:00Z",
        all_day: true,
        source_domain: "horizon",
        source_type: "item",
        source_id: "item-1",
        horizon_owned: true,
        detail: null,
        status: null,
      },
    ];
    const range = horizonCalendarRange(
      new Date("2026-10-01T12:00:00Z"),
      "week",
      "Africa/Casablanca",
    );
    const grouped = groupEntriesByDay(entries, range.days, "Africa/Casablanca");
    expect(grouped.get("2026-10-01")?.map((entry) => entry.id)).toEqual([
      "span",
      "later",
    ]);
    expect(grouped.get("2026-10-02")?.map((entry) => entry.id)).toEqual([
      "span",
    ]);
    expect(grouped.get("2026-10-03")).toEqual([]);
    expect(grouped.get("2026-10-04")).toEqual([]);
  });

  it("keeps a project milestone on its UTC calendar date in western time zones", () => {
    const milestone: HorizonEntry = {
      id: "projects:milestone:one",
      title: "Release",
      starts_at: "2026-10-02T00:00:00Z",
      ends_at: null,
      all_day: true,
      source_domain: "projects",
      source_type: "milestone",
      source_id: "one",
      horizon_owned: false,
      detail: null,
      status: "pending",
    };
    const range = horizonCalendarRange(
      new Date("2026-10-02T12:00:00Z"),
      "week",
      "America/New_York",
    );
    const grouped = groupEntriesByDay(
      [milestone],
      range.days,
      "America/New_York",
    );
    expect(grouped.get("2026-10-02")?.map((entry) => entry.id)).toEqual([
      milestone.id,
    ]);
    expect(grouped.get("2026-10-01")).toEqual([]);
  });
});
