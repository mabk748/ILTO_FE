import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  LearningDashboard,
  LearningGoal,
  LearningBottleneck,
  StudySchedule,
} from "@/lib/api/types.ts";
import LearningDashboardView from "./LearningDashboardView.tsx";
import WeeklyPlanView from "./WeeklyPlanView.tsx";
import BottleneckView from "./BottleneckView.tsx";
import { AssessmentEntry } from "./LearningPlanControls.tsx";
import { currentWeekDays } from "../learning-plan.ts";

const goal: LearningGoal = {
  id: "goal-1",
  title: "AWS SAA",
  provider: "AWS",
  type: "certification",
  status: "active",
  start_date: "2026-09-01",
  target_date: "2026-12-31",
  exam_date: null,
  phase: "Phase 1",
  description: "Architecture preparation",
  priority: "high",
  linked_project_id: null,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};

const emptyDashboard: LearningDashboard = {
  active_goals: [],
  today_sessions: [],
  week_sessions: [],
  minutes_planned: 0,
  minutes_completed: 0,
  latest_assessment: null,
  assessment_score_history: [],
  open_bottlenecks: [],
  upcoming_dates: [],
  latest_weekly_review: null,
  linked_project_activity: [],
  next_focus: null,
};

const fetchMock = vi.fn<typeof fetch>();

const fridaySchedule: StudySchedule = {
  id: "schedule-1",
  learning_goal_id: goal.id,
  weekday: 4,
  session_type: "study",
  planned_minutes: 120,
  topic: "Deep certification study",
  notes: "",
  start_date: "2026-09-01",
  end_date: null,
  active: true,
  linked_project_id: null,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test/api/v1");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function setup(children: React.ReactNode, client = new QueryClient()) {
  render(
    <MemoryRouter>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </MemoryRouter>,
  );
  return client;
}

describe("Learning execution views", () => {
  it("shows honest dashboard empty states without NaN percentages", () => {
    setup(
      <LearningDashboardView
        dashboard={emptyDashboard}
        goals={[]}
        projects={[]}
      />,
    );
    expect(
      screen.getByText("No study sessions are planned for today."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No active learning goals yet."),
    ).toBeInTheDocument();
    expect(screen.getByText("No plan")).toBeInTheDocument();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });

  it("completes today's session through the dedicated server action", async () => {
    const session = {
      id: "session-1",
      learning_goal_id: goal.id,
      date: "2026-09-27",
      session_type: "study" as const,
      planned_minutes: 90,
      actual_minutes: 0,
      topic: "VPC routing",
      notes: "",
      completed: false,
      linked_project_id: null,
      bottleneck_id: null,
      study_schedule_id: null,
      created_at: "2026-09-27T00:00:00Z",
      updated_at: "2026-09-27T00:00:00Z",
    };
    fetchMock.mockResolvedValue(
      Response.json({ ...session, completed: true, actual_minutes: 75 }),
    );
    setup(
      <LearningDashboardView
        dashboard={{
          ...emptyDashboard,
          active_goals: [goal],
          today_sessions: [session],
          week_sessions: [session],
          minutes_planned: 90,
        }}
        goals={[goal]}
        projects={[]}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Complete / log session" }),
    );
    fireEvent.change(screen.getByLabelText("Actual minutes"), {
      target: { value: "75" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Complete session" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/api/v1/learning/study-sessions/session-1/complete",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ actual_minutes: 75, notes: "" }),
      }),
    );
  });

  it("renders the editable Monday-Sunday plan from server sessions", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-23T12:00:00Z"));
    setup(
      <WeeklyPlanView
        goals={[goal]}
        projects={[]}
        schedules={[]}
        sessions={[
          {
            id: "session-1",
            learning_goal_id: goal.id,
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
            created_at: "2026-09-20T00:00:00Z",
            updated_at: "2026-09-20T00:00:00Z",
          },
        ]}
      />,
    );
    expect(screen.getByRole("heading", { name: "Mon" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sun" })).toBeInTheDocument();
    expect(screen.getByText("VPC routing")).toBeInTheDocument();
    expect(screen.getByText("90 min")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Add recurring" }),
    ).toHaveLength(7);
    expect(screen.getAllByRole("button", { name: "Add one-off" })).toHaveLength(
      7,
    );
  });

  it("materializes a weekly template only after the planning response", async () => {
    const week = currentWeekDays();
    fetchMock.mockResolvedValue(Response.json([], { status: 201 }));
    setup(
      <WeeklyPlanView
        goals={[goal]}
        projects={[]}
        schedules={[fridaySchedule]}
        sessions={[]}
      />,
    );

    expect(screen.getByText("Deep certification study")).toBeInTheDocument();
    expect(
      screen.queryByText("No new sessions created"),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Plan this week" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/api/v1/learning/study-schedules/schedule-1/plan",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          start_date: week[0].date,
          end_date: week[6].date,
        }),
      }),
    );
    expect(
      await screen.findByText("No new sessions created"),
    ).toBeInTheDocument();
  });

  it("uses the saved assessment before offering bottleneck entry", async () => {
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    fetchMock.mockResolvedValue(
      Response.json(
        {
          id: "attempt-1",
          learning_goal_id: goal.id,
          date: "2026-09-27",
          assessment_type: "mock_exam",
          score_percent: 63,
          source: null,
          notes: "",
          duration_minutes: null,
          created_at: "2026-09-27T10:00:00Z",
        },
        { status: 201 },
      ),
    );
    setup(<AssessmentEntry goals={[goal]} />, client);
    fireEvent.change(screen.getByLabelText("Score %"), {
      target: { value: "63" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save assessment" }));

    expect(await screen.findByText("63%")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add weak area" }),
    ).toBeInTheDocument();
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toMatchObject({
      learning_goal_id: goal.id,
      score_percent: 63,
      source: null,
      duration_minutes: null,
    });
    expect(body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await waitFor(() =>
      expect(invalidate.mock.calls.map(([options]) => options)).toEqual(
        expect.arrayContaining([
          { queryKey: ["learning"] },
          { queryKey: ["dashboard"] },
        ]),
      ),
    );
  });

  it("keeps assessment input visible after a backend validation failure", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ detail: "Invalid score" }, { status: 422 }),
    );
    setup(<AssessmentEntry goals={[goal]} />);
    fireEvent.change(screen.getByLabelText("Score %"), {
      target: { value: "63" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save assessment" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "backend rejected",
    );
    expect(screen.getByLabelText("Score %")).toHaveValue(63);
    expect(
      screen.queryByRole("button", { name: "Add weak area" }),
    ).not.toBeInTheDocument();
  });

  it("changes bottleneck status only after the strict server patch", async () => {
    const bottleneck: LearningBottleneck = {
      id: "bottleneck-1",
      learning_goal_id: goal.id,
      assessment_attempt_id: null,
      topic: "IAM policies",
      description: "Resource policy evaluation",
      priority: "high",
      status: "open",
      created_at: "2026-09-27T10:00:00Z",
      resolved_at: null,
    };
    fetchMock.mockResolvedValue(
      Response.json({ ...bottleneck, status: "improving" }),
    );
    setup(
      <BottleneckView
        bottlenecks={[bottleneck]}
        goals={[goal]}
        assessments={[]}
        projects={[]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Mark improving" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/api/v1/learning/bottlenecks/bottleneck-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ status: "improving" }),
      }),
    );
  });
});
