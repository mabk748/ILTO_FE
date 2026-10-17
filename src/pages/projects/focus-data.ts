import { useEffect } from "react";
import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import {
  getCurrentFocusSession,
  getProjectFocus,
  type FocusSession,
  type ProjectFocus,
} from "@/lib/api/project-focus.ts";
import { getTasks } from "@/lib/api/projects.ts";
import { ApiError } from "@/lib/api/errors.ts";

export const focusKeys = {
  all: ["projects", "focus"] as const,
  current: ["projects", "focus", "current"] as const,
  project: (id: string) => ["projects", "focus", "project", id] as const,
  tasks: (id: string) => ["projects", "focus", "tasks", id] as const,
};
const freshness = {
  staleTime: 0,
  retry: false,
  refetchOnWindowFocus: "always" as const,
  refetchOnReconnect: "always" as const,
  refetchInterval: 15_000,
};

/** Cache remains inside the existing backend/auth-scoped QueryClient. No persisted state. */
export function useFocusData(projectId: string) {
  const client = useQueryClient();
  const current = useQuery({
    queryKey: focusKeys.current,
    queryFn: ({ signal }) => getCurrentFocusSession({ signal }),
    ...freshness,
  });
  const project = useQuery({
    queryKey: focusKeys.project(projectId),
    queryFn: ({ signal }) => getProjectFocus(projectId, { signal }),
    ...freshness,
  });
  const tasks = useQuery({
    queryKey: focusKeys.tasks(projectId),
    queryFn: ({ signal }) => getTasks({ projectId }, { signal }),
    ...freshness,
  });
  useEffect(() => {
    // Also handles tab return in hosts where the Query focus manager observes only visibility.
    const refresh = () => {
      void client.invalidateQueries({ queryKey: focusKeys.all });
    };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [client]);
  return { current, project, tasks };
}

/** Project projection without the additional owner-current and full-Task reads. */
export function useProjectFocus(projectId: string) {
  return useQuery({
    queryKey: focusKeys.project(projectId),
    queryFn: ({ signal }) => getProjectFocus(projectId, { signal }),
    ...freshness,
  });
}

export async function refreshFocus(client: QueryClient) {
  // No Dashboard, Intelligence or unrelated module invalidation for execution actions.
  await Promise.all([
    client.invalidateQueries({ queryKey: focusKeys.all }),
    client.invalidateQueries({ queryKey: ["projects", "data"], exact: true }),
  ]);
}

/** Apply a server-confirmed note response immediately, then let the normal
 * Focus refetch verify all projections. Dirty local drafts are kept in the
 * editor and are not represented in these authoritative caches. */
export function reconcileFocusSession(
  client: QueryClient,
  session: FocusSession,
) {
  client.setQueryData<FocusSession | null>(focusKeys.current, (current) =>
    current?.id === session.id ? session : current,
  );
  client.setQueriesData<unknown>(
    { queryKey: focusKeys.all },
    (value: unknown) => {
      if (!value || typeof value !== "object" || Array.isArray(value))
        return value;
      const focus = value as ProjectFocus;
      if (
        !focus.project ||
        typeof focus.project !== "object" ||
        !Array.isArray(focus.paused_sessions)
      )
        return value;
      const replace = (context: ProjectFocus["active_session"]) =>
        context?.session.id === session.id ? { ...context, session } : context;
      return {
        ...focus,
        active_session: replace(focus.active_session),
        active_session_elsewhere: replace(focus.active_session_elsewhere),
        paused_sessions: focus.paused_sessions.map((context) =>
          context.session.id === session.id ? { ...context, session } : context,
        ),
      } satisfies ProjectFocus;
    },
  );
}
export function assertOnline() {
  if (!navigator.onLine)
    throw new Error(
      "You are offline. Nothing was queued. Reconnect and refresh before trying again.",
    );
}
export function uncertainFocusOutcome(error: unknown) {
  return (
    error instanceof ApiError &&
    (["network", "timeout", "aborted", "invalid_response"].includes(
      error.code,
    ) ||
      (error.status ?? 0) >= 500)
  );
}
export function focusError(error: unknown): string {
  if (uncertainFocusOutcome(error))
    return "The backend did not confirm this change. It may have completed. State is being refreshed; do not start a different operation until it is reconciled.";
  if (error instanceof ApiError && error.status === 409)
    return `State conflict: ${error.message} Refresh and review the current work before trying again.`;
  if (error instanceof ApiError && error.status === 404)
    return "This Project, Task or session is unavailable. It may have been deleted or is not accessible to this account.";
  if (error instanceof ApiError && error.status === 401)
    return "Your login session expired. Sign in again to recover the server's Focus state.";
  return error instanceof Error
    ? error.message
    : "The change could not be confirmed.";
}
