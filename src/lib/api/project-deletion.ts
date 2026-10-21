import { apiClient, type ApiRequestOptions } from "./client.ts";
import { ApiError } from "./errors.ts";
import { encodeId } from "./resource.ts";

export interface ProjectDeletedCounts {
  tasks: number;
  sprints: number;
  workstreams: number;
  milestones: number;
  repositories: number;
  focus_sessions: number;
}

export interface ProjectUnlinkedCounts {
  learning_goals: number;
  study_schedules: number;
  study_sessions: number;
}

export interface ProjectDeleteFocusSessionImpact {
  total: number;
  active: number;
  paused: number;
  finished: number;
  has_unfinished_sessions: boolean;
}

export interface ProjectDeleteImpact {
  project: { id: string; name: string };
  will_delete: ProjectDeletedCounts;
  will_unlink: ProjectUnlinkedCounts;
  focus_sessions: ProjectDeleteFocusSessionImpact;
  blocking_dependencies: {
    resource: string;
    count: number | null;
    reason: string;
  }[];
  confirmation_token: string;
}

export interface ProjectDeleteResult {
  status: "deleted";
  project: { id: string; name: string };
  deleted: ProjectDeletedCounts;
  unlinked: ProjectUnlinkedCounts;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function count(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
function counts(value: unknown, keys: string[]): boolean {
  return record(value) && keys.every((key) => count(value[key]));
}
function identity(value: unknown, id: string): boolean {
  return (
    record(value) &&
    value.id === id &&
    typeof value.name === "string" &&
    value.name.length > 0
  );
}
function deletedCounts(value: unknown): boolean {
  return counts(value, [
    "tasks",
    "sprints",
    "workstreams",
    "milestones",
    "repositories",
    "focus_sessions",
  ]);
}
function unlinkedCounts(value: unknown): boolean {
  return counts(value, ["learning_goals", "study_schedules", "study_sessions"]);
}

function focusSessionImpact(
  value: unknown,
): value is ProjectDeleteFocusSessionImpact {
  if (
    !record(value) ||
    !counts(value, ["total", "active", "paused", "finished"]) ||
    !count(value.total) ||
    !count(value.active) ||
    !count(value.paused) ||
    !count(value.finished) ||
    typeof value.has_unfinished_sessions !== "boolean"
  ) {
    return false;
  }
  return (
    value.total === value.active + value.paused + value.finished &&
    value.has_unfinished_sessions === value.active + value.paused > 0
  );
}

function confirmationToken(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

/** Fail closed on malformed previews; never supply missing counts or blockers. */
export async function getProjectDeleteImpact(
  id: string,
  options: ApiRequestOptions = {},
): Promise<ProjectDeleteImpact> {
  const payload = await apiClient.get<unknown>(
    `/projects/${encodeId(id)}/delete-impact`,
    options,
  );
  if (
    !record(payload) ||
    !identity(payload.project, id) ||
    !deletedCounts(payload.will_delete) ||
    !unlinkedCounts(payload.will_unlink) ||
    !focusSessionImpact(payload.focus_sessions) ||
    !confirmationToken(payload.confirmation_token) ||
    !Array.isArray(payload.blocking_dependencies) ||
    !payload.blocking_dependencies.every(
      (item) =>
        record(item) &&
        typeof item.resource === "string" &&
        (item.count === null || count(item.count)) &&
        typeof item.reason === "string" &&
        item.reason.length > 0,
    )
  ) {
    throw new ApiError(
      "The backend returned an invalid deletion preview. Deletion is disabled; refresh the preview before continuing.",
      "invalid_response",
    );
  }
  return payload as unknown as ProjectDeleteImpact;
}

export async function deleteProjectWithContents(
  id: string,
  confirmName: string,
  confirmationToken: string,
  options: ApiRequestOptions = {},
): Promise<ProjectDeleteResult> {
  const payload = await apiClient.post<unknown>(
    `/projects/${encodeId(id)}/delete-with-contents`,
    { confirm_name: confirmName, confirmation_token: confirmationToken },
    options,
  );
  if (
    !record(payload) ||
    payload.status !== "deleted" ||
    !identity(payload.project, id) ||
    !deletedCounts(payload.deleted) ||
    !unlinkedCounts(payload.unlinked)
  ) {
    throw new ApiError(
      "The backend did not return a valid deletion result. Refresh Projects to check its state before retrying; deletion may have completed.",
      "invalid_response",
    );
  }
  return payload as unknown as ProjectDeleteResult;
}
