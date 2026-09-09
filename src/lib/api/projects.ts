import type {
  Project,
  Sprint,
  Task,
  Milestone,
  PaginatedResponse,
} from "./types.ts";

const API_BASE =
  import.meta.env.VITE_API_BASE ??
  "https://n8n-pr.mhabproperties.org/webhook/api/v1/projects";

async function getJson<T>(resource: string): Promise<T> {
  const res = await fetch(`${API_BASE}?resource=${resource}`);
  if (!res.ok)
    throw new Error(`GET /projects?resource=${resource} failed: ${res.status}`);
  return res.json();
}

// GET /api/v1/projects?page=1&per_page=20
export async function getProjects(): Promise<PaginatedResponse<Project>> {
  const project = await getJson<Project[]>("project");
  return {
    data: project,
    total: project.length,
    page: 1,
    per_page: 20,
    total_pages: 1,
  };
}

// GET /api/v1/projects/:id
export async function getProject(id: string): Promise<Project | null> {
  const project = await getJson<Project[]>("project");
  return project.find((p) => p.id === id) ?? null;
}

// GET /api/v1/sprints?project_id=:id
export async function getSprints(projectId?: string): Promise<Sprint[]> {
  const sprint = await getJson<Sprint[]>("sprint");
  return projectId ? sprint.filter((s) => s.project_id === projectId) : sprint;
}

// GET /api/v1/tasks?sprint_id=:id&project_id=:id&status=:status
export async function getTasks(filters?: {
  sprintId?: string;
  projectId?: string;
  status?: string;
}): Promise<Task[]> {
  const task = await getJson<Task[]>("task");
  let tasks = [...task];
  if (filters?.sprintId)
    tasks = tasks.filter((t) => t.sprint_id === filters.sprintId);
  if (filters?.projectId)
    tasks = tasks.filter((t) => t.project_id === filters.projectId);
  if (filters?.status) tasks = tasks.filter((t) => t.status === filters.status);
  return tasks;
}

// GET /api/v1/milestones?project_id=:id
export async function getMilestones(projectId?: string): Promise<Milestone[]> {
  const milestone = await getJson<Milestone[]>("milestone");
  return projectId
    ? milestone.filter((m) => m.project_id === projectId)
    : milestone;
}

// TO BE CLEANED: START
/*
// GET /api/v1/appearance/wardrobe
export async function getWardrobeItems(): Promise<WardrobeItem[]> {
  return getJson<WardrobeItem[]>("wardrobe-item");
}

// GET /api/v1/appearance/outfits?limit=20
export async function getOutfitLogs(limit = 20): Promise<OutfitLog[]> {
  const outfit = await getJson<OutfitLog[]>("outfit-log");
  return outfit.slice(0, limit);
}

// GET /api/v1/appearance/grooming
export async function getGroomingRoutines(): Promise<GroomingRoutine[]> {
  return getJson<GroomingRoutine[]>("grooming-routine");
}

// GET /api/v1/appearance/spend
export async function getAppearanceSpend(): Promise<AppearanceSpend[]> {
  return getJson<AppearanceSpend[]>("appearance-spend");
}
*/
// TO BE CLEANED: END

// TO BE CLEANED: START
/**
 * Projects Domain API
 *
 * INTEGRATION GUIDE:
 * Base URL: http://your-server:8000/api/v1/projects
 *
 * To connect to FastAPI backend:
 * 1. Set VITE_API_BASE_URL in .env.local
 * 2. Replace mock return statements with: return fetch(`${BASE_URL}/...`).then(r => r.json())
 * 3. Add auth header: headers: { Authorization: `Bearer ${token}` }


import type { Project, Sprint, Task, Milestone, PaginatedResponse } from "./types.ts";
import { mockProjects, mockSprints, mockTasks, mockMilestones } from "./mock/projects.mock.ts";

const SIMULATED_DELAY = 200;
const delay = (): Promise<void> => new Promise(r => setTimeout(r, SIMULATED_DELAY));

// GET /api/v1/projects?page=1&per_page=20
export async function getProjects(): Promise<PaginatedResponse<Project>> {
  await delay();
  return { data: mockProjects, total: mockProjects.length, page: 1, per_page: 20, total_pages: 1 };
}

// GET /api/v1/projects/:id
export async function getProject(id: string): Promise<Project | null> {
  await delay();
  return mockProjects.find(p => p.id === id) ?? null;
}

// GET /api/v1/sprints?project_id=:id
export async function getSprints(projectId?: string): Promise<Sprint[]> {
  await delay();
  return projectId ? mockSprints.filter(s => s.project_id === projectId) : mockSprints;
}

// GET /api/v1/tasks?sprint_id=:id&project_id=:id&status=:status
export async function getTasks(filters?: { sprintId?: string; projectId?: string; status?: string }): Promise<Task[]> {
  await delay();
  let tasks = [...mockTasks];
  if (filters?.sprintId) tasks = tasks.filter(t => t.sprint_id === filters.sprintId);
  if (filters?.projectId) tasks = tasks.filter(t => t.project_id === filters.projectId);
  if (filters?.status) tasks = tasks.filter(t => t.status === filters.status);
  return tasks;
}

// GET /api/v1/milestones?project_id=:id
export async function getMilestones(projectId?: string): Promise<Milestone[]> {
  await delay();
  return projectId ? mockMilestones.filter(m => m.project_id === projectId) : mockMilestones;
}
*/
// TO BE CLEANED: END
