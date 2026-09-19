import { describe, expect, it } from "vitest";
import {
  formatCalendarDate,
  isCalendarDateOverdue,
  parseCalendarDate,
} from "./calendar-date.ts";

describe("calendar dates (also run under TZ=America/Los_Angeles)", () => {
  it("preserves date components across timezones and DST dates", () => {
    for (const value of ["2026-03-08", "2026-11-01", "2026-09-13"]) {
      const date = parseCalendarDate(value);
      expect([date.getFullYear(), date.getMonth() + 1, date.getDate()]).toEqual(
        value.split("-").map(Number),
      );
      expect(formatCalendarDate(value, "yyyy-MM-dd")).toBe(value);
    }
  });
  it("does not call a milestone overdue until the day after its due date", () => {
    expect(
      isCalendarDateOverdue("2026-09-13", new Date(2026, 8, 13, 23, 59)),
    ).toBe(false);
    expect(isCalendarDateOverdue("2026-09-13", new Date(2026, 8, 14))).toBe(
      true,
    );
  });
  it.each(["2026-02-30", "2026-13-01", "2026-09-13T00:00:00Z"])(
    "rejects invalid calendar date %s",
    (value) => {
      expect(() => parseCalendarDate(value)).toThrow();
    },
  );
});
