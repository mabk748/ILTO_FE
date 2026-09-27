import { ApiError } from "@/lib/api/errors.ts";
import type {
  AssessmentAttempt,
  LearningBottleneck,
  LearningGoal,
  LearningMilestone,
  Priority,
  StudySchedule,
  StudySession,
  WeeklyReview,
} from "@/lib/api/types.ts";
import type {
  CreateAssessmentAttemptInput,
  CreateBottleneckInput,
  CreateLearningGoalInput,
  CreateLearningMilestoneInput,
  CreateStudyScheduleInput,
  CreateStudySessionInput,
  CreateWeeklyReviewInput,
} from "@/lib/api/learning.ts";
import { detectedTimeZone } from "@/lib/time-zone.ts";

export const learningGoalTypes = [
  "certification",
  "language",
  "course",
  "skill",
] as const;
export const learningGoalStatuses = [
  "planned",
  "active",
  "paused",
  "completed",
] as const;
export const studySessionTypes = [
  "study",
  "practice_questions",
  "mock_exam",
  "practical_project",
  "review",
  "language",
  "other",
] as const;
export const assessmentTypes = [
  "baseline",
  "question_set",
  "mock_exam",
  "real_exam",
] as const;
export const bottleneckStatuses = ["open", "improving", "resolved"] as const;
export const learningMilestoneStatuses = ["planned", "completed"] as const;
export const learningPriorities = [
  "low",
  "medium",
  "high",
  "critical",
] as const;

export type LearningGoalDraft = Record<
  | "title"
  | "provider"
  | "type"
  | "status"
  | "start_date"
  | "target_date"
  | "exam_date"
  | "phase"
  | "description"
  | "priority"
  | "linked_project_id",
  string
>;

export type StudyScheduleDraft = Record<
  | "learning_goal_id"
  | "weekday"
  | "session_type"
  | "planned_minutes"
  | "topic"
  | "notes"
  | "start_date"
  | "end_date"
  | "linked_project_id",
  string
> & { active: boolean };

export type StudySessionDraft = Record<
  | "learning_goal_id"
  | "date"
  | "session_type"
  | "planned_minutes"
  | "actual_minutes"
  | "topic"
  | "notes"
  | "linked_project_id"
  | "bottleneck_id"
  | "study_schedule_id",
  string
> & { completed: boolean };

export type AssessmentDraft = Record<
  | "learning_goal_id"
  | "date"
  | "assessment_type"
  | "score_percent"
  | "source"
  | "notes"
  | "duration_minutes",
  string
>;

export type BottleneckDraft = Record<
  | "learning_goal_id"
  | "assessment_attempt_id"
  | "topic"
  | "description"
  | "priority"
  | "status",
  string
>;

export type MilestoneDraft = Record<
  "learning_goal_id" | "title" | "target_date" | "status",
  string
>;

export type WeeklyReviewDraft = Record<
  | "week_start"
  | "learning_goal_id"
  | "learned"
  | "can_do_now"
  | "main_bottleneck"
  | "applied_to_project"
  | "next_week_focus",
  string
>;

function required(value: string, label: string, maximum = 4_000): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${label} is required.`);
  if (trimmed.length > maximum) {
    throw new Error(`${label} must be at most ${maximum} characters.`);
  }
  return trimmed;
}

function optional(value: string, maximum = 4_000): string {
  const trimmed = value.trim();
  if (trimmed.length > maximum) {
    throw new Error(`This value must be at most ${maximum} characters.`);
  }
  return trimmed;
}

function nullable(value: string, maximum = 4_000): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > maximum) {
    throw new Error(`This value must be at most ${maximum} characters.`);
  }
  return trimmed;
}

function dateOnly(value: string, label: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} must be a valid calendar date.`);
  }
  const parsed = new Date(`${value}T12:00:00Z`);
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw new Error(`${label} must be a valid calendar date.`);
  }
  return value;
}

function wholeNumber(
  value: string,
  label: string,
  minimum: number,
  maximum: number,
): number {
  if (!/^\d+$/.test(value)) throw new Error(`${label} must be a whole number.`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${label} must be from ${minimum} through ${maximum}.`);
  }
  return parsed;
}

function decimalNumber(
  value: string,
  label: string,
  minimum: number,
  maximum: number,
): number {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) {
    throw new Error(
      `${label} must be a number with at most two decimal places.`,
    );
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${label} must be from ${minimum} through ${maximum}.`);
  }
  return parsed;
}

