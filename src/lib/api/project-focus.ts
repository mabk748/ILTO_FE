import { apiClient, type ApiRequestOptions } from "./client.ts";
import { ApiError } from "./errors.ts";
import { encodeId } from "./resource.ts";
import type { Project, Task, Sprint, Milestone } from "./types.ts";

/** Confirmed backend 0.1.17 FocusSession contracts. */
export interface FocusSession {
  id: string;
  task_id: string;
  project_id: string;
  status: "active" | "paused" | "finished";
  started_at: string;
  paused_at: string | null;
  finished_at: string | null;
  resume_note: string | null;
  created_at: string;
  updated_at: string;
}
export type FocusTask = Pick<
  Task,
  "id" | "title" | "status" | "priority" | "sprint_id"
>;
export type FocusProject = Pick<Project, "id" | "name" | "status">;
export interface FocusSessionContext {
  session: FocusSession;
  task: FocusTask;
  project: FocusProject;
}
export interface ProjectFocus {
  project: FocusProject;
  active_session: FocusSessionContext | null;
  active_session_elsewhere: FocusSessionContext | null;
  paused_sessions: FocusSessionContext[];
  recommended_task: FocusTask | null;
  recommendation_reason: string | null;
  alternative_tasks: FocusTask[];
  active_sprints: Pick<
    Sprint,
    "id" | "name" | "status" | "start_date" | "end_date"
  >[];
  milestones: Pick<Milestone, "id" | "title" | "due_date" | "completed_at">[];
  empty_state: "none" | "empty_project" | "no_eligible_tasks";
}
export interface StartFocusInput {
  task_id: string;
  idempotency_key: string;
}
export type FocusSessionNoteUpdate =
  | { resume_note?: never; expected_updated_at?: never }
  | { resume_note: string | null; expected_updated_at: string };
export type SwitchFocusInput = StartFocusInput & {
  expected_active_session_id: string;
} & FocusSessionNoteUpdate;
export interface SaveFocusNoteInput {
  id: string;
  resume_note: string | null;
  expected_updated_at: string;
}

function lifecycleNoteBody(input: FocusSessionNoteUpdate) {
  return Object.prototype.hasOwnProperty.call(input, "resume_note")
    ? {
        resume_note: input.resume_note,
        expected_updated_at: input.expected_updated_at,
      }
    : {};
}

const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const nullableText = (v: unknown) => v === null || typeof v === "string";
const timestamp = (v: unknown) =>
  typeof v === "string" &&
  /(?:Z|[+-]\d{2}:\d{2})$/.test(v) &&
  Number.isFinite(Date.parse(v));
