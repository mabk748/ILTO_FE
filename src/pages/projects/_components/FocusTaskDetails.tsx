import { Link } from "react-router-dom";
import { CheckSquare2, FileText, GitBranch, Settings2 } from "lucide-react";
import type { Project, Sprint, Task } from "@/lib/api/types.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";
import {
  githubRepositoryLinks,
  useProjectRepositories,
} from "../project-repositories.ts";

export function FocusTaskDetails({
  task,
  project,
  sprints,
}: {
  task: Task;
  project: Project;
  sprints: Sprint[];
}) {
  const sprint = sprints.find((item) => item.id === task.sprint_id);
  const priorityVariant =
    task.priority === "critical"
      ? "destructive"
      : task.priority === "high"
        ? "warning"
        : "secondary";
  const statusVariant =
    task.status === "done"
      ? "success"
      : task.status === "in_progress"
        ? "default"
        : task.status === "review"
          ? "info"
          : "outline";

  return (
    <article className="space-y-5" aria-label={`Task context: ${task.title}`}>
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusVariant}>
            {task.status.replaceAll("_", " ")}
          </Badge>
          <Badge variant={priorityVariant}>{task.priority} priority</Badge>
          {task.story_points > 0 && (
            <Badge variant="secondary">{task.story_points} points</Badge>
          )}
        </div>
        <h3 className="break-words font-mono text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
          {task.title}
        </h3>
        <p className="text-sm text-muted-foreground">Project: {project.name}</p>
        <p className="text-sm">
          Status: {task.status.replaceAll("_", " ")} · Priority: {task.priority}
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
          <p>
            Sprint:{" "}
            {task.sprint_id === null
              ? "No sprint"
              : (sprint?.name ?? "Sprint unavailable")}
          </p>
          <p>Assignee: {task.assignee || "Unassigned"}</p>
        </div>
      </header>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-xl bg-canvas/45 p-4">
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="size-4 text-primary" aria-hidden="true" />
            Description
          </h4>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
            {task.description || "No description provided."}
          </p>
        </section>
        <section className="rounded-xl bg-canvas/45 p-4">
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <CheckSquare2 className="size-4 text-primary" aria-hidden="true" />
            Acceptance criteria
          </h4>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
            {task.acceptance_criteria?.trim()
              ? task.acceptance_criteria
              : "No acceptance criteria provided."}
          </p>
        </section>
      </div>

      <Button asChild size="sm" variant="ghost" className="-ml-3">
        <Link
          to={`/projects/${encodeURIComponent(project.id)}/explore?${new URLSearchParams({ view: "board", task: task.id })}`}
        >
          <Settings2 aria-hidden="true" />
          Manage selected task
        </Link>
      </Button>
    </article>
  );
}

export function FocusRepositories({
  projectId,
  compact = false,
}: {
  projectId: string;
  compact?: boolean;
}) {
  const query = useProjectRepositories(projectId);
  return (
    <section
      aria-label="Project repositories"
      className={cn("space-y-3", !compact && "border-t border-border/60 pt-4")}
    >
      <h4 className="flex items-center gap-2 text-sm font-semibold">
        <GitBranch className="size-4 text-info" aria-hidden="true" />
        Repositories
      </h4>
      {query.error ? (
        <div>
          <p role="alert">
            Repositories could not be loaded. Session controls are still
            available.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void query.refetch()}
          >
            Retry repositories
          </Button>
        </div>
      ) : query.isPending ? (
        <p role="status">Loading repositories…</p>
      ) : !query.data?.length ? (
        <p className="text-sm text-muted-foreground">No repositories linked.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {query.data.map((repo) => {
            const links = githubRepositoryLinks(repo.repository_url);
            return (
              <li key={repo.id} className="min-w-0">
                {links ? (
                  <a
                    className="block min-h-10 truncate rounded-lg border border-border/70 bg-canvas/35 px-3 py-2 text-sm transition-colors hover:border-info/35 hover:text-info focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    href={links.github}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {repo.label} (opens a new tab)
                  </a>
                ) : (
                  <span>{repo.label}: URL unavailable</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
