import * as api from "@/lib/api/health.ts";
import { ApiError } from "@/lib/api/errors.ts";
import type {
  HealthMetric,
  Status,
  TrainingPlan,
  WorkoutSession,
  WorkoutType,
} from "@/lib/api/types.ts";

export const planStatuses = [
  "active",
  "paused",
  "completed",
  "archived",
] as const satisfies readonly Status[];
export const workoutTypes = [
  "strength",
  "cardio",
  "flexibility",
  "hiit",
  "rest",
] as const satisfies readonly WorkoutType[];

export type HealthTarget =
  | { kind: "plan"; record?: TrainingPlan }
  | { kind: "workout"; record?: WorkoutSession }
  | { kind: "metric"; record?: HealthMetric };

export type HealthDraft = Record<string, string>;

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

function integer(
  value: string,
  label: string,
  min: number,
  max: number,
): number {
  if (!/^\d+$/.test(value)) {
    throw new Error(`${label} must be a whole number.`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${label} must be between ${min} and ${max}.`);
  }
  return parsed;
}

function decimal(
  value: string,
  label: string,
  min: number,
  max: number,
  allowZero = true,
): number {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) {
    throw new Error(`${label} must be a number with at most two decimals.`);
  }
  const parsed = Number(value);
  if (
    !Number.isFinite(parsed) ||
    (allowZero ? parsed < min : parsed <= min) ||
    parsed > max
  ) {
    throw new Error(`${label} must be greater than ${min} and at most ${max}.`);
  }
  return parsed;
}

function nullableDecimal(
  value: string,
  label: string,
  min: number,
  max: number,
  allowZero = true,
): number | null {
  return value.trim() === ""
    ? null
    : decimal(value, label, min, max, allowZero);
}

function nullableInteger(
  value: string,
  label: string,
  min: number,
  max: number,
): number | null {
  return value.trim() === "" ? null : integer(value, label, min, max);
}

function choice<T extends string>(
  value: string,
  values: readonly T[],
  label: string,
): T {
  if (!values.includes(value as T)) throw new Error(`Choose a valid ${label}.`);
  return value as T;
}

export function initialDraft(target: HealthTarget): HealthDraft {
  if (target.kind === "plan") {
    return {
      name: target.record?.name ?? "",
      goal: target.record?.goal ?? "",
      weeks_total: target.record?.weeks_total.toString() ?? "",
      week_current: target.record?.week_current.toString() ?? "1",
      status: target.record?.status ?? "active",
    };
  }
  if (target.kind === "workout") {
    return {
      plan_id: target.record?.plan_id ?? "",
      type: target.record?.type ?? "strength",
      name: target.record?.name ?? "",
      duration_minutes: target.record?.duration_minutes.toString() ?? "0",
      rpe: target.record?.rpe.toString() ?? "1",
      completed_at: target.record
        ? toLocalDateTimeValue(target.record.completed_at)
        : toLocalDateTimeValue(new Date().toISOString()),
      notes: target.record?.notes ?? "",
    };
  }
  const metric = target.record;
  return {
    date: metric
      ? toLocalDateTimeValue(metric.date)
      : toLocalDateTimeValue(new Date().toISOString()),
    weight_kg: metric?.weight_kg?.toString() ?? "",
    sleep_hours: metric?.sleep_hours?.toString() ?? "",
    resting_hr: metric?.resting_hr?.toString() ?? "",
    hrv: metric?.hrv?.toString() ?? "",
    steps: metric?.steps?.toString() ?? "",
    calories_consumed: metric?.calories_consumed?.toString() ?? "",
  };
}

export function buildHealthInput(
  target: HealthTarget,
  values: HealthDraft,
  planIds: string[],
):
  | api.CreateTrainingPlanInput
  | api.CreateWorkoutSessionInput
  | api.CreateHealthMetricInput {
  if (target.kind === "plan") {
    const weeksTotal = integer(values.weeks_total, "Total weeks", 1, 520);
    const weekCurrent = integer(
      values.week_current,
      "Current week",
      1,
      weeksTotal,
    );
    return {
      name: text(values.name, "Name", 200),
      goal: text(values.goal, "Goal", 4000),
      weeks_total: weeksTotal,
      week_current: weekCurrent,
      status: choice(values.status, planStatuses, "plan status"),
    };
  }
  if (target.kind === "workout") {
    const planId = values.plan_id.trim() || null;
    if (planId !== null && !planIds.includes(planId)) {
      throw new Error(
        "Choose an existing training plan or leave it unassigned.",
      );
    }
    return {
      plan_id: planId,
      type: choice(values.type, workoutTypes, "workout type"),
      name: text(values.name, "Name", 200),
      duration_minutes: integer(values.duration_minutes, "Duration", 0, 1440),
      rpe: integer(values.rpe, "RPE", 1, 10),
      completed_at: toUtcIso(values.completed_at, "Completed date"),
      notes: optionalText(values.notes, "Notes", 4000),
    };
  }

  const input: api.CreateHealthMetricInput = {
    date: toUtcIso(values.date, "Metric date"),
    weight_kg: nullableDecimal(values.weight_kg, "Weight", 0, 1000, false),
    sleep_hours: nullableDecimal(values.sleep_hours, "Sleep", 0, 24),
    resting_hr: nullableInteger(
      values.resting_hr,
      "Resting heart rate",
      1,
      300,
    ),
    hrv: nullableDecimal(values.hrv, "HRV", 0, 10000),
    steps: nullableInteger(values.steps, "Steps", 0, 1_000_000),
    calories_consumed: nullableInteger(
      values.calories_consumed,
      "Calories consumed",
      0,
      100_000,
    ),
  };
  if (
    Object.values(input)
      .slice(1)
      .every((value) => value === null)
  ) {
    throw new Error("Enter at least one health measurement.");
  }
  return input;
}

function same(left: unknown, right: unknown, key: string): boolean {
  if (key === "date" || key === "completed_at") {
    const leftTime = typeof left === "string" ? Date.parse(left) : NaN;
    const rightTime = typeof right === "string" ? Date.parse(right) : NaN;
    if (Number.isFinite(leftTime) && Number.isFinite(rightTime))
      return leftTime === rightTime;
  }
  return left === right;
}

export function changedFields<T extends object>(
  input: T,
  original: T,
): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(
      ([key, value]) => !same(value, original[key as keyof T], key),
    ),
  ) as Partial<T>;
}

export async function saveHealthResource(
  target: HealthTarget,
  values: HealthDraft,
  planIds: string[],
) {
  const input = buildHealthInput(target, values, planIds);
  if (target.kind === "plan") {
    return target.record
      ? api.updateTrainingPlan(
          target.record.id,
          changedFields(input as api.CreateTrainingPlanInput, target.record),
        )
      : api.createTrainingPlan(input as api.CreateTrainingPlanInput);
  }
  if (target.kind === "workout") {
    return target.record
      ? api.updateWorkoutSession(
          target.record.id,
          changedFields(input as api.CreateWorkoutSessionInput, target.record),
        )
      : api.createWorkoutSession(input as api.CreateWorkoutSessionInput);
  }
  return target.record
    ? api.updateHealthMetric(
        target.record.id,
        changedFields(input as api.CreateHealthMetricInput, target.record),
      )
    : api.createHealthMetric(input as api.CreateHealthMetricInput);
}

export function removeHealthResource(target: HealthTarget): Promise<void> {
  if (!target.record) throw new Error("Select a saved record first.");
  if (target.kind === "plan") return api.deleteTrainingPlan(target.record.id);
  if (target.kind === "workout")
    return api.deleteWorkoutSession(target.record.id);
  return api.deleteHealthMetric(target.record.id);
}

export function healthWriteError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404)
      return "This Health record no longer exists. Refresh and try again.";
    if (error.status === 409)
      return "The backend rejected this change because it conflicts with related Health data.";
    if (error.status === 422)
      return "The backend rejected these values. Check the required fields, ranges, and timestamp.";
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
    : "Could not save the Health change.";
}
