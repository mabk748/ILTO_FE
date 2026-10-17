import { describe, expect, it } from "vitest";
import { milestone, sprint, task } from "./__tests__/fixtures.ts";
import { projectDashboardMetrics } from "./project-dashboard.ts";

describe("Project dashboard metric definitions", () => {
  it("aggregates every active Sprint and uses explicit Task/point/Milestone denominators", () => {
    const secondSprint = { ...sprint, id: "s2", name: "Sprint Two" };
    const metrics = projectDashboardMetrics(
      [
        { ...task, id: "done-one", status: "done", story_points: 3 },
        { ...task, id: "open-one", status: "in_progress", story_points: 2 },
        {
          ...task,
          id: "done-two",
          sprint_id: "s2",
          status: "done",
          story_points: 5,
        },
        {
          ...task,
          id: "backlog",
          sprint_id: null,
          status: "backlog",
          story_points: 8,
        },
      ],
      [sprint, secondSprint, { ...sprint, id: "old", status: "completed" }],
      [
        { ...milestone, id: "complete", completed_at: "2026-10-01T10:00:00Z" },
        { ...milestone, id: "soon", title: "Soon", due_date: "2026-10-20" },
        { ...milestone, id: "past", due_date: "2026-10-10" },
      ],
      new Date(2026, 9, 16, 12),
    );

    expect(metrics.tasksByStatus).toEqual({
      backlog: 1,
      todo: 0,
      in_progress: 1,
      review: 0,
      done: 2,
    });
    expect(metrics.taskCompletionPercent).toBe(50);
    expect(metrics.activeSprints.map((item) => item.id)).toEqual(["s1", "s2"]);
    expect(metrics.completedActiveSprintPoints).toBe(8);
    expect(metrics.activeSprintPoints).toBe(10);
    expect(metrics.activeSprintProgressPercent).toBe(80);
    expect(metrics.completedMilestones).toBe(1);
    expect(metrics.milestoneCompletionPercent).toBe(33);
    expect(metrics.upcomingMilestones.map((item) => item.id)).toEqual(["soon"]);
  });

  it("does not calculate percentages with zero Tasks, points or Milestones", () => {
    const metrics = projectDashboardMetrics(
      [],
      [{ ...sprint }],
      [],
      new Date(2026, 9, 16),
    );
    expect(metrics.taskCompletionPercent).toBeNull();
    expect(metrics.activeSprintProgressPercent).toBeNull();
    expect(metrics.milestoneCompletionPercent).toBeNull();
    expect(metrics.activeSprintPoints).toBe(0);
  });
});
