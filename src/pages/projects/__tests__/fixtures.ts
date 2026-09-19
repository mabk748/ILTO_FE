// Mocked test fixtures only. Never imported by application code or seeded remotely.
import type { Project, Sprint, Task, Milestone } from "@/lib/api/types.ts";
export const project: Project = {
  id: "p1",
  name: "Project Alpha",
  description: "Description",
  status: "active",
  priority: "medium",
  start_date: "2026-09-01",
  end_date: "2026-09-30",
  created_at: "2026-09-01T10:00:00Z",
  updated_at: "2026-09-01T10:00:00Z",
};
export const sprint: Sprint = {
  id: "s1",
  project_id: "p1",
  name: "Sprint Alpha",
  goal: "Goal",
  status: "active",
  start_date: "2026-09-01",
  end_date: "2026-09-14",
  velocity: 0,
  created_at: "2026-09-01T10:00:00Z",
};
export const task: Task = {
  id: "t1",
  project_id: "p1",
  sprint_id: "s1",
  title: "Task Alpha",
  description: "Description",
  status: "todo",
  priority: "medium",
  assignee: "Owner",
  story_points: 3.5,
  created_at: "2026-09-01T10:00:00Z",
  updated_at: "2026-09-01T10:00:00Z",
};
export const milestone: Milestone = {
  id: "m1",
  project_id: "p1",
  title: "Milestone Alpha",
  description: "Description",
  due_date: "2026-09-20",
  completed_at: null,
  created_at: "2026-09-01T10:00:00Z",
};
