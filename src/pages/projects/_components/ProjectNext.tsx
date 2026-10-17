import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button.tsx";
import LoadError from "@/components/LoadError.tsx";
import type { Project, Sprint, Task } from "@/lib/api/types.ts";
import { focusError, useProjectFocus } from "../focus-data.ts";
import { useFocusAction } from "../focus-actions.ts";
import { buildNextQueue, type NextQueueGroup } from "../next-queue.ts";

const workspace = (
  projectId: string,
  area: "now" | "explore",
  params: URLSearchParams,
) => `/projects/${encodeURIComponent(projectId)}/${area}?${params}`;

function boardLink(
  projectId: string,
  group: NextQueueGroup,
  sprints: Sprint[],
) {
  const params = new URLSearchParams({ view: "board" });
  if (group.id === "in_progress" || group.id === "review")
    params.set("task_status", group.id);
  if (group.id === "upcoming") params.set("task_status", "not_done");
  if (group.id === "active_sprint")
    sprints
      .filter((sprint) => sprint.status === "active")
      .forEach((sprint) => params.append("sprint", sprint.id));
  return workspace(projectId, "explore", params);
}

export default function ProjectNext({
  project,
  tasks,
  sprints,
}: {
  project: Project;
  tasks: Task[];
  sprints: Sprint[];
}) {
  const focus = useProjectFocus(project.id);
  const mutation = useFocusAction();
  const navigate = useNavigate();
  const [failure, setFailure] = useState<string | null>(null);
  const paused = focus.data?.paused_sessions ?? [];
  const groups = focus.isPending ? [] : buildNextQueue(tasks, sprints, paused);
  const active =
    focus.data?.active_session ?? focus.data?.active_session_elsewhere;

  const resume = async (sessionId: string, taskId: string) => {
    const context = paused.find((item) => item.session.id === sessionId);
    if (!context || mutation.isPending) return;
    setFailure(null);
    try {
      await mutation.mutateAsync({
        intent: {
          action: "resume",
          session: context.session,
        },
      });
      navigate(
        workspace(project.id, "now", new URLSearchParams({ task: taskId })),
      );
    } catch (error) {
      setFailure(focusError(error));
    }
  };

  return (
    <section aria-labelledby="next-heading" className="space-y-5">
      <div>
        <h2 id="next-heading" className="text-xl font-semibold">
          NEXT
        </h2>
        <p className="text-sm text-muted-foreground">
          A bounded execution horizon. Open the full Board for the complete
          backlog.
        </p>
      </div>

      {failure && (
        <p role="alert" className="rounded border p-3 text-sm">
          {failure} Open NOW to reconcile the authoritative session state.
        </p>
      )}
      {focus.isPending && (
        <p
          role="status"
          className="rounded-lg border border-dashed p-5 text-sm"
        >
          Loading Focus queue…
        </p>
      )}
      {focus.error && (
        <LoadError
          error={focus.error}
          title="Focus sessions unavailable; showing the Task queue only"
          onRetry={() => void focus.refetch()}
        />
      )}
      {active && (
        <section className="space-y-2 rounded-lg border p-4">
          <h3 className="font-semibold">Active work</h3>
          <p className="text-sm">
            {active.task.title} in {active.project.name}. Resume controls remain
            in its NOW workspace.
          </p>
          <Link
            className="text-sm underline underline-offset-4"
            to={workspace(
              active.project.id,
              "now",
              new URLSearchParams({ task: active.task.id }),
            )}
          >
            Open active work in NOW
          </Link>
        </section>
      )}

      {paused.length > 0 && (
        <section
          aria-label="Paused and resumable sessions"
          className="space-y-2"
        >
          <div>
            <h3 className="font-semibold">Paused and resumable</h3>
            <p className="text-sm text-muted-foreground">
              Saved stopping context from the backend.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {paused.slice(0, 5).map((item) => (
              <li
                key={item.session.id}
                className="min-w-0 rounded-lg border p-3"
              >
                <p className="break-words text-sm font-semibold">
                  {item.task.title}
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-xs text-muted-foreground">
                  {item.session.resume_note || "No resume note saved."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={mutation.isPending || Boolean(active)}
                    onClick={() => void resume(item.session.id, item.task.id)}
                  >
                    Resume Task
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link
                      to={workspace(
                        project.id,
                        "now",
                        new URLSearchParams({
                          task: item.task.id,
                          session: item.session.id,
                        }),
                      )}
                    >
                      Open in NOW
                    </Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          {paused.length > 5 && (
            <p className="text-xs text-muted-foreground">
              Showing 5 of {paused.length} paused sessions. Open NOW to inspect
              another saved session.
            </p>
          )}
        </section>
      )}

      {!focus.isPending && groups.length > 0 ? (
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          {groups.map((group) => (
            <section
              key={group.id}
              aria-label={group.title}
              className="min-w-0 space-y-3 rounded-lg border p-4"
            >
              <div>
                <h3 className="text-sm font-semibold">
                  {group.title}{" "}
                  <span className="text-muted-foreground">({group.total})</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  {group.description}
                </p>
              </div>
              <ul className="divide-y">
                {group.tasks.map((task) => {
                  const sprint = sprints.find(
                    (candidate) => candidate.id === task.sprint_id,
                  );
                  return (
                    <li key={task.id} className="space-y-1 py-2">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <span className="min-w-0 break-words text-sm font-medium">
                          {task.title}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {task.priority}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {task.status.replaceAll("_", " ")}
                        {sprint ? ` · ${sprint.name}` : " · No sprint"}
                      </p>
                      <Link
                        className="inline-block text-xs underline underline-offset-4"
                        to={workspace(
                          project.id,
                          "now",
                          new URLSearchParams({ task: task.id }),
                        )}
                      >
                        Select and open in NOW
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {group.total > group.tasks.length && (
                <p className="text-xs text-muted-foreground">
                  Showing {group.tasks.length} of {group.total}.
                </p>
              )}
              <Link
                className="inline-block text-sm underline underline-offset-4"
                to={boardLink(project.id, group, sprints)}
              >
                Open matching Board view
              </Link>
            </section>
          ))}
        </div>
      ) : !focus.isPending ? (
        <p className="rounded-lg border border-dashed p-5 text-sm">
          {tasks.length === 0
            ? "No Tasks yet. Create one in EXPLORE."
            : tasks.every((task) => task.status === "done")
              ? "All Tasks are done. Completed work remains on the Board."
              : "No immediate queue items. Review the full Board for other work."}
        </p>
      ) : null}

      <Link
        className="inline-block text-sm underline underline-offset-4"
        to={workspace(
          project.id,
          "explore",
          new URLSearchParams({ view: "board" }),
        )}
      >
        Open full Project Board
      </Link>
    </section>
  );
}