function choose<T extends string>(
  value: string,
  choices: readonly T[],
  label: string,
): T {
  if (!choices.includes(value as T))
    throw new Error(`Choose a valid ${label}.`);
  return value as T;
}

function assertOrder(start: string, end: string, label: string): void {
  if (start > end)
    throw new Error(`${label} must not be before the start date.`);
}

export function goalDraft(
  goal?: LearningGoal,
  timeZone = detectedTimeZone(),
): LearningGoalDraft {
  const today = dateKeyInTimeZone(new Date(), timeZone);
  return {
    title: goal?.title ?? "",
    provider: goal?.provider ?? "",
    type: goal?.type ?? "certification",
    status: goal?.status ?? "planned",
    start_date: goal?.start_date ?? today,
    target_date: goal?.target_date ?? "",
    exam_date: goal?.exam_date ?? "",
    phase: goal?.phase ?? "",
    description: goal?.description ?? "",
    priority: goal?.priority ?? "medium",
    linked_project_id: goal?.linked_project_id ?? "",
  };
}

export function goalInput(values: LearningGoalDraft): CreateLearningGoalInput {
  const startDate = dateOnly(values.start_date, "Start date");
  const targetDate = values.target_date
    ? dateOnly(values.target_date, "Target date")
    : null;
  if (targetDate) assertOrder(startDate, targetDate, "Target date");
  const examDate = values.exam_date
    ? dateOnly(values.exam_date, "Exam date")
    : null;
  return {
    title: required(values.title, "Title", 200),
    provider: required(values.provider, "Provider", 200),
    type: choose(values.type, learningGoalTypes, "goal type"),
    status: choose(values.status, learningGoalStatuses, "goal status"),
    start_date: startDate,
    target_date: targetDate,
    exam_date: examDate,
    phase: nullable(values.phase, 100),
    description: required(values.description, "Description"),
    priority: choose(values.priority, learningPriorities, "priority"),
    linked_project_id: values.linked_project_id || null,
  };
}

export function scheduleDraft(
  schedule?: StudySchedule,
  defaults: Partial<StudyScheduleDraft> = {},
  timeZone = detectedTimeZone(),
): StudyScheduleDraft {
  return {
    learning_goal_id:
      schedule?.learning_goal_id ?? defaults.learning_goal_id ?? "",
    weekday: schedule?.weekday.toString() ?? defaults.weekday ?? "0",
    session_type: schedule?.session_type ?? defaults.session_type ?? "study",
    planned_minutes:
      schedule?.planned_minutes.toString() ?? defaults.planned_minutes ?? "60",
    topic: schedule?.topic ?? defaults.topic ?? "",
    notes: schedule?.notes ?? defaults.notes ?? "",
    start_date:
      schedule?.start_date ??
      defaults.start_date ??
      dateKeyInTimeZone(new Date(), timeZone),
    end_date: schedule?.end_date ?? defaults.end_date ?? "",
    active: schedule?.active ?? defaults.active ?? true,
    linked_project_id:
      schedule?.linked_project_id ?? defaults.linked_project_id ?? "",
  };
}

export function scheduleInput(
  values: StudyScheduleDraft,
): CreateStudyScheduleInput {
  const startDate = dateOnly(values.start_date, "Start date");
  const endDate = values.end_date
    ? dateOnly(values.end_date, "End date")
    : null;
  if (endDate) assertOrder(startDate, endDate, "End date");
  return {
    learning_goal_id: required(values.learning_goal_id, "Learning goal", 36),
    weekday: wholeNumber(values.weekday, "Weekday", 0, 6),
    session_type: choose(
      values.session_type,
      studySessionTypes,
      "session type",
    ),
    planned_minutes: wholeNumber(
      values.planned_minutes,
      "Planned minutes",
      0,
      1_000_000,
    ),
    topic: required(values.topic, "Topic", 300),
    notes: optional(values.notes),
    start_date: startDate,
    end_date: endDate,
    active: values.active,
    linked_project_id: values.linked_project_id || null,
  };
}

