import { ApiError } from "@/lib/api/errors.ts";
import {
  type LearningImportGoalInput,
  type LearningImportGoalReference,
  type LearningImportMilestoneInput,
  type LearningImportRequest,
  type LearningImportResource,
  type LearningImportScheduleInput,
} from "@/lib/api/learning.ts";
import type {
  LearningGoal,
  LearningMilestone,
  Project,
  StudySchedule,
} from "@/lib/api/types.ts";
import {
  ImportParseError,
  MAX_IMPORT_ROWS,
  importFileFormat,
  parseImportFile,
} from "@/lib/import/file-parser.ts";
import {
  learningGoalStatuses,
  learningGoalTypes,
  learningPriorities,
  studySessionTypes,
} from "./learning-plan.ts";

export const LEARNING_IMPORT_RESOURCES = [
  "goals",
  "schedules",
  "milestones",
] as const satisfies readonly LearningImportResource[];

export const LEARNING_IMPORT_RESOURCE_LABELS: Record<
  LearningImportResource,
  string
> = {
  goals: "Goals",
  schedules: "Weekly schedules",
  milestones: "Milestones",
};

export type LearningImportSource =
  | { kind: "single"; rows: unknown[] }
  | {
      kind: "package";
      resources: Record<LearningImportResource, unknown[]>;
    };

export interface LearningImportIssue {
  level: "warning" | "error";
  field: string | null;
  code: string;
  message: string;
}

export interface LearningImportPreviewRow {
  resource: LearningImportResource;
  row: number;
  label: string;
  relationship: string;
  planning: string;
  status: "valid" | "warning" | "invalid";
  issues: LearningImportIssue[];
}

export interface LearningImportContext {
  goals: LearningGoal[];
  projects: Project[];
  schedules?: StudySchedule[];
  milestones?: LearningMilestone[];
}

export interface PreparedLearningImport {
  request: LearningImportRequest;
  rows: LearningImportPreviewRow[];
  counts: Record<LearningImportResource, number>;
  valid: number;
  warnings: number;
  invalid: number;
}

export interface LearningImportProblem {
  resource: LearningImportResource;
  row: number;
  field: string | null;
  code: string;
  message: string;
}

type JsonObject = Record<string, unknown>;

const GOAL_FIELDS = new Set([
  "import_key",
  "title",
  "provider",
  "type",
  "status",
  "start_date",
  "target_date",
  "exam_date",
  "phase",
  "description",
  "priority",
  "linked_project_id",
]);
const SCHEDULE_FIELDS = new Set([
  "goal_ref",
  "weekday",
  "session_type",
  "planned_minutes",
  "topic",
  "notes",
  "start_date",
  "end_date",
  "active",
  "linked_project_id",
]);
const MILESTONE_FIELDS = new Set([
  "goal_ref",
  "title",
  "target_date",
  "status",
]);

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function error(
  issues: LearningImportIssue[],
  field: string | null,
  code: string,
  message: string,
): void {
  issues.push({ level: "error", field, code, message });
}

function warning(
  row: LearningImportPreviewRow,
  field: string,
  code: string,
  message: string,
): void {
  row.issues.push({ level: "warning", field, code, message });
}

function updateStatus(row: LearningImportPreviewRow): void {
  row.status = row.issues.some((issue) => issue.level === "error")
    ? "invalid"
    : row.issues.some((issue) => issue.level === "warning")
      ? "warning"
      : "valid";
}

function rejectUnknownFields(
  row: JsonObject,
  fields: Set<string>,
  issues: LearningImportIssue[],
): void {
  for (const field of Object.keys(row)) {
    if (!fields.has(field)) {
      error(
        issues,
        field,
        "unknown_field",
        `${field} is not a writable field for this resource.`,
      );
    }
  }
}

