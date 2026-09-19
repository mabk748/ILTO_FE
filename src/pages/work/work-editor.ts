import * as api from "@/lib/api/work.ts";
import { ApiError } from "@/lib/api/errors.ts";
import type {
  Certification,
  CertStatus,
  Priority,
  WorkDeadline,
} from "@/lib/api/types.ts";

export const deadlinePriorities = [
  "low",
  "medium",
  "high",
  "critical",
] as const satisfies readonly Priority[];
export const deadlineStatuses = ["pending", "completed"] as const;
export const certificationStatuses = [
  "planned",
  "in_progress",
  "completed",
  "expired",
] as const satisfies readonly CertStatus[];

export type WorkTarget =
  | { kind: "deadline"; record?: WorkDeadline }
  | { kind: "certification"; record?: Certification };
export type WorkDraft = Record<string, string>;

export function toLocalDateTimeValue(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
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

function optionalText(value: string, label: string, maxLength: number): string {
  if (value.length > maxLength) {
    throw new Error(`${label} must be at most ${maxLength} characters.`);
  }
  return value.trim();
}

function decimal(value: string, label: string): number {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) {
    throw new Error(
      `${label} must be a nonnegative number with at most two decimals.`,
    );
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed > 100_000) {
    throw new Error(`${label} must be between 0 and 100000.`);
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

export function initialDraft(target: WorkTarget): WorkDraft {
  if (target.kind === "deadline") {
    return {
      title: target.record?.title ?? "",
      project_or_context: target.record?.project_or_context ?? "",
      due_date: target.record
        ? toLocalDateTimeValue(target.record.due_date)
        : toLocalDateTimeValue(new Date().toISOString()),
      priority: target.record?.priority ?? "medium",
      status: target.record?.status === "completed" ? "completed" : "pending",
      notes: target.record?.notes ?? "",
    };
  }
  return {
    name: target.record?.name ?? "",
    provider: target.record?.provider ?? "",
    status: target.record?.status ?? "planned",
    exam_date: target.record?.exam_date
      ? toLocalDateTimeValue(target.record.exam_date)
      : "",
    expiry_date: target.record?.expiry_date
      ? toLocalDateTimeValue(target.record.expiry_date)
      : "",
    study_hours_logged: target.record?.study_hours_logged.toString() ?? "0",
    study_hours_target: target.record?.study_hours_target.toString() ?? "0",
  };
}

export function buildWorkInput(
  target: WorkTarget,
  values: WorkDraft,
): api.CreateDeadlineInput | api.CreateCertificationInput {
  if (target.kind === "deadline") {
    return {
      title: text(values.title, "Title", 200),
      project_or_context: text(
        values.project_or_context,
        "Project or context",
        300,
      ),
      due_date: toUtcIso(values.due_date, "Due date"),
      priority: choice(values.priority, deadlinePriorities, "priority"),
      status: choice(values.status, deadlineStatuses, "deadline status"),
      notes: optionalText(values.notes, "Notes", 4000),
    };
  }
  return {
    name: text(values.name, "Name", 200),
    provider: text(values.provider, "Provider", 200),
    status: choice(
      values.status,
      certificationStatuses,
      "certification status",
    ),
    exam_date: nullableUtcIso(values.exam_date, "Exam date"),
    expiry_date: nullableUtcIso(values.expiry_date, "Expiry date"),
    study_hours_logged: decimal(
      values.study_hours_logged,
      "Logged study hours",
    ),
    study_hours_target: decimal(
      values.study_hours_target,
      "Target study hours",
    ),
  };
}

function same(left: unknown, right: unknown, key: string): boolean {
  if (key === "due_date" || key === "exam_date" || key === "expiry_date") {
    const leftTime = typeof left === "string" ? Date.parse(left) : NaN;
    const rightTime = typeof right === "string" ? Date.parse(right) : NaN;
    if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) {
      return leftTime === rightTime;
    }
  }
  // `overdue` is derived by the server. The form exposes it as the editable
  // open state (`pending`), so that representation is a no-op when unchanged.
  if (key === "status" && left === "pending" && right === "overdue")
    return true;
  return left === right;
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

export async function saveWorkResource(target: WorkTarget, values: WorkDraft) {
  const input = buildWorkInput(target, values);
  if (target.kind === "deadline") {
    return target.record
      ? api.updateDeadline(
          target.record.id,
          changedFields(input as api.CreateDeadlineInput, target.record),
        )
      : api.createDeadline(input as api.CreateDeadlineInput);
  }
  return target.record
    ? api.updateCertification(
        target.record.id,
        changedFields(input as api.CreateCertificationInput, target.record),
      )
    : api.createCertification(input as api.CreateCertificationInput);
}

export function removeWorkResource(target: WorkTarget): Promise<void> {
  if (!target.record) throw new Error("Select a saved record first.");
  return target.kind === "deadline"
    ? api.deleteDeadline(target.record.id)
    : api.deleteCertification(target.record.id);
}

export function workWriteError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404)
      return "This Work record no longer exists. Refresh and try again.";
    if (error.status === 409)
      return "The backend rejected this change because it conflicts with related Work data.";
    if (error.status === 422)
      return "The backend rejected these values. Check the required fields, ranges, status, and timestamps.";
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
    : "Could not save the Work change.";
}
