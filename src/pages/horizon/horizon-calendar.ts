import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { HorizonEntry } from "@/lib/api/types.ts";
import { zonedDateTimeToUtc } from "@/lib/time-zone.ts";

export type HorizonView = "month" | "week";

export interface HorizonCalendarRange {
  from: string;
  to: string;
  days: Date[];
}

export function dateKeyInZone(value: Date | string, timeZone: string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

export function horizonCalendarRange(
  anchor: Date,
  view: HorizonView,
  timeZone: string,
): HorizonCalendarRange {
  const periodStart =
    view === "month"
      ? startOfMonth(anchor)
      : startOfWeek(anchor, { weekStartsOn: 1 });
  const periodEnd =
    view === "month"
      ? endOfMonth(anchor)
      : endOfWeek(anchor, { weekStartsOn: 1 });
  const first = startOfWeek(periodStart, { weekStartsOn: 1 });
  const last = endOfWeek(periodEnd, { weekStartsOn: 1 });
  const exclusiveEnd = addDays(last, 1);
  const exclusiveEndInstant = zonedDateTimeToUtc(
    `${format(exclusiveEnd, "yyyy-MM-dd")}T00:00`,
    timeZone,
    "Calendar range end",
  );
  return {
    from: zonedDateTimeToUtc(
      `${format(first, "yyyy-MM-dd")}T00:00`,
      timeZone,
      "Calendar range start",
    ),
    to: new Date(Date.parse(exclusiveEndInstant) - 1).toISOString(),
    days: eachDayOfInterval({ start: first, end: last }),
  };
}

export function groupEntriesByDay(
  entries: readonly HorizonEntry[],
  days: readonly Date[],
  timeZone: string,
): Map<string, HorizonEntry[]> {
  const grouped = new Map<string, HorizonEntry[]>();
  for (const day of days) {
    const key = format(day, "yyyy-MM-dd");
    grouped.set(
      key,
      entries
        .filter((entry) => {
          const useUtcCalendarDate =
            entry.all_day &&
            entry.source_domain === "projects" &&
            entry.source_type === "milestone";
          const start = useUtcCalendarDate
            ? entry.starts_at.slice(0, 10)
            : dateKeyInZone(entry.starts_at, timeZone);
          const end = entry.ends_at
            ? useUtcCalendarDate
              ? entry.ends_at.slice(0, 10)
              : dateKeyInZone(entry.ends_at, timeZone)
            : start;
          return key >= start && key <= end;
        })
        .sort((left, right) => {
          const instant =
            Date.parse(left.starts_at) - Date.parse(right.starts_at);
          return instant || left.id.localeCompare(right.id);
        }),
    );
  }
  return grouped;
}