function stringField(
  row: JsonObject,
  field: string,
  issues: LearningImportIssue[],
  options: {
    required?: boolean;
    nullable?: boolean;
    maximum: number;
    allowBlank?: boolean;
  },
): string | null | undefined {
  if (!Object.hasOwn(row, field)) {
    if (options.required)
      error(issues, field, "required", `${field} is required.`);
    return undefined;
  }
  const value = row[field];
  if (value === null) {
    if (options.nullable) return null;
    error(issues, field, "invalid_null", `${field} cannot be null.`);
    return undefined;
  }
  if (typeof value !== "string") {
    error(issues, field, "invalid_type", `${field} must be a string.`);
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed && !options.allowBlank) {
    error(issues, field, "blank", `${field} must not be blank.`);
    return undefined;
  }
  if (trimmed.length > options.maximum) {
    error(
      issues,
      field,
      "too_long",
      `${field} must be at most ${options.maximum} characters.`,
    );
    return undefined;
  }
  return trimmed;
}

function enumField<T extends string>(
  row: JsonObject,
  field: string,
  values: readonly T[],
  issues: LearningImportIssue[],
  required = true,
): T | undefined {
  const value = stringField(row, field, issues, {
    required,
    maximum: 100,
  });
  if (typeof value !== "string") return undefined;
  if (!values.includes(value as T)) {
    error(
      issues,
      field,
      "invalid_enum",
      `${field} must be one of: ${values.join(", ")}.`,
    );
    return undefined;
  }
  return value as T;
}

function integerField(
  row: JsonObject,
  field: string,
  issues: LearningImportIssue[],
  minimum: number,
  maximum: number,
): number | undefined {
  if (!Object.hasOwn(row, field)) {
    error(issues, field, "required", `${field} is required.`);
    return undefined;
  }
  const value = row[field];
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    error(
      issues,
      field,
      "invalid_integer",
      `${field} must be an integer from ${minimum} through ${maximum}.`,
    );
    return undefined;
  }
  return value;
}

function booleanField(
  row: JsonObject,
  field: string,
  issues: LearningImportIssue[],
): boolean | undefined {
  if (!Object.hasOwn(row, field)) return undefined;
  if (typeof row[field] !== "boolean") {
    error(issues, field, "invalid_type", `${field} must be a boolean.`);
    return undefined;
  }
  return row[field];
}

function validCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function dateField(
  row: JsonObject,
  field: string,
  issues: LearningImportIssue[],
  options: { required?: boolean; nullable?: boolean } = {},
): string | null | undefined {
  const value = stringField(row, field, issues, {
    required: options.required,
    nullable: options.nullable,
    maximum: 10,
  });
  if (value === null || value === undefined) return value;
  if (!validCalendarDate(value)) {
    error(
      issues,
      field,
      "invalid_date",
      `${field} must be a real calendar date in YYYY-MM-DD format.`,
    );
    return undefined;
  }
  return value;
}

function asRow(
  value: unknown,
  issues: LearningImportIssue[],
): JsonObject | null {
  if (isObject(value)) return value;
  error(issues, null, "invalid_row", "Each import row must be a JSON object.");
  return null;
}

function resourceRows(source: LearningImportSource): unknown[] {
  return source.kind === "single"
    ? source.rows
    : LEARNING_IMPORT_RESOURCES.flatMap(
        (resource) => source.resources[resource],
      );
}

export function parseLearningImportSource(
  fileName: string,
  text: string,
): LearningImportSource {
  if (importFileFormat(fileName) !== "json") {
    throw new ImportParseError(
      "Learning plan import currently supports JSON files only.",
    );
  }
  const parsed = parseImportFile(fileName, text);
  if (parsed.format !== "json")
    throw new ImportParseError(
      "Learning plan import currently supports JSON files only.",
    );
  const { value } = parsed;
  if (Array.isArray(value)) {
    if (value.length === 0)
      throw new ImportParseError("The JSON array has no records.");
    if (value.length > MAX_IMPORT_ROWS)
      throw new ImportParseError(
        `This file has more than the ${MAX_IMPORT_ROWS.toLocaleString()} row frontend limit.`,
      );
    return { kind: "single", rows: value };
  }
  if (!isObject(value)) {
    throw new ImportParseError(
      "Use a JSON array or a package object containing goals, schedules, and milestones.",
    );
  }
  const unknown = Object.keys(value).filter(
    (key) => !LEARNING_IMPORT_RESOURCES.includes(key as LearningImportResource),
  );
  if (unknown.length > 0) {
    throw new ImportParseError(
      `Unsupported package resource ${unknown.map((key) => `"${key}"`).join(", ")}.`,
    );
  }
  const resources = Object.fromEntries(
    LEARNING_IMPORT_RESOURCES.map((resource) => {
      const rows = value[resource] ?? [];
      if (!Array.isArray(rows)) {
        throw new ImportParseError(
          `Package resource "${resource}" must be an array.`,
        );
      }
      return [resource, rows];
    }),
  ) as Record<LearningImportResource, unknown[]>;
  const total = resourceRows({ kind: "package", resources }).length;
  if (total === 0)
    throw new ImportParseError(
      "The package must contain at least one Goal, weekly schedule, or milestone.",
    );
  if (total > MAX_IMPORT_ROWS)
    throw new ImportParseError(
      `This package has more than the ${MAX_IMPORT_ROWS.toLocaleString()} row frontend limit.`,
    );
  return { kind: "package", resources };
}

