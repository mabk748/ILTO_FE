import { getArray } from "./resource.ts";
/** Implemented Projects contract: see backend docs/projects-module.md. */
import { apiClient, type ApiRequestOptions } from "./client.ts";
import { encodeId, getNullable, getPage } from "./resource.ts";
import type {
  Project,
  Sprint,
  Task,
  Milestone,
  PaginatedResponse,
} from "./types.ts";

export function getProjects(
  pagination: { page?: number; per_page?: number } = {},
  options: ApiRequestOptions = {},
): Promise<PaginatedResponse<Project>> {
  return getPage<Project>(`/projects`, {
    ...options,
    query: { ...options.query, ...{ page: 1, per_page: 100, ...pagination } },
  });
}

/** Existing overview screens need the complete project list, not just page one. */
export async function getAllProjects(
  options: ApiRequestOptions = {},
): Promise<Project[]> {
  const first = await getProjects({ page: 1, per_page: 100 }, options);
  const projects = [...first.data];
  for (let page = 2; page <= first.total_pages; page += 1) {
    options.signal?.throwIfAborted();
    const response = await getProjects(
      { page, per_page: first.per_page },
      options,
    );
    projects.push(...response.data);
  }
  return projects;
}

export function getProject(
  id: string,
  options: ApiRequestOptions = {},
): Promise<Project | null> {
  return getNullable<Project>(`/projects/${encodeId(id)}`, options);
}

export function getSprints(
  projectId?: string,
  options: ApiRequestOptions = {},
): Promise<Sprint[]> {
  return getArray<Sprint>(`/projects/sprints`, {
    ...options,
    query: { ...options.query, ...{ project_id: projectId } },
  });
}

export function getTasks(
  filters: {
    sprintId?: string;
    projectId?: string;
    status?: Task["status"];
  } = {},
  options: ApiRequestOptions = {},
): Promise<Task[]> {
  return getArray<Task>(`/projects/tasks`, {
    ...options,
    query: {
      ...options.query,
      ...{
        sprint_id: filters.sprintId,
        project_id: filters.projectId,
        status: filters.status,
      },
    },
  });
}

export function getMilestones(
  projectId?: string,
  options: ApiRequestOptions = {},
): Promise<Milestone[]> {
  return getArray<Milestone>(`/projects/milestones`, {
    ...options,
    query: { ...options.query, ...{ project_id: projectId } },
  });
}

export type CreateProjectInput = Omit<
  Project,
  "id" | "created_at" | "updated_at"
>;
export type UpdateProjectInput = Partial<CreateProjectInput>;

export function createProject(
  input: CreateProjectInput,
  options: ApiRequestOptions = {},
): Promise<Project> {
  return apiClient.post<Project>("/projects", input, options);
}

export function updateProject(
  id: string,
  input: UpdateProjectInput,
  options: ApiRequestOptions = {},
): Promise<Project> {
  return apiClient.patch<Project>(`/projects/${encodeId(id)}`, input, options);
}

export function deleteProject(
  id: string,
  options: ApiRequestOptions = {},
): Promise<void> {
  return apiClient.delete(`/projects/${encodeId(id)}`, options);
}

export type CreateSprintInput = Omit<Sprint, "id" | "created_at" | "velocity">;
export type UpdateSprintInput = Partial<CreateSprintInput>;

export function createSprint(
  input: CreateSprintInput,
  options: ApiRequestOptions = {},
): Promise<Sprint> {
  return apiClient.post<Sprint>("/projects/sprints", input, options);
}

export function updateSprint(
  id: string,
  input: UpdateSprintInput,
  options: ApiRequestOptions = {},
): Promise<Sprint> {
  return apiClient.patch<Sprint>(
    `/projects/sprints/${encodeId(id)}`,
    input,
    options,
  );
}

export function deleteSprint(
  id: string,
  options: ApiRequestOptions = {},
): Promise<void> {
  return apiClient.delete(`/projects/sprints/${encodeId(id)}`, options);
}

export type CreateTaskInput = Omit<Task, "id" | "created_at" | "updated_at">;
export type UpdateTaskInput = Partial<CreateTaskInput>;

export function createTask(
  input: CreateTaskInput,
  options: ApiRequestOptions = {},
): Promise<Task> {
  return apiClient.post<Task>("/projects/tasks", input, options);
}

export function updateTask(
  id: string,
  input: UpdateTaskInput,
  options: ApiRequestOptions = {},
): Promise<Task> {
  return apiClient.patch<Task>(
    `/projects/tasks/${encodeId(id)}`,
    input,
    options,
  );
}

export function deleteTask(
  id: string,
  options: ApiRequestOptions = {},
): Promise<void> {
  return apiClient.delete(`/projects/tasks/${encodeId(id)}`, options);
}

export type CreateMilestoneInput = Omit<Milestone, "id" | "created_at">;
export type UpdateMilestoneInput = Partial<CreateMilestoneInput>;

export function createMilestone(
  input: CreateMilestoneInput,
  options: ApiRequestOptions = {},
): Promise<Milestone> {
  return apiClient.post<Milestone>("/projects/milestones", input, options);
}

export function updateMilestone(
  id: string,
  input: UpdateMilestoneInput,
  options: ApiRequestOptions = {},
): Promise<Milestone> {
  return apiClient.patch<Milestone>(
    `/projects/milestones/${encodeId(id)}`,
    input,
    options,
  );
}

export function deleteMilestone(
  id: string,
  options: ApiRequestOptions = {},
): Promise<void> {
  return apiClient.delete(`/projects/milestones/${encodeId(id)}`, options);
}
