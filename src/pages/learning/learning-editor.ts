import * as api from "@/lib/api/learning.ts";
import { ApiError } from "@/lib/api/errors.ts";
import type { LearningRoadmap, ReadingEntry, Status } from "@/lib/api/types.ts";

export const roadmapStatuses = [
  "active",
  "paused",
  "completed",
  "archived",
] as const satisfies readonly Status[];

export type LearningTarget =
  | { kind: "roadmap"; record?: LearningRoadmap }
  | { kind: "reading"; record?: ReadingEntry };

export type LearningDraft = Record<string, string>;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** datetime-local is for display only; requests always send a UTC instant. */
export function toLocalDateTimeValue(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toUtcIso(value: string, label: string): string {
  const date = new Date(value);
  if (!value || !Number.isFinite(date.getTime())) {
    throw new Error(`${label} must be a valid date and time.`);
  }
  return date.toISOString();
}

function nullableUtcIso(value: string, label: string): string | null {
  return value.trim() === "" ? null : toUtcIso(value, label);
}

function text(value: string, label: string, maxLength: number): string {
  const trimmed = value.trim();
  if (!trimmed || value.length > maxLength) {
    throw new Error(
      `${label} is required and must be at most ${maxLength} characters.`,
    );
  }
  return trimmed;
}

function wholeNumber(value: string, label: string): number {
  if (!/^\d+$/.test(value)) {
    throw new Error(`${label} must be a nonnegative whole number.`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${label} must be a safe whole number.`);
  }
  return parsed;
}

function choice<T extends string>(
  value: string,
  values: readonly T[],
  label: string,
): T {
  if (!values.includes(value as T)) throw new Error(`Choose a valid ${label}.`);
  return value as T;
}

export function tags(value: string): string[] {
  if (!value.trim()) return [];
  const result = value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  if (result.length > 20) {
    throw new Error("A reading entry may have at most 20 tags.");
  }
  if (result.some((tag) => tag.length > 50)) {
    throw new Error("Each tag must be at most 50 characters.");
  }
  return result;
}

export function initialDraft(target: LearningTarget): LearningDraft {
  if (target.kind === "roadmap") {
    return {
      name: target.record?.name ?? "",
      goal: target.record?.goal ?? "",
      status: target.record?.status ?? "active",
    };
  }

  return {
    title: target.record?.title ?? "",
    author: target.record?.author ?? "",
    pages_total: target.record?.pages_total.toString() ?? "",
    pages_read: target.record?.pages_read.toString() ?? "0",
    words_per_minute: target.record?.words_per_minute.toString() ?? "0",
    started_at: target.record
      ? toLocalDateTimeValue(target.record.started_at)
      : toLocalDateTimeValue(new Date().toISOString()),
    completed_at: target.record?.completed_at
      ? toLocalDateTimeValue(target.record.completed_at)
      : "",
    tags: target.record?.tags.join(", ") ?? "",
  };
}

export function buildLearningInput(
  target: LearningTarget,
  values: LearningDraft,
): api.CreateRoadmapInput | api.CreateReadingEntryInput {
  if (target.kind === "roadmap") {
    return {
      name: text(values.name, "Name", 200),
      goal: text(values.goal, "Goal", 4000),
      status: choice(values.status, roadmapStatuses, "roadmap status"),
    };
  }

  return {
    title: text(values.title, "Title", 500),
    author: text(values.author, "Author", 200),
    pages_total: wholeNumber(values.pages_total, "Total pages"),
    pages_read: wholeNumber(values.pages_read, "Pages read"),
    words_per_minute: wholeNumber(values.words_per_minute, "Words per minute"),
    started_at: toUtcIso(values.started_at, "Started at"),
    completed_at: nullableUtcIso(values.completed_at, "Completed at"),
    tags: tags(values.tags),
  };
}

function same(left: unknown, right: unknown, key: string): boolean {
  if (
    (key === "started_at" || key === "completed_at") &&
    typeof left === "string" &&
    typeof right === "string"
  ) {
    const leftTime = Date.parse(left);
    const rightTime = Date.parse(right);
    if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) {
      return leftTime === rightTime;
    }
  }
  return Array.isArray(left) && Array.isArray(right)
    ? JSON.stringify(left) === JSON.stringify(right)
    : left === right;
}

export function changedFields<T extends object>(
  input: T,
  original: object,
): Partial<T> {
  const record = original as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(input).filter(
      ([key, value]) => !same(value, record[key], key),
    ),
  ) as Partial<T>;
}

export async function saveLearningResource(
  target: LearningTarget,
  values: LearningDraft,
) {
  const input = buildLearningInput(target, values);
  if (target.kind === "roadmap") {
    const roadmap = input as api.CreateRoadmapInput;
    return target.record
      ? api.updateRoadmap(
          target.record.id,
          changedFields(roadmap, target.record),
        )
      : api.createRoadmap(roadmap);
  }
  const entry = input as api.CreateReadingEntryInput;
  return target.record
    ? api.updateReadingEntry(
        target.record.id,
        changedFields(entry, target.record),
      )
    : api.createReadingEntry(entry);
}

export function removeLearningResource(target: LearningTarget): Promise<void> {
  if (!target.record) throw new Error("Select a saved record first.");
  return target.kind === "roadmap"
    ? api.deleteRoadmap(target.record.id)
    : api.deleteReadingEntry(target.record.id);
}

export function learningWriteError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404)
      return "This Learning record no longer exists. Refresh and try again.";
    if (error.status === 409)
      return "The backend rejected this change because it conflicts with related Learning data.";
    if (error.status === 422)
      return "The backend rejected these values. Check the required fields, counts, tags, and timestamps.";
    if (
      error.status === 503 ||
      error.code === "network" ||
      error.code === "timeout"
    ) {
      return "The backend could not confirm this change. Refresh and check whether it was saved before retrying.";
    }
  }
  return error instanceof Error
    ? error.message
    : "Could not save the Learning change.";
}