export function sessionDraft(
  session?: StudySession,
  defaults: Partial<StudySessionDraft> = {},
  timeZone = detectedTimeZone(),
): StudySessionDraft {
  return {
    learning_goal_id:
      session?.learning_goal_id ?? defaults.learning_goal_id ?? "",
    date:
      session?.date ?? defaults.date ?? dateKeyInTimeZone(new Date(), timeZone),
    session_type: session?.session_type ?? defaults.session_type ?? "study",
    planned_minutes:
      session?.planned_minutes.toString() ?? defaults.planned_minutes ?? "60",
    actual_minutes:
      session?.actual_minutes.toString() ?? defaults.actual_minutes ?? "0",
    topic: session?.topic ?? defaults.topic ?? "",
    notes: session?.notes ?? defaults.notes ?? "",
    completed: session?.completed ?? defaults.completed ?? false,
    linked_project_id:
      session?.linked_project_id ?? defaults.linked_project_id ?? "",
    bottleneck_id: session?.bottleneck_id ?? defaults.bottleneck_id ?? "",
    study_schedule_id:
      session?.study_schedule_id ?? defaults.study_schedule_id ?? "",
  };
}

export function sessionInput(
  values: StudySessionDraft,
): CreateStudySessionInput {
  return {
    learning_goal_id: required(values.learning_goal_id, "Learning goal", 36),
    date: dateOnly(values.date, "Session date"),
    session_type: choose(
      values.session_type,
      studySessionTypes,
      "session type",
    ),
    planned_minutes: wholeNumber(
      values.planned_minutes,
      "Planned minutes",
      0,
      1_000_000,
    ),
    actual_minutes: wholeNumber(
      values.actual_minutes,
      "Actual minutes",
      0,
      1_000_000,
    ),
    topic: required(values.topic, "Topic", 300),
    notes: optional(values.notes),
    completed: values.completed,
    linked_project_id: values.linked_project_id || null,
    bottleneck_id: values.bottleneck_id || null,
    study_schedule_id: values.study_schedule_id || null,
  };
}

export function assessmentDraft(
  assessment?: AssessmentAttempt,
  learningGoalId = "",
  timeZone = detectedTimeZone(),
): AssessmentDraft {
  return {
    learning_goal_id: assessment?.learning_goal_id ?? learningGoalId,
    date: assessment?.date ?? dateKeyInTimeZone(new Date(), timeZone),
    assessment_type: assessment?.assessment_type ?? "question_set",
    score_percent: assessment?.score_percent.toString() ?? "",
    source: assessment?.source ?? "",
    notes: assessment?.notes ?? "",
    duration_minutes: assessment?.duration_minutes?.toString() ?? "",
  };
}

export function assessmentInput(
  values: AssessmentDraft,
): CreateAssessmentAttemptInput {
  return {
    learning_goal_id: required(values.learning_goal_id, "Learning goal", 36),
    date: dateOnly(values.date, "Assessment date"),
    assessment_type: choose(
      values.assessment_type,
      assessmentTypes,
      "assessment type",
    ),
    score_percent: decimalNumber(values.score_percent, "Score", 0, 100),
    source: nullable(values.source, 300),
    notes: optional(values.notes),
    duration_minutes: values.duration_minutes
      ? wholeNumber(values.duration_minutes, "Duration", 0, 1_000_000)
      : null,
  };
}

export function bottleneckDraft(
  bottleneck?: LearningBottleneck,
  defaults: Partial<BottleneckDraft> = {},
): BottleneckDraft {
  return {
    learning_goal_id:
      bottleneck?.learning_goal_id ?? defaults.learning_goal_id ?? "",
    assessment_attempt_id:
      bottleneck?.assessment_attempt_id ?? defaults.assessment_attempt_id ?? "",
    topic: bottleneck?.topic ?? defaults.topic ?? "",
    description: bottleneck?.description ?? defaults.description ?? "",
    priority: bottleneck?.priority ?? defaults.priority ?? "medium",
    status: bottleneck?.status ?? defaults.status ?? "open",
  };
}

export function bottleneckInput(
  values: BottleneckDraft,
): CreateBottleneckInput {
  return {
    learning_goal_id: required(values.learning_goal_id, "Learning goal", 100),
    assessment_attempt_id: values.assessment_attempt_id || null,
    topic: required(values.topic, "Topic", 300),
    description: optional(values.description),
    priority: choose(values.priority, learningPriorities, "priority"),
    status: choose(values.status, bottleneckStatuses, "bottleneck status"),
  };
}

export function milestoneDraft(
  milestone?: LearningMilestone,
  learningGoalId = "",
  timeZone = detectedTimeZone(),
): MilestoneDraft {
  return {
    learning_goal_id: milestone?.learning_goal_id ?? learningGoalId,
    title: milestone?.title ?? "",
    target_date:
      milestone?.target_date ?? dateKeyInTimeZone(new Date(), timeZone),
    status: milestone?.status ?? "planned",
  };
}