const nullableTimestamp = (v: unknown) => v === null || timestamp(v);
const date = (v: unknown) =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
function invalid(): never {
  throw new ApiError(
    "Invalid Focus response. Refresh authoritative state before continuing.",
    "invalid_response",
  );
}
export function parseFocusSession(v: unknown): FocusSession {
  if (
    !record(v) ||
    ![v.id, v.task_id, v.project_id].every(text) ||
    !["active", "paused", "finished"].includes(String(v.status)) ||
    ![v.started_at, v.created_at, v.updated_at].every(timestamp) ||
    ![v.paused_at, v.finished_at].every(nullableTimestamp) ||
    !nullableText(v.resume_note) ||
    (typeof v.resume_note === "string" && v.resume_note.length > 1000) ||
    (v.status === "paused" && !timestamp(v.paused_at)) ||
    (v.status === "finished" && !timestamp(v.finished_at)) ||
    (v.status !== "finished" && v.finished_at !== null)
  )
    invalid();
  return v as unknown as FocusSession;
}
function project(v: unknown): v is FocusProject {
  return (
    record(v) &&
    text(v.id) &&
    text(v.name) &&
    ["planning", "active", "on_hold", "completed", "archived"].includes(
      String(v.status),
    )
  );
}
function task(v: unknown): v is FocusTask {
  return (
    record(v) &&
    text(v.id) &&
    text(v.title) &&
    ["backlog", "todo", "in_progress", "review", "done"].includes(
      String(v.status),
    ) &&
    ["low", "medium", "high", "critical"].includes(String(v.priority)) &&
    nullableText(v.sprint_id)
  );
}
function context(v: unknown): v is FocusSessionContext {
  if (!record(v) || !project(v.project) || !task(v.task)) return false;
  const session = parseFocusSession(v.session);
  return session.task_id === v.task.id && session.project_id === v.project.id;
}
export function parseProjectFocus(v: unknown, projectId: string): ProjectFocus {
  if (
    !record(v) ||
    !project(v.project) ||
    v.project.id !== projectId ||
    !(
      v.active_session === null ||
      (context(v.active_session) &&
        v.active_session.project.id === projectId &&
        v.active_session.session.status === "active")
    ) ||
    !(
      v.active_session_elsewhere === null ||
      (context(v.active_session_elsewhere) &&
        v.active_session_elsewhere.project.id !== projectId &&
        v.active_session_elsewhere.session.status === "active")
    ) ||
    (v.active_session !== null && v.active_session_elsewhere !== null) ||
    !Array.isArray(v.paused_sessions) ||
    !v.paused_sessions.every(
      (item) =>
        context(item) &&
        item.project.id === projectId &&
        item.session.status === "paused",
    ) ||
    !(v.recommended_task === null || task(v.recommended_task)) ||
    !nullableText(v.recommendation_reason) ||
    !Array.isArray(v.alternative_tasks) ||
    !v.alternative_tasks.every(task) ||
    !Array.isArray(v.active_sprints) ||
    !v.active_sprints.every(
      (s) =>
        record(s) &&
        text(s.id) &&
        text(s.name) &&
        s.status === "active" &&
        date(s.start_date) &&
        date(s.end_date),
    ) ||
    !Array.isArray(v.milestones) ||
    !v.milestones.every(
      (m) =>
        record(m) &&
        text(m.id) &&
        text(m.title) &&
        date(m.due_date) &&
        nullableTimestamp(m.completed_at),
    ) ||
    !["none", "empty_project", "no_eligible_tasks"].includes(
      String(v.empty_state),
    )
  )
    invalid();
  return v as unknown as ProjectFocus;
}
export async function getProjectFocus(id: string, options?: ApiRequestOptions) {
  return parseProjectFocus(
    await apiClient.get<unknown>(`/projects/${encodeId(id)}/focus`, options),
    id,
  );
}
export async function getCurrentFocusSession(options?: ApiRequestOptions) {
  const result = await apiClient.get<unknown>(
    "/projects/focus-sessions/current",
    options,
  );
  if (result === null) return null;
  const session = parseFocusSession(result);
  if (session.status !== "active") invalid();
  return session;
}
export async function getResumableFocusSessions(options?: ApiRequestOptions) {
  const result = await apiClient.get<unknown>(
    "/projects/focus-sessions/resumable",
    options,
  );
  if (!Array.isArray(result)) invalid();
  return result.map((item) => {
    const session = parseFocusSession(item);
    if (session.status !== "paused") invalid();
    return session;
  });
}
export async function startFocusSession(input: StartFocusInput) {
  const result = parseFocusSession(
    await apiClient.post<unknown>("/projects/focus-sessions", {
      task_id: input.task_id,
      idempotency_key: input.idempotency_key,
    }),
  );
  if (result.task_id !== input.task_id) invalid();
  return result;
}
export async function switchFocusSession(input: SwitchFocusInput) {
  const result = parseFocusSession(
    await apiClient.post<unknown>("/projects/focus-sessions/switch", {
      task_id: input.task_id,
      idempotency_key: input.idempotency_key,
      expected_active_session_id: input.expected_active_session_id,
      ...lifecycleNoteBody(input),
    }),
  );
  if (result.task_id !== input.task_id) invalid();
  return result;
}
export async function saveFocusSessionNote(input: SaveFocusNoteInput) {
  const result = parseFocusSession(
    await apiClient.patch<unknown>(
      `/projects/focus-sessions/${encodeId(input.id)}/resume-note`,
      {
        resume_note: input.resume_note,
        expected_updated_at: input.expected_updated_at,
      },
    ),
  );
  if (result.id !== input.id) invalid();
  return result;
}
export function transitionFocusSession(
  id: string,
  action: "pause",
  noteUpdate?: FocusSessionNoteUpdate,
): Promise<FocusSession>;
export function transitionFocusSession(
  id: string,
  action: "resume" | "finish",
): Promise<FocusSession>;
export async function transitionFocusSession(
  id: string,
  action: "pause" | "resume" | "finish",
  noteUpdate: FocusSessionNoteUpdate = {},
) {
  const result = parseFocusSession(
    await apiClient.post<unknown>(
      `/projects/focus-sessions/${encodeId(id)}/${action}`,
      action === "pause" ? lifecycleNoteBody(noteUpdate) : undefined,
    ),
  );
  if (
    result.id !== id ||
    result.status !==
      ({ pause: "paused", resume: "active", finish: "finished" } as const)[
        action
      ]
  )
    invalid();
  return result;
}
