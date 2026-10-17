import type { Sprint, Task } from "@/lib/api/types.ts";

export function summarizeActiveSprints(sprints: Sprint[], tasks: Task[]) {
  const activeSprints = sprints.filter((sprint) => sprint.status === "active");
  const activeIds = new Set(activeSprints.map((sprint) => sprint.id));
  const sprintTasks = tasks.filter(
    (task) => task.sprint_id !== null && activeIds.has(task.sprint_id),
  );
  return {
    activeSprints,
    sprintTasks,
    doneTasks: sprintTasks.filter((task) => task.status === "done").length,
  };
}
