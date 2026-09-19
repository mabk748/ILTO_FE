import { describe, expect, it } from "vitest";
import type { HealthMetric, TrainingPlan } from "@/lib/api/types.ts";
import { ApiError } from "@/lib/api/errors.ts";
import {
  buildHealthInput,
  changedFields,
  healthWriteError,
  toLocalDateTimeValue,
} from "./health-editor.ts";

const plan: TrainingPlan = {
  id: "plan-1",
  name: "Base plan",
  goal: "Consistency",
  weeks_total: 12,
  week_current: 2,
  status: "active",
  created_at: "2026-09-01T00:00:00.000Z",
};

const metric: HealthMetric = {
  id: "metric-1",
  date: "2026-09-15T10:00:00.000Z",
  weight_kg: 70,
  sleep_hours: 8,
  resting_hr: 60,
  hrv: 50,
  steps: 1000,
  calories_consumed: 2000,
};

describe("Health editor contract", () => {
  it("builds UTC payloads and excludes server-owned plan fields", () => {
    expect(
      buildHealthInput(
        { kind: "plan", record: plan },
        {
          name: "Base plan",
          goal: "Consistency",
          weeks_total: "12",
          week_current: "2",
          status: "active",
        },
        [],
      ),
    ).toEqual({
      name: "Base plan",
      goal: "Consistency",
      weeks_total: 12,
      week_current: 2,
      status: "active",
    });
    expect(
      buildHealthInput(
        { kind: "workout" },
        {
          plan_id: "",
          type: "strength",
          name: "Disposable workout",
          duration_minutes: "30",
          completed_at: "2026-09-15T12:00",
          notes: "",
          rpe: "5",
        },
        [],
      ),
    ).toMatchObject({ plan_id: null, duration_minutes: 30, rpe: 5 });
    expect(toLocalDateTimeValue("2026-09-15T10:00:00.000Z")).toMatch(
      /^2026-09-15T/,
    );
  });

  it("requires strict ranges and decimal formats", () => {
    const base = {
      date: "2026-09-15T12:00",
      weight_kg: "70.123",
      sleep_hours: "",
      resting_hr: "",
      hrv: "",
      steps: "",
      calories_consumed: "",
    };
    expect(() => buildHealthInput({ kind: "metric" }, base, [])).toThrow(
      "at most two decimals",
    );
    expect(() =>
      buildHealthInput({ kind: "metric" }, { ...base, weight_kg: "0" }, []),
    ).toThrow();
    expect(() =>
      buildHealthInput(
        { kind: "metric" },
        { ...base, weight_kg: "70", steps: "1.5" },
        [],
      ),
    ).toThrow("whole number");
    expect(() =>
      buildHealthInput(
        { kind: "plan" },
        {
          name: "x",
          goal: "y",
          weeks_total: "0",
          week_current: "1",
          status: "active",
        },
        [],
      ),
    ).toThrow();
    expect(() =>
      buildHealthInput(
        { kind: "workout" },
        {
          plan_id: "missing",
          type: "strength",
          name: "x",
          duration_minutes: "0",
          completed_at: "2026-09-15T12:00",
          notes: "",
          rpe: "1",
        },
        [plan.id],
      ),
    ).toThrow("existing training plan");
  });

  it("requires at least one metric and sends explicit null clears while omitting unchanged fields", () => {
    const values = {
      date: "2026-09-15T12:00",
      weight_kg: "70",
      sleep_hours: "",
      resting_hr: "",
      hrv: "",
      steps: "",
      calories_consumed: "",
    };
    expect(() =>
      buildHealthInput({ kind: "metric" }, { ...values, weight_kg: "" }, []),
    ).toThrow("at least one");
    const input = buildHealthInput(
      { kind: "metric", record: metric },
      values,
      [],
    );
    expect(input).toMatchObject({ weight_kg: 70, sleep_hours: null });
    expect(changedFields(input, metric)).toEqual({
      date: "2026-09-15T11:00:00.000Z",
      sleep_hours: null,
      resting_hr: null,
      hrv: null,
      steps: null,
      calories_consumed: null,
    });
    expect(changedFields({ sleep_hours: 8 }, { sleep_hours: 8 })).toEqual({});
    expect(
      changedFields(
        { date: "2026-09-15T10:00:00.000Z" },
        { date: "2026-09-15T11:00:00+01:00" },
      ),
    ).toEqual({});
  });

  it.each([404, 409, 422, 503])(
    "maps HTTP %s without claiming success",
    (status) => {
      expect(
        healthWriteError(new ApiError("backend", "http", { status })),
      ).toMatch(/record|conflict|rejected|confirm/);
    },
  );
});