function projectReference(
  row: JsonObject,
  field: "linked_project_id",
  context: LearningImportContext,
  issues: LearningImportIssue[],
): string | null | undefined {
  if (!Object.hasOwn(row, field)) return undefined;
  if (row[field] === null) return null;
  const value = stringField(row, field, issues, {
    maximum: 200,
  });
  if (typeof value !== "string") return undefined;
  const byId = context.projects.find((project) => project.id === value);
  if (byId) return byId.id;
  const matches = context.projects.filter(
    (project) => normalized(project.name) === normalized(value),
  );
  if (matches.length === 1) return matches[0].id;
  error(
    issues,
    field,
    matches.length > 1 ? "ambiguous_reference" : "reference_unavailable",
    matches.length > 1
      ? `Project reference "${value}" is ambiguous.`
      : `Project reference "${value}" was not found.`,
  );
  return undefined;
}

function importKeys(source: LearningImportSource): Map<string, number[]> {
  const rows = source.kind === "package" ? source.resources.goals : [];
  const keys = new Map<string, number[]>();
  rows.forEach((value, index) => {
    if (!isObject(value) || typeof value.import_key !== "string") return;
    const key = value.import_key.trim();
    if (!key || key.length > 100) return;
    keys.set(key, [...(keys.get(key) ?? []), index + 1]);
  });
  return keys;
}

function goalReference(
  row: JsonObject,
  context: LearningImportContext,
  localKeys: Map<string, number[]>,
  issues: LearningImportIssue[],
): { value: LearningImportGoalReference; display: string } | null {
  const value = stringField(row, "goal_ref", issues, {
    required: true,
    maximum: 200,
  });
  if (typeof value !== "string") return null;
  const localMatches = localKeys.get(value);
  if (localMatches?.length === 1) {
    return { value: { kind: "import_key", value }, display: value };
  }
  if (localMatches && localMatches.length > 1) {
    error(
      issues,
      "goal_ref",
      "ambiguous_reference",
      `Goal reference "${value}" matches a duplicate import_key.`,
    );
    return null;
  }
  const byId = context.goals.find((goal) => goal.id === value);
  if (byId)
    return {
      value: { kind: "id", value: byId.id },
      display: byId.title,
    };
  const titleMatches = context.goals.filter(
    (goal) => normalized(goal.title) === normalized(value),
  );
  if (titleMatches.length === 1) {
    return {
      value: { kind: "id", value: titleMatches[0].id },
      display: titleMatches[0].title,
    };
  }
  error(
    issues,
    "goal_ref",
    titleMatches.length > 1 ? "ambiguous_reference" : "reference_unavailable",
    titleMatches.length > 1
      ? `Goal reference "${value}" is ambiguous.`
      : `Goal reference "${value}" was not found.`,
  );
  return null;
}

function basePreview(
  resource: LearningImportResource,
  row: number,
  label: string,
  relationship: string,
  planning: string,
  issues: LearningImportIssue[],
): LearningImportPreviewRow {
  const preview: LearningImportPreviewRow = {
    resource,
    row,
    label,
    relationship,
    planning,
    status: "valid",
    issues,
  };
  updateStatus(preview);
  return preview;
}

