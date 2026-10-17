import { useProjectsViewData } from "../projects-data.ts";
import { useProjectsMutation } from "../use-projects-mutation.ts";
import { projectWriteError } from "../project-editor.ts";
import ResourceControls from "./ResourceControls.tsx";
import type { Priority, Task, TaskStatus } from "@/lib/api/types.ts";
import { updateTask } from "@/lib/api/projects.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";
import LoadError from "@/components/LoadError.tsx";
import { ListChecks } from "lucide-react";
import {
  TASK_CATEGORIES,
  TASK_CATEGORY_LABELS,
  taskCategory,
} from "../task-model.ts";
import {
  NO_SPRINT_FILTER,
  UNASSIGNED_FILTER,
  useProjectsFilters,
} from "../project-filters.ts";
import {
  FilterMultiSelect,
  FilterSelect,
  FilteredEmptyState,
  ProjectFilterBar,
  ProjectScopeFilter,
} from "./ProjectFilterBar.tsx";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "backlog", label: "Backlog" },
  { status: "todo", label: "Todo" },
  { status: "in_progress", label: "In Progress" },
  { status: "review", label: "Review" },
  { status: "done", label: "Done" },
];

const PRIORITY_CLASSES: Record<Priority, string> = {
  critical: "bg-destructive/20 text-destructive border-destructive/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
  low: "bg-muted text-muted-foreground border-border",
};

const BOARD_FILTER_KEYS = [
  "project",
  "sprint",
  "task_status",
  "priority",
  "category",
  "assignee",
] as const;
function TaskCard({
  task,
  projectName,
  sprintName,
}: {
  task: Task;
  projectName: string | undefined;
  sprintName: string;
}) {
  const mutation = useProjectsMutation((status: TaskStatus) =>
    updateTask(task.id, { status }),
  );
  const initials = task.assignee
    ? task.assignee.slice(0, 2).toUpperCase()
    : "?";
  const category = taskCategory(task);

  return (
    <div className="bg-card border border-border rounded-md p-3 space-y-2 hover:border-primary/50 transition-colors">
      <p className="text-sm font-medium leading-tight">{task.title}</p>
      <p
        className="truncate text-xs text-muted-foreground"
        title={projectName ?? "Project unavailable"}
      >
        {`Project: ${projectName ?? "Project unavailable"}`}
      </p>
      <p className="truncate text-xs text-muted-foreground" title={sprintName}>
        {`Sprint: ${sprintName}`}
      </p>
      <label className="block text-xs space-y-1">
        <span>Status</span>
        <select
          aria-label={`Status for ${task.title}`}
          className="w-full rounded border bg-background p-1"
          value={task.status}
          disabled={mutation.isPending}
          onChange={(event) =>
            mutation.mutate(event.target.value as TaskStatus)
          }
        >
          {COLUMNS.map((column) => (
            <option key={column.status} value={column.status}>
              {column.label}
            </option>
          ))}
        </select>
      </label>
      {mutation.error && (
        <p role="alert" className="text-xs text-destructive">
          {projectWriteError(mutation.error)}
        </p>
      )}
      <ResourceControls target={{ kind: "task", record: task }} />
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 flex-wrap">
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-primary/30 bg-primary/10 text-primary font-semibold uppercase tracking-wide">
            {TASK_CATEGORY_LABELS[category]}
          </span>
          <span
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wide",
              PRIORITY_CLASSES[task.priority],
            )}
          >
            {task.priority}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded border bg-muted text-muted-foreground font-mono">
            {task.story_points}sp
          </span>
          {task.acceptance_criteria?.trim() && (
            <span
              className="inline-flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
              aria-label="Acceptance criteria defined"
              title="Acceptance criteria defined"
            >
              <ListChecks className="h-3 w-3" aria-hidden="true" /> Criteria
            </span>
          )}
        </div>
        {task.assignee && (
          <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-[9px] font-bold flex items-center justify-center border border-primary/30 shrink-0">
            {initials}
          </div>
        )}
      </div>
    </div>
  );
}

