import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createAssessmentAttempt,
  createBottleneck,
  createLearningGoal,
  createLearningMilestone,
  createReadingEntry,
  createRoadmap,
  createSkill,
  createStudySchedule,
  createStudySession,
  createWeeklyReview,
  deleteLearningGoal,
  deleteReadingEntry,
  deleteRoadmap,
  deleteSkill,
  deleteStudySchedule,
  completeStudySession,
  getDueCards,
  getLearningDashboard,
  getLearningGoalProgress,
  getSkills,
  getStudySchedules,
  getStudySessions,
  planStudySchedule,
  reviewCard,
  resolveBottleneck,
  updateLearningGoal,
  updateReadingEntry,
  updateRoadmap,
  updateSkill,
  updateStudySchedule,
  updateStudySession,
} from "./learning.ts";

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test/api/v1");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("learning backend adapter", () => {
  it("preserves the server's skill ordering", async () => {
    const skills = [
      { id: "skill-2", roadmap_id: "roadmap-1", name: "Zulu" },
      { id: "skill-1", roadmap_id: "roadmap-1", name: "alpha" },
    ];
    const fetchMock = vi.fn().mockResolvedValue(Response.json(skills));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getSkills()).resolves.toEqual(skills);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.example.test/api/v1/learning/skills",
    );
  });

  it("requests server-side due filtering", async () => {
    const cards = [{ id: "due", next_review: "2020-01-01T00:00:00Z" }];
    const fetchMock = vi.fn().mockResolvedValue(Response.json(cards));
    vi.stubGlobal("fetch", fetchMock);
    await expect(getDueCards()).resolves.toEqual(cards);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.example.test/api/v1/learning/sr-cards?due=true",
    );
  });
  it("posts reviews and returns the server's updated schedule", async () => {
    const card = {
      id: "card1",
      times_reviewed: 2,
      next_review: "2026-09-15T00:00:00Z",
    };
    const fetchMock = vi.fn().mockResolvedValue(Response.json(card));
    vi.stubGlobal("fetch", fetchMock);
    const review = { reviewed_at: "2026-09-09T00:00:00Z" };
    await expect(reviewCard("card1", review)).resolves.toEqual(card);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/api/v1/learning/sr-cards/card1/reviews",
      expect.objectContaining({ method: "POST", body: JSON.stringify(review) }),
    );
  });

  it("uses the roadmap CRUD paths with only caller-supplied writable payloads", async () => {
    const roadmap = { id: "roadmap-1", name: "Roadmap" };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json(roadmap))
      .mockResolvedValueOnce(Response.json(roadmap))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    await createRoadmap({
      name: "Roadmap",
      goal: "Learn",
      status: "active",
    });
    await updateRoadmap("road/map", { status: "paused" });
    await deleteRoadmap("road/map");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://api.example.test/api/v1/learning/roadmaps",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Roadmap",
          goal: "Learn",
          status: "active",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.example.test/api/v1/learning/roadmaps/road%2Fmap",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ status: "paused" }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "https://api.example.test/api/v1/learning/roadmaps/road%2Fmap",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("uses reading CRUD paths and preserves null and zero payload values", async () => {
    const entry = { id: "reading-1", pages_read: 0, completed_at: null };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json(entry))
      .mockResolvedValueOnce(Response.json(entry))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    await createReadingEntry({
      title: "Reading",
      author: "Author",
      pages_total: 100,
      pages_read: 0,
      words_per_minute: 250,
      started_at: "2026-09-17T10:00:00.000Z",
      completed_at: null,
      tags: [],
    });
    await updateReadingEntry("read/one", { completed_at: null });
    await deleteReadingEntry("read/one");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://api.example.test/api/v1/learning/reading",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"pages_read":0'),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.example.test/api/v1/learning/reading/read%2Fone",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ completed_at: null }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "https://api.example.test/api/v1/learning/reading/read%2Fone",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("uses exact skill CRUD paths and strips server-owned or unknown fields", async () => {
    const saved = {
      id: "skill-1",
      roadmap_id: "roadmap-1",
      name: "TypeScript",
      category: "Engineering",
      current_level: "beginner",
      target_level: "advanced",
      gap_score: 0,
      resources: ["https://example.test/course"],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json(saved, { status: 201 }))
      .mockResolvedValueOnce(Response.json(saved))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await createSkill({
      ...saved,
      created_at: "2026-09-20T00:00:00.000Z",
      user_id: "server-user",
      skills_total: 99,
      skills_completed: 98,
      unknown: "drop-me",
    } as unknown as Parameters<typeof createSkill>[0]);
    await updateSkill("skill/one", {
      roadmap_id: "roadmap-2",
      gap_score: 0,
      resources: [],
      id: "server-id",
      user_id: "server-user",
    } as unknown as Parameters<typeof updateSkill>[1]);
    await deleteSkill("skill/one");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://api.example.test/api/v1/learning/skills",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          roadmap_id: "roadmap-1",
          name: "TypeScript",
          category: "Engineering",
          current_level: "beginner",
          target_level: "advanced",
          gap_score: 0,
          resources: ["https://example.test/course"],
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.example.test/api/v1/learning/skills/skill%2Fone",
      expect.objectContaining({
        method: "PATCH",
        credentials: "include",
        body: JSON.stringify({
          roadmap_id: "roadmap-2",
          gap_score: 0,
          resources: [],
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "https://api.example.test/api/v1/learning/skills/skill%2Fone",
      expect.objectContaining({ method: "DELETE", credentials: "include" }),
    );
  });

  it("reads the aggregate dashboard, goal progress, schedules, and filtered sessions", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ active_goals: [] }))
      .mockResolvedValueOnce(Response.json({ goal: { id: "goal-1" } }))
      .mockResolvedValueOnce(Response.json([]))
      .mockResolvedValueOnce(Response.json([]));
    vi.stubGlobal("fetch", fetchMock);

    await getLearningDashboard();
    await getLearningGoalProgress("goal/1");
    await getStudySchedules("goal-1");
    await getStudySessions({ learningGoalId: "goal-1" });

    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      "https://api.example.test/api/v1/learning/dashboard",
      "https://api.example.test/api/v1/learning/goals/goal%2F1/progress",
      "https://api.example.test/api/v1/learning/study-schedules?learning_goal_id=goal-1",
      "https://api.example.test/api/v1/learning/study-sessions?learning_goal_id=goal-1",
    ]);
  });

  it("uses exact learning-goal payloads and strips server-owned fields", async () => {
    const saved = { id: "goal-1", title: "AWS SAA" };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json(saved, { status: 201 }))
      .mockResolvedValueOnce(Response.json(saved))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await createLearningGoal({
      title: "AWS SAA",
      provider: "AWS",
      type: "certification",
      status: "active",
      start_date: "2026-09-01",
      target_date: "2026-12-31",
      exam_date: null,
      phase: "Phase 1",
      description: "Prepare",
      priority: "high",
      linked_project_id: null,
      id: "server-owned",
      created_at: "server-owned",
      updated_at: "server-owned",
      user_id: "server-owned",
    } as unknown as Parameters<typeof createLearningGoal>[0]);
    await updateLearningGoal("goal/1", {
      status: "paused",
      exam_date: null,
      id: "drop-me",
    } as unknown as Parameters<typeof updateLearningGoal>[1]);
    await deleteLearningGoal("goal/1");

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      title: "AWS SAA",
      provider: "AWS",
      type: "certification",
      status: "active",
      start_date: "2026-09-01",
      target_date: "2026-12-31",
      exam_date: null,
      phase: "Phase 1",
      description: "Prepare",
      priority: "high",
      linked_project_id: null,
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.example.test/api/v1/learning/goals/goal%2F1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ status: "paused", exam_date: null }),
      }),
    );
  });

  it("preserves false, zero, and null values in study-session writes", async () => {
    const session = { id: "session-1", completed: false, actual_minutes: 0 };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json(session, { status: 201 }))
      .mockResolvedValueOnce(Response.json(session));
    vi.stubGlobal("fetch", fetchMock);

    await createStudySession({
      learning_goal_id: "goal-1",
      date: "2026-09-25",
      session_type: "study",
      planned_minutes: 90,
      actual_minutes: 0,
      topic: "VPC routing",
      notes: "",
      completed: false,
      linked_project_id: null,
      bottleneck_id: null,
      study_schedule_id: null,
      id: "drop-me",
    } as unknown as Parameters<typeof createStudySession>[0]);
    await updateStudySession("session/1", {});

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      learning_goal_id: "goal-1",
      date: "2026-09-25",
      session_type: "study",
      planned_minutes: 90,
      actual_minutes: 0,
      topic: "VPC routing",
      notes: "",
      completed: false,
      linked_project_id: null,
      bottleneck_id: null,
      study_schedule_id: null,
    });
    expect(fetchMock.mock.calls[1][1].body).toBe("{}");
  });

  it("uses exact weekly-schedule, planning, and completion bodies", async () => {
    const schedule = { id: "schedule-1", active: false, end_date: null };
    const session = { id: "session-1", completed: true, actual_minutes: 0 };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json(schedule, { status: 201 }))
      .mockResolvedValueOnce(Response.json(schedule))
      .mockResolvedValueOnce(Response.json([session], { status: 201 }))
      .mockResolvedValueOnce(Response.json(session))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await createStudySchedule({
      learning_goal_id: "goal-1",
      weekday: 4,
      session_type: "study",
      planned_minutes: 120,
      topic: "Deep study",
      notes: "",
      start_date: "2026-10-01",
      end_date: null,
      active: false,
      linked_project_id: null,
      id: "drop-me",
    } as unknown as Parameters<typeof createStudySchedule>[0]);
    await updateStudySchedule("schedule/1", {
      active: false,
      end_date: null,
      learning_goal_id: "drop-me",
    } as unknown as Parameters<typeof updateStudySchedule>[1]);
    await planStudySchedule("schedule/1", {
      start_date: "2026-09-21",
      end_date: "2026-09-27",
    });
    await completeStudySession("session/1", {
      actual_minutes: 0,
      notes: "",
    });
    await deleteStudySchedule("schedule/1");

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      learning_goal_id: "goal-1",
      weekday: 4,
      session_type: "study",
      planned_minutes: 120,
      topic: "Deep study",
      notes: "",
      start_date: "2026-10-01",
      end_date: null,
      active: false,
      linked_project_id: null,
    });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      active: false,
      end_date: null,
    });
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({
      start_date: "2026-09-21",
      end_date: "2026-09-27",
    });
    expect(JSON.parse(fetchMock.mock.calls[3][1].body)).toEqual({
      actual_minutes: 0,
      notes: "",
    });
    expect(fetchMock.mock.calls[4][1].method).toBe("DELETE");
  });

  it("sends exact assessment, bottleneck, milestone, and weekly-review bodies", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ id: "assessment-1" }, { status: 201 }),
      )
      .mockResolvedValueOnce(
        Response.json({ id: "bottleneck-1" }, { status: 201 }),
      )
      .mockResolvedValueOnce(
        Response.json({ id: "bottleneck-1", status: "resolved" }),
      )
      .mockResolvedValueOnce(
        Response.json({ id: "milestone-1" }, { status: 201 }),
      )
      .mockResolvedValueOnce(
        Response.json({ id: "review-1" }, { status: 201 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await createAssessmentAttempt({
      learning_goal_id: "goal-1",
      date: "2026-09-27",
      assessment_type: "mock_exam",
      score_percent: 0,
      source: null,
      notes: "Baseline",
      duration_minutes: null,
    });
    await createBottleneck({
      learning_goal_id: "goal-1",
      assessment_attempt_id: "assessment-1",
      topic: "VPC routing",
      description: "Route-table selection",
      priority: "high",
      status: "open",
    });
    await resolveBottleneck("bottleneck-1");
    await createLearningMilestone({
      learning_goal_id: "goal-1",
      title: "Score 80%",
      target_date: "2026-12-01",
      status: "planned",
    });
    await createWeeklyReview({
      week_start: "2026-09-21",
      learning_goal_id: null,
      learned: "Routing",
      can_do_now: "Explain route priority",
      main_bottleneck: "IAM",
      applied_to_project: "VPC design",
      next_week_focus: "IAM policies",
      notes: "",
    });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      learning_goal_id: "goal-1",
      date: "2026-09-27",
      assessment_type: "mock_exam",
      score_percent: 0,
      source: null,
      notes: "Baseline",
      duration_minutes: null,
    });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({
      assessment_attempt_id: "assessment-1",
      status: "open",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "https://api.example.test/api/v1/learning/bottlenecks/bottleneck-1/resolve",
      expect.objectContaining({ method: "POST", body: undefined }),
    );
    expect(fetchMock.mock.calls[3][0]).toBe(
      "https://api.example.test/api/v1/learning/milestones",
    );
    expect(fetchMock.mock.calls[4][0]).toBe(
      "https://api.example.test/api/v1/learning/weekly-reviews",
    );
  });
});
