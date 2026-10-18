import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  CircleDot,
  Search,
  TimerReset,
} from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateMedia,
  EmptyStateTitle,
} from "@/components/ui/empty-state.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { formatCalendarDate } from "@/lib/calendar-date.ts";
import type { Project, ProjectStatus } from "@/lib/api/types.ts";
import { cn } from "@/lib/utils.ts";
import { useCurrentFocusSession } from "../focus-data.ts";
import type { ProjectsData } from "../projects-data.ts";

const PROJECT_STATUSES: Array<{ value: ProjectStatus; label: string }> = [
  { value: "planning", label: "Planning" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On hold" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

const statusVariant = (status: ProjectStatus) => {
  if (status === "active" || status === "completed") return "success" as const;
  if (status === "on_hold") return "warning" as const;
  return "outline" as const;
};

const priorityVariant = (priority: Project["priority"]) => {
  if (priority === "critical") return "destructive" as const;
  if (priority === "high") return "warning" as const;
  return "secondary" as const;
};

function CurrentFocusShortcut({ data }: { data: ProjectsData }) {
  const current = useCurrentFocusSession();

  if (current.isPending) {
    return (
      <Skeleton className="h-24 w-full" aria-label="Loading current Focus" />
    );
  }
  if (current.error) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/25 bg-warning/5 px-4 py-3 text-sm">
        <p className="text-muted-foreground">
          Current Focus could not be checked. Project navigation is still
          available.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void current.refetch()}
        >
          Retry Focus
        </Button>
      </div>
    );
  }
  if (!current.data) return null;

  const project = data.projects.find(
    (candidate) => candidate.id === current.data?.project_id,
  );
  const task = data.tasks.find(
    (candidate) => candidate.id === current.data?.task_id,
  );
  if (!project) {
    return (
      <div
        role="status"
        className="rounded-xl border border-warning/25 bg-warning/5 px-4 py-3 text-sm text-muted-foreground"
      >
        An active FocusSession references a Project that is not available in the
        current directory. Refresh before starting other work.
      </div>
    );
  }

  return (
    <section
      aria-label="Current Focus"
      className="flex flex-col gap-4 rounded-xl border border-primary/25 bg-primary/[0.055] p-4 shadow-[inset_3px_0_0_var(--primary)] sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <div className="mb-1 flex items-center gap-2">
          <CircleDot className="size-4 text-primary" aria-hidden="true" />
          <p className="text-xs font-semibold tracking-[0.12em] text-primary uppercase">
            Current Focus
          </p>
        </div>
        <p className="truncate font-semibold text-foreground">
          {task?.title ?? "Active task unavailable"}
        </p>
        <p className="truncate text-sm text-muted-foreground">{project.name}</p>
      </div>
      <Button asChild className="sm:shrink-0">
        <Link
          to={`/projects/${encodeURIComponent(project.id)}/now?task=${encodeURIComponent(current.data.task_id)}`}
        >
          Return to NOW
          <ArrowRight />
        </Link>
      </Button>
    </section>
  );
}