function normalizeGoal(
  value: unknown,
  rowNumber: number,
  context: LearningImportContext,
  duplicateKeys: Set<string>,
): {
  preview: LearningImportPreviewRow;
  payload: LearningImportGoalInput | null;
} {
  const issues: LearningImportIssue[] = [];
  const row = asRow(value, issues);
  if (!row)
    return {
      preview: basePreview(
        "goals",
        rowNumber,
        "(invalid Goal)",
        "—",
        "—",
        issues,
      ),
      payload: null,
    };
  rejectUnknownFields(row, GOAL_FIELDS, issues);
  const title = stringField(row, "title", issues, {
    required: true,
    maximum: 200,
  });
  const provider = stringField(row, "provider", issues, {
    required: true,
    maximum: 200,
  });
  const type = enumField(row, "type", learningGoalTypes, issues);
  const status = enumField(row, "status", learningGoalStatuses, issues);
  const startDate = dateField(row, "start_date", issues, { required: true });
  const targetDate = dateField(row, "target_date", issues, { nullable: true });
  const examDate = dateField(row, "exam_date", issues, { nullable: true });
  const phase = stringField(row, "phase", issues, {
    nullable: true,
    maximum: 100,
  });
  const description = stringField(row, "description", issues, {
    required: true,
    maximum: 4_000,
  });
  const priority = enumField(row, "priority", learningPriorities, issues);
  const linkedProjectId = projectReference(
    row,
    "linked_project_id",
    context,
    issues,
  );
  const importKey = stringField(row, "import_key", issues, {
    maximum: 100,
  });
  if (typeof importKey === "string" && duplicateKeys.has(importKey)) {
    error(
      issues,
      "import_key",
      "duplicate_import_key",
      "import_key must be unique within imported Goals.",
    );
  }
  if (
    typeof startDate === "string" &&
    typeof targetDate === "string" &&
    targetDate < startDate
  ) {
    error(
      issues,
      "target_date",
      "invalid_date_order",
      "target_date must not precede start_date.",
    );
  }
  const complete =
    typeof title === "string" &&
    typeof provider === "string" &&
    type !== undefined &&
    status !== undefined &&
    typeof startDate === "string" &&
    typeof description === "string" &&
    priority !== undefined &&
    !issues.some((issue) => issue.level === "error");
  let payload: LearningImportGoalInput | null = null;
  if (complete) {
    payload = {
      title,
      provider,
      type,
      status,
      start_date: startDate,
      description,
      priority,
    };
    if (Object.hasOwn(row, "import_key") && typeof importKey === "string")
      payload.import_key = importKey;
    if (Object.hasOwn(row, "target_date"))
      payload.target_date = targetDate as string | null;
    if (Object.hasOwn(row, "exam_date"))
      payload.exam_date = examDate as string | null;
    if (Object.hasOwn(row, "phase")) payload.phase = phase as string | null;
    if (Object.hasOwn(row, "linked_project_id"))
      payload.linked_project_id = linkedProjectId as string | null;
  }
  return {
    preview: basePreview(
      "goals",
      rowNumber,
      typeof title === "string" ? title : "(untitled Goal)",
      "—",
      [typeof status === "string" ? status : null, targetDate ?? null]
        .filter(Boolean)
        .join(" · ") || "—",
      issues,
    ),
    payload,
  };
}

