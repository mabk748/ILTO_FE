import { describe, expect, it } from "vitest";
import {
  assessmentInput,
  bottleneckInput,
  currentWeekDays,
  goalInput,
  reviewInput,
  scheduleInput,
  sessionInput,
  sortBottlenecks,
} from "./learning-plan.ts";

describe("certification learning input", () => {
  it("preserves nullable relationships, false completion, and zero actual minutes", () => {
    expect(
      sessionInput({
        learning_goal_id: "goal-1",
        date: "2026-09-25",
        session_type: "practical_project",
        planned_minutes: "90",
        actual_minutes: "0",
        topic: "VPC routing",
        notes: "",
        completed: false,
        linked_project_id: "",
        bottleneck_id: "",
        study_schedule_id: "",
      }),
    ).toEqual({
      learning_goal_id: "goal-1",
      date: "2026-09-25",
      session_type: "practical_project",
      planned_minutes: 90,
      actual_minutes: 0,
      topic: "VPC routing",
      notes: "",
      completed: false,
      linked_project_id: null,
      bottleneck_id: null,
      study_schedule_id: null,
    });
  });

  it("preserves assessment calendar dates and two-decimal scores", () => {
    expect(
      assessmentInput({
        learning_goal_id: "goal-1",
        date: "2026-01-15",
        assessment_type: "mock_exam",
        score_percent: "63.25",
        source: "Practice set",
        notes: "",
        duration_minutes: "120",
      }),
    ).toMatchObject({ date: "2026-01-15", score_percent: 63.25 });
  });

  it("rejects invalid score bounds and reversed goal dates", () => {
    expect(() =>
      assessmentInput({
        learning_goal_id: "goal-1",
        date: "2026-09-25",
        assessment_type: "mock_exam",
        score_percent: "101",
        source: "",
        notes: "",
        duration_minutes: "",
      }),
    ).toThrow("Score must be from 0 through 100");

    expect(() =>
      goalInput({
        title: "AWS SAA",
        provider: "AWS",
        type: "certification",
        status: "active",
        start_date: "2026-12-31",
        target_date: "2026-09-01",
        exam_date: "",
        phase: "",
        description: "Preparation",
        priority: "high",
        linked_project_id: "",
      }),
    ).toThrow("Target date must not be before the start date");
  });

  it("builds the exact five-prompt weekly review payload", () => {
    expect(
      reviewInput({
        week_start: "2026-09-21",
        learning_goal_id: "",
        learned: "Routing",
        can_do_now: "Trace routes",
        main_bottleneck: "IAM",
        applied_to_project: "ILTO VPC",
        next_week_focus: "Policies",
      }),
    ).toEqual({
      week_start: "2026-09-21",
      learning_goal_id: null,
      learned: "Routing",
      can_do_now: "Trace routes",
      main_bottleneck: "IAM",
      applied_to_project: "ILTO VPC",
      next_week_focus: "Policies",
      notes: "",
    });
  });

  it("keeps assessment linkage in bottlenecks", () => {
    expect(
      bottleneckInput({
        learning_goal_id: "goal-1",
        assessment_attempt_id: "attempt-1",
        topic: "Remote state",
        description: "Locking",
        priority: "medium",
        status: "open",
      }),
    ).toMatchObject({ assessment_attempt_id: "attempt-1", status: "open" });
  });

  it("preserves false and nullable values in a weekly schedule", () => {
    expect(
      scheduleInput({
        learning_goal_id: "goal-1",
        weekday: "4",
        session_type: "study",
        planned_minutes: "0",
        topic: "Deep study",
        notes: "",
        start_date: "2026-09-01",
        end_date: "",
        active: false,
        linked_project_id: "",
      }),
    ).toEqual({
      learning_goal_id: "goal-1",
      weekday: 4,
      session_type: "study",
      planned_minutes: 0,
      topic: "Deep study",
      notes: "",
      start_date: "2026-09-01",
      end_date: null,
      active: false,
      linked_project_id: null,
    });
  });
});

describe("learning execution ordering", () => {
  it("creates a Monday through Sunday current-week view", () => {
    const days = currentWeekDays(new Date("2026-09-23T12:00:00Z"), "UTC");
    expect(days.map((day) => day.date)).toEqual([
      "2026-09-21",
      "2026-09-22",
      "2026-09-23",
      "2026-09-24",
      "2026-09-25",
      "2026-09-26",
      "2026-09-27",
    ]);
  });

  it("ranks unresolved bottlenecks by priority then recency", () => {
    const common = {
      learning_goal_id: "goal-1",
      assessment_attempt_id: null,
      description: "",
      status: "open" as const,
      resolved_at: null,
    };
    expect(
      sortBottlenecks([
        {
          ...common,
          id: "older-high",
          topic: "A",
          priority: "high",
          created_at: "2026-09-01T00:00:00Z",
        },
        {
          ...common,
          id: "medium",
          topic: "B",
          priority: "medium",
          created_at: "2026-09-27T00:00:00Z",
        },
        {
          ...common,
          id: "newer-high",
          topic: "C",
          priority: "high",
          created_at: "2026-09-20T00:00:00Z",
        },
      ]).map((item) => item.id),
    ).toEqual(["newer-high", "older-high", "medium"]);
  });
});
