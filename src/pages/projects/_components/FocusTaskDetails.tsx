import { Link } from "react-router-dom";
import type { Project, Sprint, Task } from "@/lib/api/types.ts";
import { Button } from "@/components/ui/button.tsx";
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
  return (
    <div className="space-y-3">
      <h3 className="break-words text-xl font-semibold">{task.title}</h3>
      <p className="text-sm text-muted-foreground">Project: {project.name}</p>
      <p className="text-sm">
        Status: {task.status.replaceAll("_", " ")} · Priority: {task.priority}
      </p>
      <div>
        <h4 className="font-medium">Description</h4>
        <p className="whitespace-pre-wrap break-words text-sm">
          {task.description || "No description provided."}
        </p>
      </div>
      <div>
        <h4 className="font-medium">Acceptance criteria</h4>
        <p className="whitespace-pre-wrap break-words text-sm">
          {task.acceptance_criteria?.trim()
            ? task.acceptance_criteria
            : "No acceptance criteria provided."}
        </p>
      </div>
      <p className="text-sm">
        Sprint:{" "}
        {task.sprint_id === null
          ? "No sprint"
          : (sprints.find((sprint) => sprint.id === task.sprint_id)?.name ??
            "Sprint unavailable")}
      </p>
      <Button asChild size="sm" variant="outline">
        <Link
          to={`/projects/${encodeURIComponent(project.id)}/explore?${new URLSearchParams({ view: "board", task: task.id })}`}
        >
          Manage selected task
        </Link>
      </Button>
    </div>
  );
}

export function FocusRepositories({ projectId }: { projectId: string }) {
  const query = useProjectRepositories(projectId);
  return (
    <section
      aria-label="Project repositories"
      className="space-y-2 border-t pt-3"
    >
      <h4 className="text-sm font-medium">Repositories</h4>
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
        <ul className="flex flex-wrap gap-3 text-sm">
          {query.data.map((repo) => {
            const links = githubRepositoryLinks(repo.repository_url);
            return (
              <li key={repo.id}>
                {links ? (
                  <a
                    className="underline"
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
