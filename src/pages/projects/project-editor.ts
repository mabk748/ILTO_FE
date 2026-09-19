import * as api from "@/lib/api/projects.ts";
import type {
  Project,
  Sprint,
  Task,
  Milestone,
  Priority,
} from "@/lib/api/types.ts";
import { ApiError } from "@/lib/api/errors.ts";
import { parseCalendarDate } from "@/lib/calendar-date.ts";

export type EditorTarget =
  | { kind: "project"; record?: Project }
  | { kind: "sprint"; record?: Sprint }
  | { kind: "task"; record?: Task }
  | { kind: "milestone"; record?: Milestone };
export type Draft = Record<string, string>;

export const statuses = {
  project: ["planning", "active", "on_hold", "completed", "archived"],
  sprint: ["planned", "active", "completed"],
  task: ["backlog", "todo", "in_progress", "review", "done"],
} as const;
export const priorities: Priority[] = ["low", "medium", "high", "critical"];

export function initialDraft(target: EditorTarget): Draft {
  const draft: Draft = {
    name: "",
    title: "",
    description: "",
    goal: "",
    project_id: "",
    sprint_id: "",
    assignee: "",
    story_points: "0",
    start_date: "",
    end_date: "",
    due_date: "",
    priority: "medium",
    status: target.kind === "milestone" ? "" : statuses[target.kind][0],
    completed: "false",
  };
  if (target.record)
    for (const key of Object.keys(draft)) {
      if (key in target.record)
        draft[key] = String(
          target.record[key as keyof typeof target.record] ?? "",
        );
    }
  if (target.kind === "milestone")
    draft.completed = target.record?.completed_at ? "true" : "false";
  return draft;
}

/** Only changed writable fields are PATCHed. Null is deliberate, never omission. */
export function changedFields<T extends object>(
  input: T,
  original: T,
): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(
      ([key, value]) => value !== original[key as keyof T],
    ),
  ) as Partial<T>;
}

function choice<T extends string>(value: string, allowed: readonly T[]): T {
  if (!allowed.includes(value as T)) throw new Error("Choose a valid option.");
  return value as T;
}
function name(value: string): string {
  if (!value.trim() || value.length > 200)
    throw new Error(
      "Names and titles must contain 1–200 characters, not just spaces.",
    );
  return value;
}
function date(value: string): string {
  parseCalendarDate(value);
  return value;
}
function dates(values: Draft) {
  const start_date = date(values.start_date);
  const end_date = values.end_date ? date(values.end_date) : null;
  if (end_date && end_date < start_date)
    throw new Error("End date cannot precede start date.");
  return { start_date, end_date };
}

export async function saveResource(
  target: EditorTarget,
  values: Draft,
  sprints: Sprint[],
) {
  switch (target.kind) {
    case "project": {
      const input: api.CreateProjectInput = {
        name: name(values.name),
        description: values.description,
        priority: choice(values.priority, priorities),
        status: choice(values.status, statuses.project),
        ...dates(values),
      };
      return target.record
        ? api.updateProject(
            target.record.id,
            changedFields(input, target.record),
          )
        : api.createProject(input);
    }
    case "sprint": {
      const boundaries = dates(values);
      if (!boundaries.end_date)
        throw new Error("A sprint end date is required.");
      const input: api.CreateSprintInput = {
        project_id: values.project_id,
        name: name(values.name),
        goal: values.goal,
        status: choice(values.status, statuses.sprint),
        start_date: boundaries.start_date,
        end_date: boundaries.end_date,
      };
      return target.record
        ? api.updateSprint(
            target.record.id,
            changedFields(input, target.record),
          )
        : api.createSprint(input);
    }
    case "task": {
      const story_points = Number(values.story_points);
      if (
        !values.story_points.trim() ||
        !Number.isFinite(story_points) ||
        story_points < 0 ||
        story_points >= 1_000_000_000
      )
        throw new Error(
          "Story points must be a number from 0 up to (but not including) 1,000,000,000.",
        );
      if (
        values.sprint_id &&
        !sprints.some(
          (s) =>
            s.id === values.sprint_id && s.project_id === values.project_id,
        )
      )
        throw new Error(
          "Choose a sprint belonging to this task's project, or no sprint.",
        );
      if (values.assignee.length > 200)
        throw new Error("Assignee must be at most 200 characters.");
      const input: api.CreateTaskInput = {
        project_id: values.project_id,
        sprint_id: values.sprint_id || null,
        title: name(values.title),
        description: values.description,
        status: choice(values.status, statuses.task),
        priority: choice(values.priority, priorities),
        assignee:
          values.assignee || (target.record?.assignee === "" ? "" : null),
        story_points,
      };
      return target.record
        ? api.updateTask(target.record.id, changedFields(input, target.record))
        : api.createTask(input);
    }
    case "milestone": {
      const input: api.CreateMilestoneInput = {
        project_id: values.project_id,
        title: name(values.title),
        description: values.description,
        due_date: date(values.due_date),
        completed_at:
          values.completed === "true"
            ? (target.record?.completed_at ?? new Date().toISOString())
            : null,
      };
      return target.record
        ? api.updateMilestone(
            target.record.id,
            changedFields(input, target.record),
          )
        : api.createMilestone(input);
    }
  }
}

export async function removeResource(target: EditorTarget) {
  if (!target.record) throw new Error("Select a saved record first.");
  switch (target.kind) {
    case "project":
      return api.deleteProject(target.record.id);
    case "sprint":
      return api.deleteSprint(target.record.id);
    case "task":
      return api.deleteTask(target.record.id);
    case "milestone":
      return api.deleteMilestone(target.record.id);
  }
}

export function projectWriteError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409)
      return "This change conflicts with dependent records. Move or remove dependents explicitly first (sprints, tasks, or milestones for a project; tasks for a sprint). Nothing was cascade-deleted.";
    if (error.status === 422)
      return "The backend rejected these values. Check dates, required fields, and project/sprint relationships.";
    if (error.status === 404)
      return "This record or a related project/sprint no longer exists. Close the form and refresh before trying again.";
    if (
      error.status === 503 ||
      error.code === "network" ||
      error.code === "timeout"
    )
      return "The backend could not confirm this change. Refresh and check whether it was saved before retrying, to avoid duplicates.";
  }
  return error instanceof Error ? error.message : "Could not save the change.";
}