function normalizeSchedule(
  value: unknown,
  rowNumber: number,
  context: LearningImportContext,
  localKeys: Map<string, number[]>,
): {
  preview: LearningImportPreviewRow;
  payload: LearningImportScheduleInput | null;
} {
  const issues: LearningImportIssue[] = [];
  const row = asRow(value, issues);
  if (!row)
    return {
      preview: basePreview(
        "schedules",
        rowNumber,
        "(invalid schedule)",
        "—",
        "—",
        issues,
      ),
      payload: null,
    };
  rejectUnknownFields(row, SCHEDULE_FIELDS, issues);
  const goal = goalReference(row, context, localKeys, issues);
  const weekday = integerField(row, "weekday", issues, 0, 6);
  const sessionType = enumField(row, "session_type", studySessionTypes, issues);
  const plannedMinutes = integerField(
    row,
    "planned_minutes",
    issues,
    0,
    1_000_000,
  );
  const topic = stringField(row, "topic", issues, {
    required: true,
    maximum: 300,
  });
  const notes = stringField(row, "notes", issues, {
    maximum: 4_000,
    allowBlank: true,
  });
  const startDate = dateField(row, "start_date", issues, { required: true });
  const endDate = dateField(row, "end_date", issues, { nullable: true });
  const active = booleanField(row, "active", issues);
  const linkedProjectId = projectReference(
    row,
    "linked_project_id",
    context,
    issues,
  );
  if (
    typeof startDate === "string" &&
    typeof endDate === "string" &&
    endDate < startDate
  ) {
    error(
      issues,
      "end_date",
      "invalid_date_order",
      "end_date must not precede start_date.",
    );
  }
  const complete =
    goal !== null &&
    weekday !== undefined &&
    sessionType !== undefined &&
    plannedMinutes !== undefined &&
    typeof topic === "string" &&
    typeof startDate === "string" &&
    !issues.some((issue) => issue.level === "error");
  let payload: LearningImportScheduleInput | null = null;
  if (complete) {
    payload = {
      goal_ref: goal.value,
      weekday,
      session_type: sessionType,
      planned_minutes: plannedMinutes,
      topic,
      start_date: startDate,
    };
    if (Object.hasOwn(row, "notes")) payload.notes = notes as string;
    if (Object.hasOwn(row, "end_date"))
      payload.end_date = endDate as string | null;
    if (Object.hasOwn(row, "active")) payload.active = active as boolean;
    if (Object.hasOwn(row, "linked_project_id"))
      payload.linked_project_id = linkedProjectId as string | null;
  }
  return {
    preview: basePreview(
      "schedules",
      rowNumber,
      typeof topic === "string" ? topic : "(untitled schedule)",
      goal?.display ?? "Unresolved Goal",
      [
        weekday === undefined ? null : WEEKDAYS[weekday],
        plannedMinutes === undefined ? null : `${plannedMinutes} min`,
        sessionType?.replaceAll("_", " "),
      ]
        .filter(Boolean)
        .join(" · ") || "—",
      issues,
    ),
    payload,
  };
}

function normalizeMilestone(
  value: unknown,
  rowNumber: number,
  context: LearningImportContext,
  localKeys: Map<string, number[]>,
): {
  preview: LearningImportPreviewRow;
  payload: LearningImportMilestoneInput | null;
} {
  const issues: LearningImportIssue[] = [];
  const row = asRow(value, issues);
  if (!row)
    return {
      preview: basePreview(
        "milestones",
        rowNumber,
        "(invalid milestone)",
        "—",
        "—",
        issues,
      ),
      payload: null,
    };
  rejectUnknownFields(row, MILESTONE_FIELDS, issues);
  const goal = goalReference(row, context, localKeys, issues);
  const title = stringField(row, "title", issues, {
    required: true,
    maximum: 300,
  });
  const targetDate = dateField(row, "target_date", issues, { required: true });
  const status = Object.hasOwn(row, "status")
    ? enumField(row, "status", ["planned"] as const, issues)
    : undefined;
  const complete =
    goal !== null &&
    typeof title === "string" &&
    typeof targetDate === "string" &&
    !issues.some((issue) => issue.level === "error");
  let payload: LearningImportMilestoneInput | null = null;
  if (complete) {
    payload = {
      goal_ref: goal.value,
      title,
      target_date: targetDate,
    };
    if (Object.hasOwn(row, "status")) payload.status = status as "planned";
  }
  return {
    preview: basePreview(
      "milestones",
      rowNumber,
      typeof title === "string" ? title : "(untitled milestone)",
      goal?.display ?? "Unresolved Goal",
      typeof targetDate === "string" ? `Target ${targetDate}` : "—",
      issues,
    ),
    payload,
  };
}

function refIdentity(reference: LearningImportGoalReference): string {
  return `${reference.kind}:${reference.value}`;
}

