import { format, startOfDay } from "date-fns";

/** Construct local calendar components; ISO date-only parsing otherwise uses UTC. */
export function parseCalendarDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error("Use a calendar date in YYYY-MM-DD format.");
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1) throw new Error("Enter a valid calendar year.");
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  )
    throw new Error("Enter a valid calendar date.");
  return date;
}

export function formatCalendarDate(
  value: string,
  pattern = "MMM d, yyyy",
): string {
  return format(parseCalendarDate(value), pattern);
}

export function isCalendarDateOverdue(
  value: string,
  now = new Date(),
): boolean {
  return parseCalendarDate(value) < startOfDay(now);
}
