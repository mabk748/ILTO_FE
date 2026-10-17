import type { Task, TaskCategory } from "@/lib/api/types.ts";

export const TASK_CATEGORIES = [
  "design",
  "frontend",
  "backend",
  "test",
  "infrastructure",
  "security",
  "backup",
  "documentation",
  "release",
  "research",
  "other",
] as const satisfies readonly TaskCategory[];

export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  design: "Design",
  frontend: "Frontend",
  backend: "Backend",
  test: "Test",
  infrastructure: "Infrastructure",
  security: "Security",
  backup: "Backup",
  documentation: "Documentation",
  release: "Release",
  research: "Research",
  other: "Other",
};

/** Older API responses remain readable during the coordinated rollout. */
export function taskCategory(task: Task): TaskCategory {
  return task.category ?? "other";
}
