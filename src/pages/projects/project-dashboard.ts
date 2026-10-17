import { isCalendarDateOverdue } from "@/lib/calendar-date.ts";
import type { Milestone, Sprint, Task, TaskStatus } from "@/lib/api/types.ts";

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In progress",
  review: "Review",
  done: "Done",
};

export function projectDashboardMetrics(
  tasks: readonly Task[],
  sprints: readonly Sprint[],
  milestones: readonly Milestone[],
  now = new Date(),
) {
  const tasksByStatus = Object.fromEntries(
    (Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map((status) => [
      status,
      tasks.filter((task) => task.status === status).length,
    ]),
  ) as Record<TaskStatus, number>;
  const activeSprints = sprints.filter((sprint) => sprint.status === "active");
  const activeSprintIds = new Set(activeSprints.map((sprint) => sprint.id));
  const activeSprintTasks = tasks.filter(
    (task) => task.sprint_id !== null && activeSprintIds.has(task.sprint_id),
  );
  const activeSprintPoints = activeSprintTasks.reduce(
    (sum, task) => sum + task.story_points,
    0,
  );
  const completedActiveSprintPoints = activeSprintTasks
    .filter((task) => task.status === "done")
    .reduce((sum, task) => sum + task.story_points, 0);
  const completedMilestones = milestones.filter(
    (milestone) => milestone.completed_at !== null,
  ).length;
  const upcomingMilestones = milestones
    .filter(
      (milestone) =>
        milestone.completed_at === null &&
        !isCalendarDateOverdue(milestone.due_date, now),
    )
    .sort(
      (a, b) =>
        a.due_date.localeCompare(b.due_date) ||
        a.title.localeCompare(b.title) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, 3);

  return {
    totalTasks: tasks.length,
    tasksByStatus,
    completedTasks: tasksByStatus.done,
    inProgressTasks: tasksByStatus.in_progress,
    taskCompletionPercent:
      tasks.length > 0
        ? Math.round((tasksByStatus.done / tasks.length) * 100)
        : null,
    activeSprints,
    activeSprintPoints,
    completedActiveSprintPoints,
    activeSprintProgressPercent:
      activeSprintPoints > 0
        ? Math.round((completedActiveSprintPoints / activeSprintPoints) * 100)
        : null,
    totalMilestones: milestones.length,
    completedMilestones,
    milestoneCompletionPercent:
      milestones.length > 0
        ? Math.round((completedMilestones / milestones.length) * 100)
        : null,
    upcomingMilestones,
  };
}
