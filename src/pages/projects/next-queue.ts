import type { FocusSessionContext } from "@/lib/api/project-focus.ts";
import type { Priority, Sprint, Task } from "@/lib/api/types.ts";

const PRIORITY_ORDER: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const orderTasks = (a: Task, b: Task) =>
  PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
  a.title.localeCompare(b.title) ||
  a.id.localeCompare(b.id);

export interface NextQueueGroup {
  id: "in_progress" | "priority" | "active_sprint" | "review" | "upcoming";
  title: string;
  description: string;
  tasks: Task[];
  total: number;
}

/** Exclusive, bounded queue groups: a Task appears only in its first relevant group. */
export function buildNextQueue(
  tasks: readonly Task[],
  sprints: readonly Sprint[],
  pausedSessions: readonly FocusSessionContext[],
): NextQueueGroup[] {
  const used = new Set<string>();
  const activeSprintIds = new Set(
    sprints
      .filter((sprint) => sprint.status === "active")
      .map((sprint) => sprint.id),
  );
  const pick = (predicate: (task: Task) => boolean, limit = 5) => {
    const matches = tasks.filter(
      (task) => !used.has(task.id) && predicate(task),
    );
    matches.forEach((task) => used.add(task.id));
    return {
      tasks: [...matches].sort(orderTasks).slice(0, limit),
      total: matches.length,
    };
  };
  const pausedIds = new Set(pausedSessions.map((item) => item.task.id));
  pausedIds.forEach((id) => used.add(id));
  const inProgress = pick((task) => task.status === "in_progress");
  const priority = pick(
    (task) =>
      ["backlog", "todo"].includes(task.status) &&
      ["critical", "high"].includes(task.priority),
  );
  const activeSprint = pick(
    (task) =>
      ["backlog", "todo"].includes(task.status) &&
      task.sprint_id !== null &&
      activeSprintIds.has(task.sprint_id),
  );
  const review = pick((task) => task.status === "review");
  const upcoming = pick((task) => ["backlog", "todo"].includes(task.status), 3);

  const groups: NextQueueGroup[] = [
    {
      id: "in_progress",
      title: "In progress",
      description: "Existing work already marked in progress.",
      ...inProgress,
    },
    {
      id: "priority",
      title: "Highest priority",
      description: "Eligible critical and high-priority Tasks.",
      ...priority,
    },
    {
      id: "active_sprint",
      title: "Active Sprints",
      description: "Eligible remaining Tasks assigned to active Sprints.",
      ...activeSprint,
    },
    {
      id: "review",
      title: "Awaiting review",
      description: "Tasks waiting for a review decision, not a Focus start.",
      ...review,
    },
    {
      id: "upcoming",
      title: "Upcoming work",
      description:
        "A small sample of other eligible work; the full backlog stays on the Board.",
      ...upcoming,
    },
  ];
  return groups.filter((group) => group.total > 0);
}
