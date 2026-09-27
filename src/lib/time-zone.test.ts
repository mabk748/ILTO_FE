import { describe, expect, it } from "vitest";
import {
  formatInstant,
  isValidTimeZone,
  toZonedDateTimeInput,
  zonedDateTimeToUtc,
} from "./time-zone.ts";

describe("time-zone helpers", () => {
  it("round-trips datetime-local values through the selected IANA zone", () => {
    expect(
      toZonedDateTimeInput("2026-01-15T12:30:00.000Z", "America/New_York"),
    ).toBe("2026-01-15T07:30");
    expect(
      zonedDateTimeToUtc("2026-01-15T07:30", "America/New_York", "Appointment"),
    ).toBe("2026-01-15T12:30:00.000Z");
  });

  it("formats the same instant differently when the selected zone changes", () => {
    const options: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    };
    expect(formatInstant("2026-01-15T12:30:00Z", "UTC", options)).toBe("12:30");
    expect(
      formatInstant("2026-01-15T12:30:00Z", "America/New_York", options),
    ).toBe("07:30");
  });

  it("rejects invalid zones and wall times skipped by daylight saving", () => {
    expect(isValidTimeZone("Not/A_Zone")).toBe(false);
    expect(() =>
      zonedDateTimeToUtc("2026-03-08T02:30", "America/New_York", "Appointment"),
    ).toThrow(/does not exist/);
  });
});
