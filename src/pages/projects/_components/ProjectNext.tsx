import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  CircleDot,
  Filter,
  Layers3,
  ListTodo,
  PauseCircle,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
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
  const [params, setParams] = useSearchParams();
  const [failure, setFailure] = useState<string | null>(null);
  const paused = focus.data?.paused_sessions ?? [];
  const priority = ["low", "medium", "high", "critical"].includes(
    params.get("queue_priority") ?? "",
  )
    ? params.get("queue_priority")!
    : "";
  const sprintId = sprints.some(
    (sprint) => sprint.id === params.get("queue_sprint"),
  )
    ? params.get("queue_sprint")!
    : "";
  const filteredTasks = tasks.filter(
    (task) =>
      (!priority || task.priority === priority) &&
      (!sprintId || task.sprint_id === sprintId),
  );
  const groups = focus.isPending
    ? []
    : buildNextQueue(filteredTasks, sprints, paused);
  const active =
    focus.data?.active_session ?? focus.data?.active_session_elsewhere;
  const recommendedId = focus.data?.recommended_task?.id;
  const setFilter = (key: "queue_priority" | "queue_sprint", value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };
  const clearFilters = () => {
    const next = new URLSearchParams(params);
    next.delete("queue_priority");
    next.delete("queue_sprint");
    setParams(next, { replace: true });
  };

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
    <section
      aria-labelledby="next-heading"
      data-workspace-area="next"
      className="space-y-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.68rem] font-semibold tracking-[0.18em] text-primary uppercase">
            Execution horizon
          </p>
          <h2
            id="next-heading"
            className="mt-1 font-mono text-xl font-bold tracking-tight sm:text-2xl"
          >
            NEXT
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            A bounded, deterministic queue for deciding what enters Focus next.
            The complete backlog remains on the Board.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link
            to={workspace(
              project.id,
              "explore",
              new URLSearchParams({ view: "board" }),
            )}
          >
            <ListTodo aria-hidden="true" />
            Open full Project Board
          </Link>
        </Button>
      </div>

      {failure && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm"
        >
          {failure} Open NOW to reconcile the authoritative session state.
        </p>
      )}
      {focus.isPending && (
        <p
          role="status"
          className="rounded-2xl border border-dashed border-border bg-surface/55 p-6 text-sm text-muted-foreground"
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

      <section
        aria-label="Queue filters"
        className="grid gap-3 rounded-xl border border-border/70 bg-card/55 p-3 sm:grid-cols-2 lg:max-w-3xl"
      >
        <label className="space-y-1 text-sm">
          <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Filter className="size-3.5" aria-hidden="true" />
            Priority
          </span>
          <select
            aria-label="Filter queue by priority"
            className="min-h-10 w-full px-3 text-sm"
            value={priority}
            onChange={(event) =>
              setFilter("queue_priority", event.target.value)
            }
          >
            <option value="">All priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Layers3 className="size-3.5" aria-hidden="true" />
            Sprint
          </span>
          <select
            aria-label="Filter queue by sprint"
            className="min-h-10 w-full px-3 text-sm"
            value={sprintId}
            onChange={(event) => setFilter("queue_sprint", event.target.value)}
          >
            <option value="">All Sprints</option>
            {sprints.map((sprint) => (
              <option key={sprint.id} value={sprint.id}>
                {sprint.name}
              </option>
            ))}
          </select>
        </label>
        {(priority || sprintId) && (
          <div className="flex items-center justify-between gap-3 sm:col-span-2">
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {filteredTasks.length} of {tasks.length} Tasks in this queue view
            </p>
            <Button size="sm" variant="ghost" onClick={clearFilters}>
              <RotateCcw aria-hidden="true" />
              Clear queue filters
            </Button>
          </div>
        )}
      </section>

      <div
        data-layout="execution-queue"
        className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start"
      >
        <div className="min-w-0 space-y-4">
          {!focus.isPending && groups.length > 0 ? (
            groups.map((group, groupIndex) => (
              <section
                key={group.id}
                aria-label={group.title}
                className="min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-surface/70"
              >
                <header className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
                  <div>
                    <p className="text-[0.65rem] font-semibold tracking-[0.15em] text-primary uppercase">
                      Queue {String(groupIndex + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-1 font-mono text-sm font-bold">
                      {group.title}{" "}
                      <span className="text-muted-foreground">
                        ({group.total})
                      </span>
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {group.description}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="ghost">
                    <Link
                      to={boardLink(project.id, group, sprints)}
                      aria-label="Open matching Board view"
                    >
                      Board
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </Button>
                </header>
                <ul className="divide-y divide-border/60">
                  {group.tasks.map((task) => {
                    const sprint = sprints.find(
                      (candidate) => candidate.id === task.sprint_id,
                    );
                    const recommended = task.id === recommendedId;
                    return (
                      <li key={task.id} className="p-4 sm:px-5">
                        <article className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              {recommended && (
                                <Badge variant="default">
                                  <Sparkles aria-hidden="true" />
                                  Recommended
                                </Badge>
                              )}
                              <Badge variant="outline">
                                {task.status.replaceAll("_", " ")}
                              </Badge>
                              <Badge
                                variant={
                                  task.priority === "critical"
                                    ? "destructive"
                                    : task.priority === "high"
                                      ? "warning"
                                      : "secondary"
                                }
                              >
                                {task.priority}
                              </Badge>
                            </div>
                            <h4 className="mt-2 break-words text-sm font-semibold sm:text-base">
                              {task.title}
                            </h4>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {sprint ? sprint.name : "No sprint"}
                              {task.story_points > 0
                                ? ` · ${task.story_points} points`
                                : ""}
                            </p>
                            {recommended &&
                              focus.data?.recommendation_reason && (
                                <p className="mt-2 text-xs text-primary/90">
                                  {focus.data.recommendation_reason}
                                </p>
                              )}
                          </div>
                          <Button asChild size="sm" variant="outline">
                            <Link
                              to={workspace(
                                project.id,
                                "now",
                                new URLSearchParams({ task: task.id }),
                              )}
                            >
                              Select and open in NOW
                              <ArrowRight aria-hidden="true" />
                            </Link>
                          </Button>
                        </article>
                      </li>
                    );
                  })}
                </ul>
                {group.total > group.tasks.length && (
                  <p className="border-t border-border/60 px-5 py-3 text-xs text-muted-foreground">
                    Showing {group.tasks.length} of {group.total}.
                  </p>
                )}
              </section>
            ))
          ) : !focus.isPending ? (
            <p className="rounded-2xl border border-dashed border-border bg-surface/55 p-6 text-sm text-muted-foreground">
              {tasks.length === 0
                ? "No Tasks yet. Create one in EXPLORE."
                : tasks.every((task) => task.status === "done")
                  ? "All Tasks are done. Completed work remains on the Board."
                  : priority || sprintId
                    ? "No immediate queue items match these filters. Clear them or review the full Board."
                    : "No immediate queue items. Review the full Board for other work."}
            </p>
          ) : null}
        </div>

        <aside
          aria-label="Focus queue context"
          className="order-first space-y-3 lg:order-none lg:sticky lg:top-5"
        >
          {active && (
            <section className="rounded-2xl border border-primary/30 bg-primary/[0.055] p-4">
              <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-primary uppercase">
                <CircleDot className="size-4" aria-hidden="true" />
                Active work
              </p>
              <h3 className="mt-3 break-words font-semibold">
                {active.task.title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {active.project.name}. Resume controls remain in its NOW
                workspace.
              </p>
              <Button asChild className="mt-4 w-full" size="sm">
                <Link
                  to={workspace(
                    active.project.id,
                    "now",
                    new URLSearchParams({ task: active.task.id }),
                  )}
                >
                  Open active work in NOW
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </section>
          )}

          {paused.length > 0 && (
            <section
              aria-label="Paused and resumable sessions"
              className="space-y-3 rounded-2xl border border-border/70 bg-card/70 p-4"
            >
              <div>
                <h3 className="flex items-center gap-2 font-semibold">
                  <PauseCircle
                    className="size-4 text-warning"
                    aria-hidden="true"
                  />
                  Paused and resumable
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Saved stopping context from the backend.
                </p>
              </div>
              <ul className="space-y-3">
                {paused.slice(0, 5).map((item) => (
                  <li
                    key={item.session.id}
                    className="min-w-0 rounded-xl bg-canvas/40 p-3"
                  >
                    <p className="break-words text-sm font-semibold">
                      {item.task.title}
                    </p>
                    <p className="mt-1 line-clamp-3 whitespace-pre-wrap break-words text-xs text-muted-foreground">
                      {item.session.resume_note || "No resume note saved."}
                    </p>
                    <div className="mt-3 grid gap-2">
                      <Button
                        size="sm"
                        disabled={mutation.isPending || Boolean(active)}
                        onClick={() =>
                          void resume(item.session.id, item.task.id)
                        }
                      >
                        <Play aria-hidden="true" />
                        Resume Task
                      </Button>
                      <Button asChild size="sm" variant="ghost">
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
                  Showing 5 of {paused.length} paused sessions. Open NOW to
                  inspect another saved session.
                </p>
              )}
            </section>
          )}

          {!active && paused.length === 0 && (
            <section className="rounded-2xl border border-dashed border-border p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="size-4 text-primary" aria-hidden="true" />
                Queue ready
              </p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Select a Task from the execution horizon to inspect it in NOW.
                Selection alone does not start a session.
              </p>
            </section>
          )}
        </aside>
      </div>
    </section>
  );
}
