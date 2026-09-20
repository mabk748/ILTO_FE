import * as api from "@/lib/api/learning.ts";
import { ApiError } from "@/lib/api/errors.ts";
import type {
  LearningRoadmap,
  ReadingEntry,
  SkillLevel,
  SkillNode,
  Status,
} from "@/lib/api/types.ts";

export const roadmapStatuses = [
  "active",
  "paused",
  "completed",
  "archived",
] as const satisfies readonly Status[];

export const skillLevels = [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
] as const satisfies readonly SkillLevel[];

export type LearningTarget =
  | { kind: "roadmap"; record?: LearningRoadmap }
  | { kind: "skill"; roadmapId?: string; record?: SkillNode }
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

function nonblank(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${label} is required.`);
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

function boundedWholeNumber(
  value: string,
  label: string,
  minimum: number,
  maximum: number,
): number {
  const parsed = wholeNumber(value, label);
  if (parsed < minimum || parsed > maximum) {
    throw new Error(`${label} must be from ${minimum} through ${maximum}.`);
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

export function resources(value: string): string[] {
  if (!value.trim()) return [];
  const result = value
    .split(/\r?\n/)
    .map((resource) => resource.trim())
    .filter(Boolean);
  if (result.length > 50) {
    throw new Error("A skill may have at most 50 resources.");
  }
  if (result.some((resource) => resource.length > 2000)) {
    throw new Error("Each resource must be at most 2,000 characters.");
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

  if (target.kind === "skill") {
    return {
      roadmap_id: target.record?.roadmap_id ?? target.roadmapId ?? "",
      name: target.record?.name ?? "",
      category: target.record?.category ?? "",
      current_level: target.record?.current_level ?? "beginner",
      target_level: target.record?.target_level ?? "beginner",
      gap_score: target.record?.gap_score.toString() ?? "0",
      resources: target.record?.resources.join("\n") ?? "",
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
  roadmaps: readonly LearningRoadmap[] = [],
): api.CreateRoadmapInput | api.CreateSkillInput | api.CreateReadingEntryInput {
  if (target.kind === "roadmap") {
    return {
      name: text(values.name, "Name", 200),
      goal: text(values.goal, "Goal", 4000),
      status: choice(values.status, roadmapStatuses, "roadmap status"),
    };
  }

  if (target.kind === "skill") {
    const roadmapId = values.roadmap_id;
    if (!roadmaps.some((roadmap) => roadmap.id === roadmapId)) {
      throw new Error(
        "Choose a roadmap returned for the current signed-in user.",
      );
    }
    return {
      roadmap_id: roadmapId,
      name: nonblank(values.name, "Name"),
      category: nonblank(values.category, "Category"),
      current_level: choice(values.current_level, skillLevels, "current level"),
      target_level: choice(values.target_level, skillLevels, "target level"),
      gap_score: boundedWholeNumber(values.gap_score, "Gap score", 0, 100),
      resources: resources(values.resources),
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
  roadmaps: readonly LearningRoadmap[] = [],
) {
  const input = buildLearningInput(target, values, roadmaps);
  if (target.kind === "roadmap") {
    const roadmap = input as api.CreateRoadmapInput;
    return target.record
      ? api.updateRoadmap(
          target.record.id,
          changedFields(roadmap, target.record),
        )
      : api.createRoadmap(roadmap);
  }
  if (target.kind === "skill") {
    const skill = input as api.CreateSkillInput;
    return target.record
      ? api.updateSkill(target.record.id, changedFields(skill, target.record))
      : api.createSkill(skill);
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
  if (target.kind === "roadmap") return api.deleteRoadmap(target.record.id);
  if (target.kind === "skill") return api.deleteSkill(target.record.id);
  return api.deleteReadingEntry(target.record.id);
}

export function learningWriteError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404)
      return "This Learning record or selected roadmap no longer exists for the signed-in user. Refresh and try again.";
    if (error.status === 409)
      return "The backend rejected this change because it conflicts with related Learning data.";
    if (error.status === 422)
      return "The backend rejected these values. Check the required fields, levels, scores, resources, counts, tags, and timestamps.";
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