export function milestoneInput(
  values: MilestoneDraft,
): CreateLearningMilestoneInput {
  return {
    learning_goal_id: required(values.learning_goal_id, "Learning goal", 100),
    title: required(values.title, "Title", 300),
    target_date: dateOnly(values.target_date, "Target date"),
    status: choose(
      values.status,
      learningMilestoneStatuses,
      "milestone status",
    ),
  };
}

export function reviewDraft(
  review?: WeeklyReview,
  weekStart?: string,
  timeZone = detectedTimeZone(),
): WeeklyReviewDraft {
  return {
    week_start:
      review?.week_start ??
      weekStart ??
      currentWeekDays(new Date(), timeZone)[0].date,
    learning_goal_id: review?.learning_goal_id ?? "",
    learned: review?.learned ?? "",
    can_do_now: review?.can_do_now ?? "",
    main_bottleneck: review?.main_bottleneck ?? "",
    applied_to_project: review?.applied_to_project ?? "",
    next_week_focus: review?.next_week_focus ?? "",
  };
}

export function reviewInput(
  values: WeeklyReviewDraft,
): CreateWeeklyReviewInput {
  const weekStart = dateOnly(values.week_start, "Week start");
  if (new Date(`${weekStart}T12:00:00Z`).getUTCDay() !== 1) {
    throw new Error("Week start must be a Monday.");
  }
  return {
    week_start: weekStart,
    learning_goal_id: values.learning_goal_id || null,
    learned: optional(values.learned),
    can_do_now: optional(values.can_do_now),
    main_bottleneck: optional(values.main_bottleneck),
    applied_to_project: optional(values.applied_to_project),
    next_week_focus: optional(values.next_week_focus),
    notes: "",
  };
}

function comparable(value: unknown): unknown {
  return value ?? null;
}

export function changedLearningFields<T extends object>(
  next: T,
  original: object,
): Partial<T> {
  const previous = original as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(next).filter(
      ([key, value]) => comparable(value) !== comparable(previous[key]),
    ),
  ) as Partial<T>;
}

export function learningPlanError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return "This Learning record, goal, assessment, or linked project is no longer available for the signed-in user.";
    }
    if (error.status === 409) {
      return "This change conflicts with related Learning records. Refresh before trying again.";
    }
    if (error.status === 422) {
      return "The backend rejected these values. Check dates, durations, score, status, and selected relationships.";
    }
    if (error.status === 503 || error.code === "network") {
      return "The Learning service is unavailable. Nothing was marked as saved.";
    }
    if (error.code === "timeout") {
      return "The Learning request timed out. Refresh before retrying to check whether it was saved.";
    }
  }
  return error instanceof Error
    ? error.message
    : "Could not save this Learning change.";
}

export function dateKeyInTimeZone(
  value: string | number | Date,
  timeZone: string,
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export interface WeekDay {
  date: string;
  label: string;
  shortLabel: string;
}

export function currentWeekDays(
  now: Date = new Date(),
  timeZone = detectedTimeZone(),
): WeekDay[] {
  const localDate = dateKeyInTimeZone(now, timeZone);
  const anchor = new Date(`${localDate}T12:00:00Z`);
  const mondayOffset = (anchor.getUTCDay() + 6) % 7;
  anchor.setUTCDate(anchor.getUTCDate() - mondayOffset);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(anchor);
    date.setUTCDate(anchor.getUTCDate() + index);
    return {
      date: date.toISOString().slice(0, 10),
      label: new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(date),
      shortLabel: new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        timeZone: "UTC",
      }).format(date),
    };
  });
}

export function priorityRank(priority: Priority): number {
  return { critical: 4, high: 3, medium: 2, low: 1 }[priority];
}

export function sortBottlenecks(
  bottlenecks: readonly LearningBottleneck[],
): LearningBottleneck[] {
  return [...bottlenecks].sort(
    (left, right) =>
      priorityRank(right.priority) - priorityRank(left.priority) ||
      Date.parse(right.created_at) - Date.parse(left.created_at) ||
      left.id.localeCompare(right.id),
  );
}

export function sessionTypeLabel(value: StudySession["session_type"]): string {
  return value.replaceAll("_", " ");
}
