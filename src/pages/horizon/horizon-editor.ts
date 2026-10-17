import { ApiError } from "@/lib/api/errors.ts";
import type {
  CreateHorizonItemInput,
  UpdateHorizonItemInput,
} from "@/lib/api/horizon.ts";
import type { HorizonEntry } from "@/lib/api/types.ts";
import {
  detectedTimeZone,
  toZonedDateTimeInput,
  zonedDateTimeToUtc,
} from "@/lib/time-zone.ts";

export interface HorizonDraft {
  title: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  description: string;
}

function localDate(value: string, timeZone: string): string {
  return toZonedDateTimeInput(value, timeZone).slice(0, 10);
}

export function horizonDraft(
  entry?: HorizonEntry,
  timeZone = detectedTimeZone(),
  now = new Date(),
): HorizonDraft {
  const start = entry?.starts_at ?? now.toISOString();
  const allDay = entry?.all_day ?? false;
  return {
    title: entry?.title ?? "",
    starts_at: allDay
      ? localDate(start, timeZone)
      : toZonedDateTimeInput(start, timeZone),
    ends_at: entry?.ends_at
      ? allDay
        ? localDate(entry.ends_at, timeZone)
        : toZonedDateTimeInput(entry.ends_at, timeZone)
      : "",
    all_day: allDay,
    description: entry?.detail ?? "",
  };
}

function requiredText(value: string, label: string, maximum: number): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${label} is required.`);
  if (trimmed.length > maximum)
    throw new Error(`${label} must be at most ${maximum} characters.`);
  return trimmed;
}

function nullableText(value: string, maximum: number): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > maximum)
    throw new Error(`Description must be at most ${maximum} characters.`);
  return trimmed;
}

function instant(
  value: string,
  allDay: boolean,
  timeZone: string,
  label: string,
): string {
  return zonedDateTimeToUtc(allDay ? `${value}T00:00` : value, timeZone, label);
}

export function buildHorizonInput(
  draft: HorizonDraft,
  timeZone = detectedTimeZone(),
): CreateHorizonItemInput {
  const starts_at = instant(draft.starts_at, draft.all_day, timeZone, "Start");
  const ends_at = draft.ends_at.trim()
    ? instant(draft.ends_at, draft.all_day, timeZone, "End")
    : null;
  if (ends_at && Date.parse(ends_at) < Date.parse(starts_at)) {
    throw new Error("End cannot be before start.");
  }
  return {
    title: requiredText(draft.title, "Title", 200),
    starts_at,
    ends_at,
    all_day: draft.all_day,
    description: nullableText(draft.description, 4_000),
  };
}

function sameInstant(left: unknown, right: unknown): boolean {
  if (left === null || right === null) return left === right;
  if (typeof left !== "string" || typeof right !== "string") return false;
  const leftTime = Date.parse(left);
  const rightTime = Date.parse(right);
  return (
    Number.isFinite(leftTime) &&
    Number.isFinite(rightTime) &&
    leftTime === rightTime
  );
}

export function changedHorizonFields(
  input: CreateHorizonItemInput,
  entry: HorizonEntry,
): UpdateHorizonItemInput {
  return Object.fromEntries(
    Object.entries(input).filter(([key, value]) => {
      const original =
        key === "description" ? entry.detail : entry[key as keyof HorizonEntry];
      return key === "starts_at" || key === "ends_at"
        ? !sameInstant(value, original)
        : value !== original;
    }),
  );
}

export function horizonWriteError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404)
      return "This calendar block no longer exists. Refresh Horizon and try again.";
    if (error.status === 409)
      return "The calendar block conflicts with current server data. Refresh and try again.";
    if (error.status === 422)
      return "The server rejected these calendar values. Review the fields and try again.";
    return error.message;
  }
  return error instanceof Error
    ? error.message
    : "Could not save the calendar block.";
}
