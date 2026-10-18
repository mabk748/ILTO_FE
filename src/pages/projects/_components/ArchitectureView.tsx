import { ExternalLink, GitBranch, Network } from "lucide-react";
import LoadError from "@/components/LoadError.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { ModuleSectionHeader } from "@/components/layout/ModulePage.tsx";
import type { ProjectRepository } from "@/lib/api/types.ts";
import {
  githubRepositoryLinks,
  useProjectRepositories,
} from "../project-repositories.ts";
import { useProjectsViewData } from "../projects-data.ts";
import { useProjectsFilters } from "../project-filters.ts";
import RepositoryControls from "./RepositoryControls.tsx";
import { useProjectScope } from "../project-scope.ts";

function RepositoryCard({
  projectId,
  repository,
}: {
  projectId: string;
  repository: ProjectRepository;
}) {
  const links = githubRepositoryLinks(repository.repository_url);

  return (
    <Card className="gap-4 py-5">
      <CardHeader className="gap-1 px-5">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <CardTitle className="min-w-0 break-words">
            {repository.label}
          </CardTitle>
          <span className="rounded-full border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            GitHub
          </span>
        </div>
        <CardDescription className="break-all">
          {links?.display ??
            "Stored repository URL does not match the GitHub contract."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {links && (
            <>
              <Button asChild size="sm" variant="outline">
                <a
                  href={links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${repository.label} on GitHub`}
                >
                  <GitBranch />
                  Open GitHub
                  <ExternalLink />
                </a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a
                  href={links.gitDiagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${repository.label} in GitDiagram`}
                >
                  <Network />
                  Open GitDiagram
                  <ExternalLink />
                </a>
              </Button>
            </>
          )}
          <RepositoryControls projectId={projectId} repository={repository} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function ArchitectureView() {
  const projectsQuery = useProjectsViewData();
  const projectId = useProjectScope();
  const filterState = useProjectsFilters(projectsQuery.data);
  const selectedProjectId =
    projectId ??
    (filterState.filters.projectIds.length === 1
      ? filterState.filters.projectIds[0]
      : null);
  const selectedProject =
    projectsQuery.data?.projects.find(
      (project) => project.id === selectedProjectId,
    ) ?? null;
  const repositoriesQuery = useProjectRepositories(selectedProject?.id ?? null);

  if (projectsQuery.error) {
    return (
      <LoadError
        error={projectsQuery.error}
        onRetry={() => void projectsQuery.refetch()}
        title="Could not load Projects"
      />
    );
  }

  if (projectsQuery.isPending) {
    return (
      <div className="space-y-4" aria-label="Loading Architecture">
        <Skeleton className="h-9 w-64 max-w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const projects = projectsQuery.data?.projects ?? [];

  return (
    <section className="space-y-5" aria-labelledby="architecture-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div id="architecture-heading">
          <ModuleSectionHeader
            title="Architecture"
            description="Manage source repositories and open external architecture views."
          />
        </div>
        {projectId === undefined && (
          <label className="w-full space-y-1 text-xs sm:w-72">
            <span className="block text-muted-foreground">Project</span>
            <select
              aria-label="Architecture project"
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={selectedProject?.id ?? ""}
              onChange={(event) =>
                filterState.setProjectIds(
                  event.target.value ? [event.target.value] : [],
                )
              }
            >
              <option value="">Choose a project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="font-medium">No projects available.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a project before linking repositories.
          </p>
        </div>
      ) : !selectedProject ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="font-medium">Choose a project.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Architecture shows repositories for one selected Project at a time.
          </p>
        </div>
      ) : repositoriesQuery.error ? (
        <LoadError
          error={repositoriesQuery.error}
          onRetry={() => void repositoriesQuery.refetch()}
          title={`Could not load repositories for ${selectedProject.name}`}
        />
      ) : repositoriesQuery.isPending ? (
        <div
          className="grid gap-4 md:grid-cols-2"
          aria-label="Loading repositories"
        >
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold">{selectedProject.name}</h3>
              <p className="text-sm text-muted-foreground">
                {repositoriesQuery.data?.length ?? 0} linked{" "}
                {(repositoriesQuery.data?.length ?? 0) === 1
                  ? "repository"
                  : "repositories"}
              </p>
            </div>
            {repositoriesQuery.data?.length ? (
              <RepositoryControls projectId={selectedProject.id} />
            ) : null}
          </div>

          {repositoriesQuery.data?.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {repositoriesQuery.data.map((repository) => (
                <RepositoryCard
                  key={repository.id}
                  projectId={selectedProject.id}
                  repository={repository}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <p className="font-medium">No repositories linked yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add a repository to open its source code or architecture
                diagram.
              </p>
              <div className="mt-4 flex justify-center">
                <RepositoryControls projectId={selectedProject.id} />
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            GitDiagram is an external service. Private repositories may require
            authentication in GitDiagram; ILTO does not collect GitHub
            credentials.
          </p>
        </>
      )}
    </section>
  );
}
