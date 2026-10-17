import { describe, expect, it } from "vitest";
import { project, sprint, task } from "./__tests__/fixtures.ts";
import { session, stamp } from "./__tests__/focus-server.ts";
import { buildNextQueue } from "./next-queue.ts";

describe("bounded NEXT queue", () => {
  it("orders mutually exclusive execution groups and leaves the full backlog off-screen", () => {
    const tasks = [
      { ...task, id: "paused", title: "Paused", priority: "critical" as const },
      { ...task, id: "doing", title: "Doing", status: "in_progress" as const },
      {
        ...task,
        id: "critical",
        title: "Critical",
        sprint_id: null,
        priority: "critical" as const,
      },
      {
        ...task,
        id: "sprint",
        title: "Sprint task",
        priority: "medium" as const,
      },
      { ...task, id: "review", title: "Review", status: "review" as const },
      ...Array.from({ length: 8 }, (_, index) => ({
        ...task,
        id: `backlog-${index}`,
        title: `Backlog ${index}`,
        sprint_id: null,
        status: "backlog" as const,
        priority: "low" as const,
      })),
    ];
    const pausedSession = session({
      status: "paused",
      paused_at: stamp,
      task_id: "paused",
    });
    const groups = buildNextQueue(
      tasks,
      [sprint],
      [{ session: pausedSession, task: tasks[0], project }],
    );

    expect(groups.map((group) => group.id)).toEqual([
      "in_progress",
      "priority",
      "active_sprint",
      "review",
      "upcoming",
    ]);
    expect(groups.find((group) => group.id === "upcoming")).toMatchObject({
      total: 8,
    });
    expect(groups.find((group) => group.id === "upcoming")?.tasks).toHaveLength(
      3,
    );
    const shown = groups.flatMap((group) => group.tasks.map((item) => item.id));
    expect(new Set(shown).size).toBe(shown.length);
    expect(shown).not.toContain("paused");
  });

  it("returns no groups for an empty or completed-only Project", () => {
    expect(buildNextQueue([], [], [])).toEqual([]);
    expect(buildNextQueue([{ ...task, status: "done" }], [sprint], [])).toEqual(
      [],
    );
  });
});