function ProjectCard({
  project,
  data,
}: {
  project: Project;
  data: ProjectsData;
}) {
  const tasks = data.tasks.filter((task) => task.project_id === project.id);
  const openTasks = tasks.filter((task) => task.status !== "done").length;
  const activeSprints = data.sprints.filter(
    (sprint) => sprint.project_id === project.id && sprint.status === "active",
  ).length;
  const nextMilestone = data.milestones
    .filter(
      (milestone) =>
        milestone.project_id === project.id && milestone.completed_at === null,
    )
    .sort((left, right) => left.due_date.localeCompare(right.due_date))[0];

  return (
    <Card className="group h-full gap-4 overflow-hidden hover:border-primary/30">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              <Badge variant={statusVariant(project.status)}>
                {project.status.replaceAll("_", " ")}
              </Badge>
              <Badge variant={priorityVariant(project.priority)}>
                {project.priority} priority
              </Badge>
            </div>
            <CardTitle className="break-words text-lg">
              <Link
                to={`/projects/${encodeURIComponent(project.id)}`}
                className="rounded-sm transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                aria-label={`Open project: ${project.name}`}
              >
                {project.name}
              </Link>
            </CardTitle>
          </div>
          <ArrowRight
            aria-hidden="true"
            className="mt-1 size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
          />
        </div>
        <CardDescription className="line-clamp-2 min-h-10 whitespace-pre-wrap">
          {project.description || "No project description yet."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Open Tasks</p>
          <p className="mt-0.5 font-mono font-semibold">{openTasks}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Active Sprints</p>
          <p className="mt-0.5 font-mono font-semibold">{activeSprints}</p>
        </div>
        <div className="col-span-2 flex items-start gap-2 border-t border-border/60 pt-3">
          <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            {formatCalendarDate(project.start_date)}
            {project.end_date
              ? ` – ${formatCalendarDate(project.end_date)}`
              : " · no end date"}
          </p>
        </div>
        {nextMilestone && (
          <div className="col-span-2 flex items-start gap-2">
            <TimerReset className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="min-w-0 text-xs text-muted-foreground">
              <span className="block truncate text-foreground">
                {nextMilestone.title}
              </span>
              Due {formatCalendarDate(nextMilestone.due_date)}
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="mt-auto border-t border-border/60 pt-4">
        <Button asChild variant="ghost" size="sm" className="ml-auto">
          <Link to={`/projects/${encodeURIComponent(project.id)}`}>
            Open workspace
            <ArrowRight />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function ProjectDirectory({ data }: { data: ProjectsData }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const requestedStatus = searchParams.get("status");
  const status = PROJECT_STATUSES.some(
    (option) => option.value === requestedStatus,
  )
    ? (requestedStatus as ProjectStatus)
    : "";
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleProjects = useMemo(
    () =>
      data.projects.filter(
        (project) =>
          (!status || project.status === status) &&
          (!normalizedQuery ||
            project.name.toLocaleLowerCase().includes(normalizedQuery) ||
            project.description.toLocaleLowerCase().includes(normalizedQuery)),
      ),
    [data.projects, normalizedQuery, status],
  );
  const setFilter = (key: "q" | "status", value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };
  const clearFilters = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("q");
    next.delete("status");
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-5">
      <CurrentFocusShortcut data={data} />

      <section
        aria-label="Project directory controls"
        className="grid gap-3 rounded-xl border border-border/80 bg-card/60 p-3 sm:grid-cols-[minmax(0,1fr)_13rem]"
      >
        <label className="relative block">
          <span className="sr-only">Search projects</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setFilter("q", event.target.value)}
            placeholder="Search Projects"
            className="pl-9"
          />
        </label>
        <label>
          <span className="sr-only">Filter projects by status</span>
          <select
            aria-label="Filter projects by status"
            className="h-10 w-full px-3 text-sm"
            value={status}
            onChange={(event) => setFilter("status", event.target.value)}
          >
            <option value="">All statuses</option>
            {PROJECT_STATUSES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p aria-live="polite">
          {visibleProjects.length} of {data.projects.length} Projects
        </p>
        {(query || status) && (
          <Button size="sm" variant="ghost" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {data.projects.length === 0 ? (
        <EmptyState>
          <EmptyStateMedia>
            <CircleDot />
          </EmptyStateMedia>
          <EmptyStateTitle>No Projects yet</EmptyStateTitle>
          <EmptyStateDescription>
            Create your first Project to establish a workspace for Tasks,
            Sprints, Milestones and repositories.
          </EmptyStateDescription>
        </EmptyState>
      ) : visibleProjects.length === 0 ? (
        <EmptyState>
          <EmptyStateTitle>No Projects match these filters</EmptyStateTitle>
          <EmptyStateDescription>
            Change the search or status filter to return to the directory.
          </EmptyStateDescription>
          <EmptyStateActions>
            <Button variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          </EmptyStateActions>
        </EmptyState>
      ) : (
        <section
          aria-label="Project directory"
          className={cn(
            "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3",
            visibleProjects.length === 1 && "xl:grid-cols-2",
          )}
        >
          {visibleProjects.map((project) => (
            <ProjectCard key={project.id} project={project} data={data} />
          ))}
        </section>
      )}
    </div>
  );
}
