import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { formatCalendarDate } from "@/lib/calendar-date.ts";
import type { Project } from "@/lib/api/types.ts";
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
      className="min-w-0 rounded-lg border p-3 transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
      to={to}
    >
      <span className="block text-xs text-muted-foreground">{label}</span>
      <span className="block text-xl font-semibold tabular-nums">{value}</span>
      {detail && (
        <span className="block text-xs text-muted-foreground">{detail}</span>
      )}
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
    <section aria-label="Project overview" className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Project overview</h3>
          <p className="text-sm text-muted-foreground">
            Reliable Project records with direct paths to their management
            views.
          </p>
        </div>
        <ResourceControls target={{ kind: "project", record: project }} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
              ? "No percentage without Tasks"
              : `${metrics.taskCompletionPercent}% of all Project Tasks`
          }
          to={board("done")}
        />
      </div>

      <section aria-labelledby="task-status-heading" className="space-y-2">
        <h4 id="task-status-heading" className="text-sm font-semibold">
          Tasks by status
        </h4>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
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
        {metrics.taskCompletionPercent !== null && (
          <Progress
            aria-label={`Tasks completed: ${metrics.completedTasks} of ${metrics.totalTasks}`}
            value={metrics.taskCompletionPercent}
          />
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3 rounded-lg border p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="font-semibold">Active Sprint story points</h4>
              <p className="text-sm text-muted-foreground">
                Done points divided by all assigned points across every active
                Sprint.
              </p>
            </div>
            <Link className="text-sm underline" to={activeSprintView}>
              {metrics.activeSprints.length} active
            </Link>
          </div>
          <p className="text-lg font-semibold tabular-nums">
            {metrics.completedActiveSprintPoints} / {metrics.activeSprintPoints}{" "}
            points
          </p>
          {metrics.activeSprintProgressPercent === null ? (
            <p className="text-xs text-muted-foreground">
              No percentage: active Sprints have zero assigned story points.
            </p>
          ) : (
            <Progress
              aria-label={`Active Sprint story points completed: ${metrics.completedActiveSprintPoints} of ${metrics.activeSprintPoints}`}
              value={metrics.activeSprintProgressPercent}
            />
          )}
          <Link className="text-sm underline" to={activeSprintView}>
            Open active Sprint details
          </Link>
        </section>

        <section className="space-y-3 rounded-lg border p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="font-semibold">Milestones completed</h4>
              <p className="text-sm text-muted-foreground">
                Completed Milestone records divided by all Project Milestones.
              </p>
            </div>
            <Link className="text-sm underline" to={milestoneView}>
              View milestones
            </Link>
          </div>
          <p className="text-lg font-semibold tabular-nums">
            {metrics.completedMilestones} / {metrics.totalMilestones}
          </p>
          {metrics.milestoneCompletionPercent === null ? (
            <p className="text-xs text-muted-foreground">
              No percentage without Milestones.
            </p>
          ) : (
            <Progress
              aria-label={`Milestones completed: ${metrics.completedMilestones} of ${metrics.totalMilestones}`}
              value={metrics.milestoneCompletionPercent}
            />
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3 rounded-lg border p-4">
          <h4 className="font-semibold">Upcoming Milestone dates</h4>
          {metrics.upcomingMilestones.length ? (
            <ul className="divide-y">
              {metrics.upcomingMilestones.map((milestone) => (
                <li key={milestone.id} className="py-2">
                  <Link
                    className="flex items-start justify-between gap-3 text-sm hover:underline"
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
          <Link className="text-sm underline" to={milestoneView}>
            Open all Milestones
          </Link>
        </section>

        <section className="space-y-3 rounded-lg border p-4">
          <h4 className="font-semibold">Repository references</h4>
          {repositories.isPending ? (
            <p role="status" className="text-sm">
              Loading repositories…
            </p>
          ) : repositories.error ? (
            <p role="alert" className="text-sm">
              Repository references unavailable.
            </p>
          ) : repositories.data?.length ? (
            <ul className="space-y-1 text-sm">
              {repositories.data.slice(0, 3).map((repository) => (
                <li key={repository.id} className="break-words">
                  {repository.label}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No repositories linked.
            </p>
          )}
          <Link className="text-sm underline" to={architectureView}>
            Open Architecture
            {repositories.data?.length ? ` (${repositories.data.length})` : ""}
          </Link>
        </section>
      </div>

      <section className="space-y-2 rounded-lg border p-4">
        <h4 className="font-semibold">Next recommended action</h4>
        {focus.isPending ? (
          <p role="status" className="text-sm">
            Loading recommendation…
          </p>
        ) : focus.error ? (
          <div className="space-y-2">
            <p role="alert" className="text-sm">
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
          <Link
            className="block rounded border p-3 hover:bg-muted/40"
            to={focusAction.to}
          >
            <span className="block text-sm font-semibold">
              {focusAction.label}
            </span>
            <span className="block text-xs text-muted-foreground">
              {focusAction.detail}
            </span>
          </Link>
        ) : null}
      </section>

      {data.sprints.length >= 2 && (
        <section className="space-y-2 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-semibold">Backend Sprint velocity</h4>
            <Link
              className="text-sm underline"
              to={explore(project.id, { view: "sprints" })}
            >
              Sprint details
            </Link>
          </div>
          <VelocityChart sprints={data.sprints} />
        </section>
      )}

      <p className="text-sm">
        {formatCalendarDate(project.start_date)} –{" "}
        {project.end_date
          ? formatCalendarDate(project.end_date)
          : "No end date"}
      </p>
    </section>
  );
}