function addDuplicateWarnings(
  rows: LearningImportPreviewRow[],
  request: LearningImportRequest,
  context: LearningImportContext,
): void {
  const validRows = (resource: LearningImportResource) =>
    rows.filter((row) => row.resource === resource && row.status !== "invalid");
  const goalRows = validRows("goals");
  const seenGoals = new Set<string>();
  request.resources.goals.forEach((goal, index) => {
    const preview = goalRows[index];
    if (!preview) return;
    const identity = `${normalized(goal.title)}\u0000${normalized(goal.provider)}`;
    const exists = context.goals.some(
      (candidate) =>
        normalized(candidate.title) === normalized(goal.title) &&
        normalized(candidate.provider) === normalized(goal.provider),
    );
    if (seenGoals.has(identity) || exists) {
      warning(
        preview,
        "title",
        "duplicate_record",
        "This Goal appears to duplicate an existing or earlier imported Goal; the backend will reject duplicates.",
      );
    }
    seenGoals.add(identity);
  });

  const scheduleRows = validRows("schedules");
  const seenSchedules = new Set<string>();
  request.resources.schedules.forEach((schedule, index) => {
    const preview = scheduleRows[index];
    if (!preview) return;
    const endDate = schedule.end_date ?? null;
    const active = schedule.active ?? true;
    const linkedProjectId = schedule.linked_project_id ?? null;
    const identity = JSON.stringify([
      refIdentity(schedule.goal_ref),
      schedule.weekday,
      schedule.session_type,
      normalized(schedule.topic),
      schedule.planned_minutes,
      schedule.start_date,
      endDate,
      active,
      linkedProjectId,
    ]);
    const existing =
      schedule.goal_ref.kind === "id" &&
      (context.schedules ?? []).some(
        (candidate) =>
          candidate.learning_goal_id === schedule.goal_ref.value &&
          candidate.weekday === schedule.weekday &&
          candidate.session_type === schedule.session_type &&
          normalized(candidate.topic) === normalized(schedule.topic) &&
          candidate.planned_minutes === schedule.planned_minutes &&
          candidate.start_date === schedule.start_date &&
          candidate.end_date === endDate &&
          candidate.active === active &&
          candidate.linked_project_id === linkedProjectId,
      );
    if (seenSchedules.has(identity) || existing) {
      warning(
        preview,
        "topic",
        "duplicate_record",
        "This schedule appears to duplicate an existing or earlier imported schedule; the backend will reject duplicates.",
      );
    }
    seenSchedules.add(identity);
  });

  const milestoneRows = validRows("milestones");
  const seenMilestones = new Set<string>();
  request.resources.milestones.forEach((milestone, index) => {
    const preview = milestoneRows[index];
    if (!preview) return;
    const identity = `${refIdentity(milestone.goal_ref)}\u0000${normalized(milestone.title)}`;
    const existing =
      milestone.goal_ref.kind === "id" &&
      (context.milestones ?? []).some(
        (candidate) =>
          candidate.learning_goal_id === milestone.goal_ref.value &&
          normalized(candidate.title) === normalized(milestone.title),
      );
    if (seenMilestones.has(identity) || existing) {
      warning(
        preview,
        "title",
        "duplicate_record",
        "This milestone appears to duplicate an existing or earlier imported milestone; the backend will reject duplicates.",
      );
    }
    seenMilestones.add(identity);
  });
  rows.forEach(updateStatus);
}

