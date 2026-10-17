import type { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/errors.ts";
import { authErrorMessage } from "@/lib/api/auth.ts";

// A short-lived confirmation query, kept outside the collection prefix so a
// successful deletion does not refetch the now-deleted project's preview.
export const projectDeleteImpactKey = (id: string) =>
  ["project-delete-impact", id] as const;

export async function refreshAfterProjectDeletion(client: QueryClient) {
  await Promise.all(
    ["projects", "learning", "dashboard", "intelligence", "horizon"].map(
      (domain) => client.invalidateQueries({ queryKey: [domain] }),
    ),
  );
}

export function projectDeletionError(error: unknown): string {
  if (!(error instanceof ApiError))
    return "The request could not be confirmed. Please try again.";
  if (error.status === 401)
    return "Your session expired. Please sign in again.";
  if (error.status === 403) return authErrorMessage(error);
  if (error.status === 404)
    return "This Project is no longer available. Projects data is being refreshed.";
  if (error.status === 422) {
    const detail = recordDetail(error.details);
    return typeof detail === "string"
      ? detail
      : "The backend rejected the confirmation request. Check the exact Project name and try again.";
  }
  if (error.status === 409) {
    switch (projectDeletionConflict(error)) {
      case "stale_preview":
        return "This deletion preview is stale. Review the refreshed impact and confirm again.";
      case "unfinished_focus_sessions":
        return "Deletion is blocked while active or paused FocusSessions exist. Finish them before deleting this Project.";
      default:
        return error.message;
    }
  }
  if (error.status === 503)
    return "Database operation unavailable. Please retry manually when the database is available.";
  if (error.code === "network" || error.code === "timeout")
    return "The backend could not confirm the request. Check your connection and refresh the preview before retrying; deletion may have completed.";
  if (error.code === "aborted")
    return "The request was cancelled. Deletion was not confirmed.";
  return error.message;
}

export type ProjectDeletionConflict =
  | "stale_preview"
  | "unfinished_focus_sessions"
  | "unsafe_dependency"
  | "database_conflict"
  | "unknown";

/** Classify only the documented backend 409 details; do not infer from status alone. */
export function projectDeletionConflict(
  error: unknown,
): ProjectDeletionConflict | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null;
  switch (error.message) {
    case "Project deletion preview is stale. Refresh it before deleting.":
      return "stale_preview";
    case "Finish all active or paused focus sessions before deleting this Project.":
      return "unfinished_focus_sessions";
    case "A related record cannot be safely handled.":
      return "unsafe_dependency";
    case "Operation conflicts with related records or database constraints":
      return "database_conflict";
    default:
      return "unknown";
  }
}

function recordDetail(details: unknown): unknown {
  return typeof details === "object" && details !== null && "detail" in details
    ? details.detail
    : undefined;
}
