import { getArray } from "./resource.ts";
export {
  getProjectDeleteImpact,
  deleteProjectWithContents,
} from "./project-deletion.ts";
export type {
  ProjectDeleteImpact,
  ProjectDeleteResult,
  ProjectDeletedCounts,
  ProjectUnlinkedCounts,
  ProjectDeleteFocusSessionImpact,
} from "./project-deletion.ts";
/** Implemented Projects contract: see backend docs/projects-module.md. */
import { apiClient, type ApiRequestOptions } from "./client.ts";
import { encodeId, getNullable, getPage } from "./resource.ts";
import type {
  Project,
  Sprint,
  Task,
  TaskCategory,
  Milestone,
  ProjectRepository,
  Workstream,
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
  workstreamId?: string,
): Promise<Sprint[]> {
  return getArray<Sprint>(`/projects/sprints`, {
    ...options,
    query: {
      ...options.query,
      ...{ project_id: projectId, workstream_id: workstreamId },
    },
  });
}

export function getWorkstreams(
  projectId: string,
  options: ApiRequestOptions = {},
): Promise<Workstream[]> {
  return getArray<Workstream>(`/projects/workstreams`, {
    ...options,
    query: { ...options.query, project_id: projectId },
  });
}

export function getTasks(
  filters: {
    sprintId?: string;
    projectId?: string;
    status?: Task["status"];
    workstreamId?: string;
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
        workstream_id: filters.workstreamId,
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

export type CreateSprintInput = Omit<
  Sprint,
  "id" | "created_at" | "velocity" | "workstream_id"
> & { workstream_id?: string | null };
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

export type CreateWorkstreamInput = Omit<
  Workstream,
  "id" | "created_at" | "updated_at"
>;
export type UpdateWorkstreamInput = Partial<
  Pick<Workstream, "name" | "description" | "status">
>;

export function createWorkstream(
  input: CreateWorkstreamInput,
  options: ApiRequestOptions = {},
): Promise<Workstream> {
  return apiClient.post<Workstream>("/projects/workstreams", input, options);
}

export function updateWorkstream(
  id: string,
  input: UpdateWorkstreamInput,
  options: ApiRequestOptions = {},
): Promise<Workstream> {
  return apiClient.patch<Workstream>(
    `/projects/workstreams/${encodeId(id)}`,
    input,
    options,
  );
}

export type CreateTaskInput = Omit<
  Task,
  | "id"
  | "created_at"
  | "updated_at"
  | "category"
  | "acceptance_criteria"
  | "workstream_id"
> & {
  category: TaskCategory;
  acceptance_criteria: string | null;
  workstream_id?: string | null;
};
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

export function getProjectRepositories(
  projectId?: string,
  options: ApiRequestOptions = {},
): Promise<ProjectRepository[]> {
  return getArray<ProjectRepository>("/projects/repositories", {
    ...options,
    query: { ...options.query, project_id: projectId },
  });
}

export type CreateProjectRepositoryInput = Pick<
  ProjectRepository,
  "project_id" | "label" | "provider" | "repository_url"
>;
export type UpdateProjectRepositoryInput = Partial<
  Pick<ProjectRepository, "label" | "repository_url">
>;

export function createProjectRepository(
  input: CreateProjectRepositoryInput,
  options: ApiRequestOptions = {},
): Promise<ProjectRepository> {
  return apiClient.post<ProjectRepository>(
    "/projects/repositories",
    input,
    options,
  );
}

export function updateProjectRepository(
  id: string,
  input: UpdateProjectRepositoryInput,
  options: ApiRequestOptions = {},
): Promise<ProjectRepository> {
  return apiClient.patch<ProjectRepository>(
    `/projects/repositories/${encodeId(id)}`,
    input,
    options,
  );
}

export function deleteProjectRepository(
  id: string,
  options: ApiRequestOptions = {},
): Promise<void> {
  return apiClient.delete(`/projects/repositories/${encodeId(id)}`, options);
}

export type ProjectImportResource =
  "projects" | "sprints" | "tasks" | "milestones";

export interface ProjectImportReference {
  kind: "id" | "import_key";
  value: string;
}

export interface ProjectImportProject extends CreateProjectInput {
  import_key?: string;
}

export interface ProjectImportSprint extends Omit<
  CreateSprintInput,
  "project_id"
> {
  import_key?: string;
  project_ref: ProjectImportReference;
}

export interface ProjectImportTask extends Omit<
  CreateTaskInput,
  "project_id" | "sprint_id"
> {
  project_ref: ProjectImportReference;
  sprint_ref: ProjectImportReference | null;
}

export interface ProjectImportMilestone extends Omit<
  CreateMilestoneInput,
  "project_id"
> {
  project_ref: ProjectImportReference;
}

export interface ProjectImportRequest {
  duplicate_policy: "reject";
  resources: {
    projects: ProjectImportProject[];
    sprints: ProjectImportSprint[];
    tasks: ProjectImportTask[];
    milestones: ProjectImportMilestone[];
  };
}

export interface ProjectImportWarning {
  resource: ProjectImportResource;
  row: number;
  field: string | null;
  code: string;
  message: string;
}

export interface ProjectImportResult {
  status: "completed";
  created: Record<ProjectImportResource, number>;
  skipped: number;
  failed: number;
  warnings: ProjectImportWarning[];
}

export function importProjects(
  input: ProjectImportRequest,
  options: ApiRequestOptions = {},
): Promise<ProjectImportResult> {
  return apiClient.post<ProjectImportResult>(
    "/projects/import",
    input,
    options,
  );
}