export function prepareLearningImport(
  source: LearningImportSource,
  context: LearningImportContext,
  selectedResource?: LearningImportResource,
): PreparedLearningImport {
  if (source.kind === "single" && !selectedResource) {
    throw new ImportParseError(
      "Choose whether this JSON array contains Goals, weekly schedules, or milestones.",
    );
  }
  const sourceResources: Record<LearningImportResource, unknown[]> =
    source.kind === "package"
      ? source.resources
      : {
          goals: selectedResource === "goals" ? source.rows : [],
          schedules: selectedResource === "schedules" ? source.rows : [],
          milestones: selectedResource === "milestones" ? source.rows : [],
        };
  const keys = importKeys(
    source.kind === "package"
      ? source
      : {
          kind: "package",
          resources: sourceResources,
        },
  );
  const duplicateKeys = new Set(
    [...keys.entries()]
      .filter(([, rows]) => rows.length > 1)
      .map(([key]) => key),
  );
  const rows: LearningImportPreviewRow[] = [];
  const request: LearningImportRequest = {
    duplicate_policy: "reject",
    resources: { goals: [], schedules: [], milestones: [] },
  };

  sourceResources.goals.forEach((value, index) => {
    const result = normalizeGoal(value, index + 1, context, duplicateKeys);
    rows.push(result.preview);
    if (result.payload) request.resources.goals.push(result.payload);
  });
  sourceResources.schedules.forEach((value, index) => {
    const result = normalizeSchedule(value, index + 1, context, keys);
    rows.push(result.preview);
    if (result.payload) request.resources.schedules.push(result.payload);
  });
  sourceResources.milestones.forEach((value, index) => {
    const result = normalizeMilestone(value, index + 1, context, keys);
    rows.push(result.preview);
    if (result.payload) request.resources.milestones.push(result.payload);
  });
  addDuplicateWarnings(rows, request, context);

  return {
    request,
    rows,
    counts: {
      goals: sourceResources.goals.length,
      schedules: sourceResources.schedules.length,
      milestones: sourceResources.milestones.length,
    },
    valid: rows.filter((row) => row.status === "valid").length,
    warnings: rows.filter((row) => row.status === "warning").length,
    invalid: rows.filter((row) => row.status === "invalid").length,
  };
}

export function learningImportProblem(
  value: unknown,
): LearningImportProblem | null {
  if (!(value instanceof ApiError) || !isObject(value.details)) return null;
  const detail = value.details.detail;
  if (!isObject(detail)) return null;
  if (
    !LEARNING_IMPORT_RESOURCES.includes(
      detail.resource as LearningImportResource,
    ) ||
    typeof detail.row !== "number" ||
    !Number.isInteger(detail.row) ||
    detail.row < 1 ||
    !(typeof detail.field === "string" || detail.field === null) ||
    typeof detail.code !== "string" ||
    typeof detail.message !== "string"
  ) {
    return null;
  }
  return {
    resource: detail.resource as LearningImportResource,
    row: detail.row,
    field: detail.field,
    code: detail.code,
    message: detail.message,
  };
}

const TEMPLATE_GOAL = {
  import_key: "aws-saa",
  title: "AWS Solutions Architect Associate",
  provider: "AWS",
  type: "certification",
  status: "active",
  start_date: "2026-10-05",
  target_date: "2026-12-28",
  exam_date: null,
  phase: "Phase 1",
  description: "Prepare for the AWS Solutions Architect Associate exam.",
  priority: "high",
  linked_project_id: null,
};
const TEMPLATE_SCHEDULE = {
  goal_ref: "aws-saa",
  weekday: 4,
  session_type: "study",
  planned_minutes: 90,
  topic: "Deep certification study",
  notes: "Focus on the current highest-priority domain.",
  start_date: "2026-10-05",
  end_date: null,
  active: true,
  linked_project_id: null,
};
const TEMPLATE_MILESTONE = {
  goal_ref: "aws-saa",
  title: "Complete networking and VPC section",
  target_date: "2026-11-02",
  status: "planned",
};

export function learningJsonTemplate(
  resource: LearningImportResource | "package",
): string {
  const value =
    resource === "package"
      ? {
          goals: [
            TEMPLATE_GOAL,
            {
              ...TEMPLATE_GOAL,
              import_key: "terraform-004",
              title: "Terraform Associate 004",
              provider: "HashiCorp",
              target_date: "2027-01-10",
              description:
                "Prepare for the Terraform Associate 004 certification.",
            },
          ],
          schedules: [
            TEMPLATE_SCHEDULE,
            {
              ...TEMPLATE_SCHEDULE,
              goal_ref: "terraform-004",
              weekday: 0,
              session_type: "practice_questions",
              planned_minutes: 60,
              topic: "Practice questions and bottleneck discovery",
            },
          ],
          milestones: [
            TEMPLATE_MILESTONE,
            {
              ...TEMPLATE_MILESTONE,
              goal_ref: "terraform-004",
              title: "Complete first Terraform practice exam",
              target_date: "2026-12-07",
            },
          ],
        }
      : resource === "goals"
        ? [TEMPLATE_GOAL]
        : resource === "schedules"
          ? [TEMPLATE_SCHEDULE]
          : [TEMPLATE_MILESTONE];
  return JSON.stringify(value, null, 2);
}
