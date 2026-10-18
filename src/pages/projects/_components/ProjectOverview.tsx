import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Flag,
  GitBranch,
  Layers3,
  ListChecks,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import {
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateMedia,
  EmptyStateTitle,
} from "@/components/ui/empty-state.tsx";
import { formatCalendarDate } from "@/lib/calendar-date.ts";
import type { Project, TaskStatus } from "@/lib/api/types.ts";
import type { ProjectsData } from "../projects-data.ts";
import {
  projectDashboardMetrics,
  TASK_STATUS_LABELS,
} from "../project-dashboard.ts";
import { useProjectFocus } from "../focus-data.ts";
import { useProjectRepositories } from "../project-repositories.ts";
import ResourceControls from "./ResourceControls.tsx";
import VelocityChart from "./VelocityChart.tsx";

const projectPath = (id: string) => `/projects/${encodeURIComponent(id)}`;
const explore = (projectId: string, params: Record<string, string>) =>
  `${projectPath(projectId)}/explore?${new URLSearchParams(params)}`;
const STATUS_BAR: Record<TaskStatus, string> = {
  backlog: "bg-muted-foreground",
  todo: "bg-info",
  in_progress: "bg-primary",
  review: "bg-warning",
  done: "bg-success",
};

function MetricLink({
  label,
  value,
  detail,
  to,
}: {
  label: string;
  value: string | number;
  detail?: string;
  to: string;
}) {
  return (
    <Link
      className="group flex min-w-0 items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/55 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      to={to}
    >
      <span className="min-w-0">
        <span className="block text-xs text-muted-foreground">{label}</span>
        {detail && (
          <span className="block truncate text-[0.68rem] text-muted-foreground/80">
            {detail}
          </span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-2 font-mono text-base font-semibold tabular-nums">
        {value}
        <ArrowRight
          className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </span>
    </Link>
  );
}

export default function ProjectOverview({
  project,
  data,
}: {
  project: Project;
  data: ProjectsData;
}) {
  const metrics = projectDashboardMetrics(
    data.tasks,
    data.sprints,
    data.milestones,
  );
  const focus = useProjectFocus(project.id);
  const repositories = useProjectRepositories(project.id);
  const board = (status?: string) =>
    explore(project.id, {
      view: "board",
      ...(status ? { task_status: status } : {}),
    });
  const activeSprintView = explore(project.id, {
    view: "sprints",
    sprint_status: "active",
  });
  const milestoneView = explore(project.id, { view: "milestones" });
  const architectureView = explore(project.id, { view: "architecture" });

  const focusAction = (() => {
    const projection = focus.data;
    if (!projection) return null;
    if (projection.active_session)
      return {
        label: `Continue ${projection.active_session.task.title}`,
        detail: "Active FocusSession",
        to: `${projectPath(project.id)}/now?${new URLSearchParams({ task: projection.active_session.task.id })}`,
      };
    if (projection.active_session_elsewhere)
      return {
        label: `Continue ${projection.active_session_elsewhere.task.title}`,
        detail: `Active in ${projection.active_session_elsewhere.project.name}`,
        to: `${projectPath(projection.active_session_elsewhere.project.id)}/now?${new URLSearchParams({ task: projection.active_session_elsewhere.task.id })}`,
      };
    if (projection.paused_sessions[0])
      return {
        label: `Resume ${projection.paused_sessions[0].task.title}`,
        detail: "Paused FocusSession",
        to: `${projectPath(project.id)}/now?${new URLSearchParams({ task: projection.paused_sessions[0].task.id, session: projection.paused_sessions[0].session.id })}`,
      };
    if (projection.recommended_task)
      return {
        label: `Start ${projection.recommended_task.title}`,
        detail: projection.recommendation_reason ?? "Backend recommendation",
        to: `${projectPath(project.id)}/now?${new URLSearchParams({ task: projection.recommended_task.id })}`,
      };
    return {
      label: "Review the Project Board",
      detail: "No eligible recommendation",
      to: board("not_done"),
    };
  })();

  return (
    <section aria-label="Project overview" className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-mono text-lg font-bold">Project overview</h3>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            A scoped reading of delivery, Sprint and Milestone records with
            direct paths into management.
          </p>
        </div>
        <ResourceControls target={{ kind: "project", record: project }} />
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <section
          aria-labelledby="task-status-heading"
          className="relative overflow-hidden rounded-2xl border border-border/70 bg-surface/80 p-4 sm:p-6"
        >
          {metrics.totalTasks === 0 ? (
            <EmptyState className="border-0 bg-transparent p-2 sm:p-4">
              <EmptyStateMedia>
                <ListChecks aria-hidden="true" />
              </EmptyStateMedia>
              <EmptyStateTitle>No Tasks in this Project</EmptyStateTitle>
              <EmptyStateDescription>
                Add the first Task before ILTO can show delivery status or a
                completion ratio.
              </EmptyStateDescription>
              <EmptyStateActions>
                <ResourceControls target={{ kind: "task" }} />
              </EmptyStateActions>
            </EmptyState>
          ) : (
            <>
              <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-primary/5 via-primary/75 to-primary/5"
              />
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                    <ListChecks className="size-4" aria-hidden="true" />
                    Delivery signal
                  </p>
                  <h4
                    id="task-status-heading"
                    className="mt-3 font-mono text-xl font-bold"
                  >
                    Tasks by status
                  </h4>
                </div>
                <div className="sm:text-right">
                  <p className="font-mono text-3xl font-bold tabular-nums">
                    {metrics.taskCompletionPercent === null
                      ? "—"
                      : `${metrics.taskCompletionPercent}%`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {metrics.taskCompletionPercent === null
                      ? "No percentage without Tasks"
                      : `${metrics.completedTasks} of ${metrics.totalTasks} Tasks completed`}
                  </p>
                </div>
              </div>

              {metrics.taskCompletionPercent !== null && (
                <Progress
                  className="mt-5 h-2.5"
                  aria-label={`Tasks completed: ${metrics.completedTasks} of ${metrics.totalTasks}`}
                  value={metrics.taskCompletionPercent}
                />
              )}

              {metrics.totalTasks > 0 && (
                <div
                  className="mt-4 flex h-2 overflow-hidden rounded-full bg-muted"
                  role="img"
                  aria-label="Task status distribution"
                >
                  {(Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map(
                    (status) =>
                      metrics.tasksByStatus[status] > 0 && (
                        <span
                          key={status}
                          className={STATUS_BAR[status]}
                          style={{
                            width: `${(metrics.tasksByStatus[status] / metrics.totalTasks) * 100}%`,
                          }}
                        />
                      ),
                  )}
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-1 sm:grid-cols-4">
                <MetricLink
                  label="Total Tasks"
                  value={metrics.totalTasks}
                  to={board()}
                />
                <MetricLink
                  label="Open tasks"
                  value={metrics.totalTasks - metrics.completedTasks}
                  to={board("not_done")}
                />
                <MetricLink
                  label="In-progress Tasks"
                  value={metrics.inProgressTasks}
                  to={board("in_progress")}
                />
                <MetricLink
                  label="Tasks completed"
                  value={`${metrics.completedTasks} / ${metrics.totalTasks}`}
                  detail={
                    metrics.taskCompletionPercent === null
                      ? "No completion ratio"
                      : `${metrics.taskCompletionPercent}% of all Project Tasks`
                  }
                  to={board("done")}
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-1 border-t border-border/60 pt-3 sm:grid-cols-5">
                {Object.entries(TASK_STATUS_LABELS).map(([status, label]) => (
                  <MetricLink
                    key={status}
                    label={label}
                    value={
                      metrics.tasksByStatus[
                        status as keyof typeof metrics.tasksByStatus
                      ]
                    }
                    to={board(status)}
                  />
                ))}
              </div>
            </>
          )}
        </section>

        <section className="relative overflow-hidden rounded-2xl border border-primary/25 bg-primary/[0.055] p-4 sm:p-5">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-primary uppercase">
            <Sparkles className="size-4" aria-hidden="true" />
            Next recommended action
          </p>
          {focus.isPending ? (
            <p role="status" className="mt-4 text-sm">
              Loading recommendation…
            </p>
          ) : focus.error ? (
            <div className="mt-4 space-y-3">
              <p role="alert" className="text-sm text-muted-foreground">
                Recommendation unavailable. Other Project metrics remain usable.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void focus.refetch()}
              >
                Retry recommendation
              </Button>
            </div>
          ) : focusAction ? (
            <div className="mt-5">
              <h4 className="break-words font-mono text-lg font-bold">
                {focusAction.label}
              </h4>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {focusAction.detail}
              </p>
              <Button asChild className="mt-5 w-full">
                <Link to={focusAction.to} aria-label={focusAction.label}>
                  Open in NOW
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
          ) : null}
        </section>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        <section className="space-y-4 rounded-2xl border border-border/70 bg-card/70 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="flex items-center gap-2 font-semibold">
                <Layers3 className="size-4 text-primary" aria-hidden="true" />
                Active Sprint story points
              </h4>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Done points divided by all assigned points across every active
                Sprint.
              </p>
            </div>
            <Badge variant="outline">
              {metrics.activeSprints.length} active
            </Badge>
          </div>
          {metrics.activeSprints.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active Sprints. Planned and completed Sprints remain available
              in management.
            </p>
          ) : metrics.activeSprintProgressPercent === null ? (
            <p className="text-sm text-muted-foreground">
              {metrics.activeSprints.length} active{" "}
              {metrics.activeSprints.length === 1
                ? "Sprint has"
                : "Sprints have"}{" "}
              no assigned story points.
            </p>
          ) : (
            <>
              <p className="font-mono text-2xl font-bold tabular-nums">
                {metrics.completedActiveSprintPoints} /{" "}
                {metrics.activeSprintPoints}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  points
                </span>
              </p>
              <Progress
                aria-label={`Active Sprint story points completed: ${metrics.completedActiveSprintPoints} of ${metrics.activeSprintPoints}`}
                value={metrics.activeSprintProgressPercent}
              />
            </>
          )}
          <Button asChild size="sm" variant="ghost" className="-ml-3">
            <Link to={activeSprintView}>
              Open active Sprint details
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </section>

        <section className="space-y-4 rounded-2xl border border-border/70 bg-card/70 p-4 sm:p-5">
          <div>
            <h4 className="flex items-center gap-2 font-semibold">
              <Flag className="size-4 text-warning" aria-hidden="true" />
              Milestones
            </h4>
            {metrics.totalMilestones > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {metrics.completedMilestones} / {metrics.totalMilestones}{" "}
                completed
              </p>
            )}
          </div>
          {metrics.totalMilestones === 0 ? (
            <p className="text-sm text-muted-foreground">
              No Milestones have been added to this Project.
            </p>
          ) : (
            <Progress
              aria-label={`Milestones completed: ${metrics.completedMilestones} of ${metrics.totalMilestones}`}
              value={metrics.milestoneCompletionPercent}
            />
          )}
          {metrics.upcomingMilestones.length ? (
            <ul className="divide-y divide-border/60">
              {metrics.upcomingMilestones.map((milestone) => (
                <li key={milestone.id} className="py-2">
                  <Link
                    className="flex min-h-10 items-start justify-between gap-3 rounded-md text-sm hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    to={explore(project.id, {
                      view: "milestones",
                      milestone: milestone.id,
                    })}
                  >
                    <span className="break-words">{milestone.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatCalendarDate(milestone.due_date)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No incomplete Milestones due today or later.
            </p>
          )}
          <Button asChild size="sm" variant="ghost" className="-ml-3">
            <Link to={milestoneView}>
              Open all Milestones
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </section>

        <section className="space-y-4 rounded-2xl border border-border/70 bg-card/70 p-4 sm:p-5">
          <div>
            <h4 className="flex items-center gap-2 font-semibold">
              <GitBranch className="size-4 text-info" aria-hidden="true" />
              Repository references
            </h4>
            <p className="mt-1 text-xs text-muted-foreground">
              Confirmed Project architecture links.
            </p>
          </div>
          {repositories.isPending ? (
            <p role="status" className="text-sm">
              Loading repositories…
            </p>
          ) : repositories.error ? (
            <p role="alert" className="text-sm">
              Repository references unavailable.
            </p>
          ) : repositories.data?.length ? (
            <ul className="space-y-2 text-sm">
              {repositories.data.slice(0, 3).map((repository) => (
                <li
                  key={repository.id}
                  className="truncate rounded-lg bg-canvas/35 px-3 py-2"
                >
                  {repository.label}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No repositories linked.
            </p>
          )}
          <Button asChild size="sm" variant="ghost" className="-ml-3">
            <Link to={architectureView}>
              Open Architecture
              {repositories.data?.length
                ? ` (${repositories.data.length})`
                : ""}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </section>
      </div>

      {data.sprints.length >= 2 && (
        <section className="space-y-4 rounded-2xl border border-border/70 bg-card/65 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="font-semibold">Backend Sprint velocity</h4>
              <p className="mt-1 text-xs text-muted-foreground">
                Server-owned velocity across Project Sprints.
              </p>
            </div>
            <Link
              className="text-sm text-primary hover:underline"
              to={explore(project.id, { view: "sprints" })}
            >
              Sprint details
            </Link>
          </div>
          <div className="hidden sm:block">
            <VelocityChart sprints={data.sprints} />
          </div>
          <ul className="space-y-2 sm:hidden" aria-label="Sprint velocity list">
            {data.sprints.map((sprint) => (
              <li
                key={sprint.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-canvas/35 px-3 py-2 text-sm"
              >
                <span className="truncate">{sprint.name}</span>
                <span className="font-mono font-semibold tabular-nums">
                  {sprint.velocity}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <CalendarDays className="size-4" aria-hidden="true" />
        <span>
          {formatCalendarDate(project.start_date)} –{" "}
          {project.end_date
            ? formatCalendarDate(project.end_date)
            : "No end date"}
        </span>
      </div>
    </section>
  );
}
