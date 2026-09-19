import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createHealthMetric,
  createWorkoutSession,
  deleteTrainingPlan,
  getHealthMetrics,
  getLatestHealthMetric,
  getWorkoutSessions,
  updateHealthMetric,
} from "./health.ts";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test/api/v1");
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Health backend adapter", () => {
  it("uses bounded day windows and retains backend ordering", async () => {
    const sessions = [{ id: "new" }, { id: "old" }];
    fetchMock.mockResolvedValue(Response.json(sessions));
    await expect(getWorkoutSessions(14)).resolves.toEqual(sessions);
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.pathname).toBe("/api/v1/health/workouts");
    expect(url.searchParams.get("days")).toBe("14");

    fetchMock.mockResolvedValue(Response.json([]));
    await expect(getHealthMetrics(30)).resolves.toEqual([]);
    expect(
      new URL(String(fetchMock.mock.calls[1][0])).searchParams.get("days"),
    ).toBe("30");
  });

  it.each([0, 3651, 1.5])(
    "rejects invalid day window %s before fetching",
    async (days) => {
      await expect(getHealthMetrics(days)).rejects.toMatchObject({
        code: "configuration",
      });
      await expect(getWorkoutSessions(days)).rejects.toMatchObject({
        code: "configuration",
      });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("sends nullable metric fields as JSON numbers or null and preserves latest null", async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({ id: "metric-1" }, { status: 201 }))
      .mockResolvedValueOnce(Response.json(null));
    const input = {
      date: "2026-09-15T10:00:00.000Z",
      weight_kg: 70.25,
      sleep_hours: null,
      resting_hr: 60,
      hrv: null,
      steps: 1000,
      calories_consumed: null,
    };
    await createHealthMetric(input);
    const request = fetchMock.mock.calls[0][1]!;
    expect(JSON.parse(String(request.body))).toEqual(input);
    expect(request.credentials).toBe("include");
    await expect(getLatestHealthMetric()).resolves.toBeNull();
  });

  it("sends UTC workout dates, PATCH bodies, and DELETE without fabricating success", async () => {
    fetchMock
      .mockResolvedValueOnce(
        Response.json({ id: "workout-1" }, { status: 201 }),
      )
      .mockResolvedValueOnce(Response.json({ id: "metric-1" }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    await createWorkoutSession({
      plan_id: null,
      type: "strength",
      name: "Disposable Health workout",
      duration_minutes: 30,
      completed_at: "2026-09-15T10:00:00.000Z",
      notes: "test",
      rpe: 5,
    });
    await updateHealthMetric("metric-1", { sleep_hours: null });
    await deleteTrainingPlan("plan/1");
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
      sleep_hours: null,
    });
    expect(fetchMock.mock.calls[2][0]).toContain("plan%2F1");
    expect(fetchMock.mock.calls[2][1]?.method).toBe("DELETE");
  });
});
