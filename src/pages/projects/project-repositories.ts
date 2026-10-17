import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/errors.ts";
import {
  createProjectRepository,
  deleteProjectRepository,
  getProjectRepositories,
  updateProjectRepository,
  type CreateProjectRepositoryInput,
  type UpdateProjectRepositoryInput,
} from "@/lib/api/projects.ts";
import type { ProjectRepository } from "@/lib/api/types.ts";

export interface RepositoryDraft {
  label: string;
  repository_url: string;
}

export const projectRepositoriesQueryKey = (projectId: string) =>
  ["projects", "repositories", projectId] as const;

export function useProjectRepositories(projectId: string | null) {
  return useQuery({
    queryKey: projectRepositoriesQueryKey(projectId ?? "unselected"),
    enabled: projectId !== null,
    queryFn: ({ signal }) => getProjectRepositories(projectId!, { signal }),
  });
}

export function useProjectRepositoryMutation<T>(
  projectId: string,
  write: (input: T) => Promise<unknown>,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: write,
    retry: false,
    onSuccess: async () => {
      await client.invalidateQueries({
        queryKey: projectRepositoriesQueryKey(projectId),
      });
    },
  });
}

export function initialRepositoryDraft(
  repository?: ProjectRepository,
): RepositoryDraft {
  return {
    label: repository?.label ?? "",
    repository_url: repository?.repository_url ?? "",
  };
}

export function createRepositoryInput(
  projectId: string,
  draft: RepositoryDraft,
): CreateProjectRepositoryInput {
  return {
    project_id: projectId,
    label: draft.label,
    provider: "github",
    repository_url: draft.repository_url,
  };
}

export function updateRepositoryInput(
  repository: ProjectRepository,
  draft: RepositoryDraft,
): UpdateProjectRepositoryInput {
  const input: UpdateProjectRepositoryInput = {};
  if (draft.label !== repository.label) input.label = draft.label;
  if (draft.repository_url !== repository.repository_url)
    input.repository_url = draft.repository_url;
  return input;
}

export function saveProjectRepository(
  projectId: string,
  draft: RepositoryDraft,
  repository?: ProjectRepository,
) {
  return repository
    ? updateProjectRepository(
        repository.id,
        updateRepositoryInput(repository, draft),
      )
    : createProjectRepository(createRepositoryInput(projectId, draft));
}

export function removeProjectRepository(repository: ProjectRepository) {
  return deleteProjectRepository(repository.id);
}

export interface GithubRepositoryLinks {
  display: string;
  github: string;
  gitDiagram: string;
}

/** Accept only the canonical URL shape returned by the backend. */
export function githubRepositoryLinks(
  repositoryUrl: string,
): GithubRepositoryLinks | null {
  try {
    const url = new URL(repositoryUrl);
    const segments = url.pathname.split("/").filter(Boolean);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "github.com" ||
      url.port ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      segments.length !== 2 ||
      !segments.every((segment) => /^[a-z0-9._-]+$/.test(segment)) ||
      segments[1].endsWith(".git") ||
      repositoryUrl !== `https://github.com/${segments[0]}/${segments[1]}`
    ) {
      return null;
    }
    const [owner, repository] = segments;
    return {
      display: `${owner}/${repository}`,
      github: repositoryUrl,
      gitDiagram: `https://gitdiagram.com/${owner}/${repository}`,
    };
  } catch {
    return null;
  }
}

export function repositoryWriteError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409)
      return "This GitHub repository is already linked to the selected project.";
    if (error.status === 422)
      return "The backend rejected these values. Use a nonblank label and an HTTPS github.com owner/repository URL.";
    if (error.status === 404)
      return "This repository or project no longer exists. Close the form and refresh before trying again.";
    if (
      error.status === 503 ||
      error.code === "network" ||
      error.code === "timeout"
    )
      return "The backend could not confirm this change. Refresh and check whether it was saved before retrying, to avoid duplicates.";
  }
  return error instanceof Error
    ? error.message
    : "Could not save the repository change.";
}