function ColumnSkeleton() {
  return (
    <div className="min-w-[220px] max-w-[220px] space-y-2">
      <Skeleton className="h-5 w-28" />
      <div className="space-y-2 rounded-md bg-muted/30 p-2 border border-dashed border-border min-h-[80px]">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function KanbanBoard({ taskId }: { taskId?: string } = {}) {
  const { data, error, isPending: loading, refetch } = useProjectsViewData();
  const tasks = (data?.tasks ?? []).filter(
    (task) => !taskId || task.id === taskId,
  );
  const projects = data?.projects ?? [];
  const sprints = data?.sprints ?? [];
  const filterState = useProjectsFilters(data);
  const { filters } = filterState;

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <ColumnSkeleton key={col.status} />
        ))}
      </div>
    );
  }

  if (error) {
    return <LoadError error={error} onRetry={() => void refetch()} />;
  }

  const projectsById = new Map(
    projects.map((project) => [project.id, project.name]),
  );
  const sprintsById = new Map(
    sprints.map((sprint) => [sprint.id, sprint.name]),
  );
  const selectedProjects = new Set(filters.projectIds);
  const visibleSprints = sprints.filter(
    (sprint) =>
      filters.projectIds.length === 0 ||
      selectedProjects.has(sprint.project_id),
  );
  const assignees = Array.from(
    new Set(
      tasks
        .map((task) => task.assignee)
        .filter((assignee): assignee is string => Boolean(assignee)),
    ),
  ).sort((left, right) => left.localeCompare(right));
  const selectedProjectIds = new Set(filters.projectIds);
  const selectedSprintIds = new Set(filters.sprintIds);
  const visibleTasks = tasks.filter((task) => {
    const projectMatches =
      filters.projectIds.length === 0 ||
      selectedProjectIds.has(task.project_id);
    const sprintFilterId = task.sprint_id ?? NO_SPRINT_FILTER;
    const sprintMatches =
      filters.sprintIds.length === 0 || selectedSprintIds.has(sprintFilterId);
    const statusMatches =
      filters.taskStatus === null ||
      (filters.taskStatus === "not_done"
        ? task.status !== "done"
        : task.status === filters.taskStatus);
    const priorityMatches =
      filters.taskPriority === null || task.priority === filters.taskPriority;
    const categoryMatches =
      filters.taskCategory === null ||
      taskCategory(task) === filters.taskCategory;
    const assigneeMatches =
      filters.taskAssignee === null ||
      (filters.taskAssignee === UNASSIGNED_FILTER
        ? !task.assignee
        : task.assignee === filters.taskAssignee);
    return (
      projectMatches &&
      sprintMatches &&
      statusMatches &&
      priorityMatches &&
      categoryMatches &&
      assigneeMatches
    );
  });
  const projectOptions = projects.map((project) => ({
    value: project.id,
    label: project.name,
  }));
  const sprintOptions = [
    ...visibleSprints.map((sprint) => ({
      value: sprint.id,
      label: `${sprint.name} (${projectsById.get(sprint.project_id) ?? "Project unavailable"})`,
    })),
    { value: NO_SPRINT_FILTER, label: "No sprint" },
  ];
  const activeLabels = [
    filters.projectIds.length ? `Projects: ${filters.projectIds.length}` : null,
    filters.sprintIds.length ? `Sprints: ${filters.sprintIds.length}` : null,
    filters.taskStatus
      ? `Status: ${filters.taskStatus.replaceAll("_", " ")}`
      : null,
    filters.taskPriority ? `Priority: ${filters.taskPriority}` : null,
    filters.taskCategory
      ? `Category: ${TASK_CATEGORY_LABELS[filters.taskCategory]}`
      : null,
    filters.taskAssignee
      ? `Assignee: ${filters.taskAssignee === UNASSIGNED_FILTER ? "Unassigned" : filters.taskAssignee}`
      : null,
  ].filter((value): value is string => value !== null);
  const clearFilters = () => filterState.clear(BOARD_FILTER_KEYS);

  return (
    <div className="space-y-4">
      <ProjectFilterBar
        total={tasks.length}
        shown={visibleTasks.length}
        noun="task"
        activeLabels={activeLabels}
        onClear={clearFilters}
      >
        <ProjectScopeFilter
          label="Filter tasks by project"
          allLabel="All projects"
          values={filters.projectIds}
          options={projectOptions}
          onChange={filterState.setProjectIds}
        />
        <FilterMultiSelect
          label="Filter tasks by sprint"
          allLabel="All sprints"
          values={filters.sprintIds}
          options={sprintOptions}
          onChange={(values) => filterState.setMulti("sprint", values)}
        />
        <FilterSelect
          label="Filter tasks by status"
          allLabel="All statuses"
          value={filters.taskStatus}
          options={[
            { value: "not_done", label: "Not done" },
            ...COLUMNS.map((column) => ({
              value: column.status,
              label: column.label,
            })),
          ]}
          onChange={(value) => filterState.setSingle("task_status", value)}
        />
        <FilterSelect
          label="Filter tasks by priority"
          allLabel="All priorities"
          value={filters.taskPriority}
          options={(["low", "medium", "high", "critical"] as const).map(
            (priority) => ({ value: priority, label: priority }),
          )}
          onChange={(value) => filterState.setSingle("priority", value)}
        />
        <FilterSelect
          label="Filter tasks by category"
          allLabel="All categories"
          value={filters.taskCategory}
          options={TASK_CATEGORIES.map((category) => ({
            value: category,
            label: TASK_CATEGORY_LABELS[category],
          }))}
          onChange={(value) => filterState.setSingle("category", value)}
        />
        <FilterSelect
          label="Filter tasks by assignee"
          allLabel="All assignees"
          value={filters.taskAssignee}
          options={[
            { value: UNASSIGNED_FILTER, label: "Unassigned" },
            ...assignees.map((assignee) => ({
              value: assignee,
              label: assignee,
            })),
          ]}
          onChange={(value) => filterState.setSingle("assignee", value)}
        />
      </ProjectFilterBar>

      {tasks.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No tasks yet.
        </div>
      ) : visibleTasks.length === 0 ? (
        <FilteredEmptyState noun="tasks" onClear={clearFilters} />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const colTasks = visibleTasks.filter(
              (t) => t.status === col.status,
            );
            return (
              <div
                key={col.status}
                className="min-w-[220px] max-w-[220px] space-y-2"
              >
                <div className="flex items-center gap-2 px-1">
                  <span className="text-sm font-semibold">{col.label}</span>
                  <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5 font-mono leading-none">
                    {colTasks.length}
                  </span>
                </div>
                <div className="space-y-2 min-h-[80px] rounded-md bg-muted/30 p-2 border border-dashed border-border">
                  {colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      projectName={projectsById.get(task.project_id)}
                      sprintName={
                        task.sprint_id === null
                          ? "No sprint"
                          : (sprintsById.get(task.sprint_id) ??
                            "Sprint unavailable")
                      }
                    />
                  ))}
                  {colTasks.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      Empty
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
