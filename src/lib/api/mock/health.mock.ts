import type { TrainingPlan, WorkoutSession, HealthMetric } from "../types.ts";

export const mockTrainingPlans: TrainingPlan[] = [
  {
    id: "tp1",
    name: "Strength Foundation — Phase 1",
    goal: "Build base strength, 3x/week",
    weeks_total: 8,
    week_current: 3,
    status: "active",
    created_at: "2025-06-01T00:00:00Z",
  },
  {
    id: "tp2",
    name: "Cardio Conditioning",
    goal: "VO2 max improvement",
    weeks_total: 6,
    week_current: 1,
    status: "paused",
    created_at: "2025-05-01T00:00:00Z",
  },
];

export const mockWorkoutSessions: WorkoutSession[] = Array.from(
  { length: 14 },
  (_, i) => ({
    id: `ws${i + 1}`,
    plan_id: i % 3 === 2 ? null : "tp1",
    type: (["strength", "cardio", "flexibility", "rest"] as const)[i % 4],
    name: ["Upper Body Pull", "Lower Body Push", "Active Recovery", "Rest Day"][
      i % 4
    ],
    duration_minutes: [60, 50, 30, 0][i % 4],
    completed_at: new Date(Date.now() - i * 86400000).toISOString(),
    notes: i % 4 === 0 ? "Good session, PR on lat pulldown" : "",
    rpe: [7, 8, 4, 0][i % 4],
  }),
);

export const mockHealthMetrics: HealthMetric[] = Array.from(
  { length: 30 },
  (_, i) => ({
    id: `hm${i + 1}`,
    date: new Date(Date.now() - (29 - i) * 86400000).toISOString(),
    weight_kg: 78 + Math.sin(i * 0.3) * 1.5 + Math.random() * 0.3,
    sleep_hours: 6.5 + Math.random() * 2,
    resting_hr: 58 + Math.round(Math.random() * 8),
    hrv: 45 + Math.round(Math.random() * 20),
    steps: 7000 + Math.round(Math.random() * 5000),
    calories_consumed: 2100 + Math.round(Math.random() * 600),
  }),
);
