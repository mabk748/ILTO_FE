import type { TrainingPlan, WorkoutSession, HealthMetric } from "./types.ts";

const API_BASE =
  import.meta.env.VITE_API_BASE ??
  "https://n8n-pr.mhabproperties.org/webhook/api/v1/health";

async function getJson<T>(resource: string): Promise<T> {
  const res = await fetch(`${API_BASE}?resource=${resource}`);
  if (!res.ok)
    throw new Error(`GET /health?resource=${resource} failed: ${res.status}`);
  return res.json();
}

// GET /api/v1/health/training-plans
export async function getTrainingPlans(): Promise<TrainingPlan[]> {
  return getJson<TrainingPlan[]>("training-plan");
}

// GET /api/v1/health/training-plans/:id
export async function getTrainingPlan(
  id: string,
): Promise<TrainingPlan | null> {
  return getJson<TrainingPlan>(`training-plan&id=${id}`) ?? null;
}

// GET /api/v1/health/workouts?days=14
export async function getWorkoutSessions(days = 14): Promise<WorkoutSession[]> {
  const sessions = await getJson<WorkoutSession[]>("workout-session");
  return sessions.slice(0, days);
}

// GET /api/v1/health/metrics?days=30
export async function getHealthMetrics(days = 30): Promise<HealthMetric[]> {
  const metrics = await getJson<HealthMetric[]>("health-metric");
  return metrics.slice(-days);
}

// GET /api/v1/health/metrics/latest
export async function getLatestHealthMetric(): Promise<HealthMetric | null> {
  const metrics = await getJson<HealthMetric[]>("health-metric");
  return metrics[metrics.length - 1] ?? null;
}

// TO BE CLEANED: START
/**
 * Health Domain API
 *
 * INTEGRATION GUIDE:
 * Base URL: http://your-server:8000/api/v1/health
 *
 * Biometric data (weight, HRV, sleep) syncs from wearable integrations
 * (Garmin Connect, Apple Health export) via the backend data ingestion pipeline.
 * Manual entries are also supported via POST endpoints.


import type { TrainingPlan, WorkoutSession, HealthMetric } from "./types.ts";
import { mockTrainingPlans, mockWorkoutSessions, mockHealthMetrics } from "./mock/health.mock.ts";

const delay = (): Promise<void> => new Promise(r => setTimeout(r, 180));

// GET /api/v1/health/training-plans
export async function getTrainingPlans(): Promise<TrainingPlan[]> {
  return mockTrainingPlans;
}

// GET /api/v1/health/training-plans/:id
export async function getTrainingPlan(id: string): Promise<TrainingPlan | null> {
  return mockTrainingPlans.find(p => p.id === id) ?? null;
}

// GET /api/v1/health/workouts?days=14
export async function getWorkoutSessions(days = 14): Promise<WorkoutSession[]> {
  return mockWorkoutSessions.slice(0, days);
}

// GET /api/v1/health/metrics?days=30
export async function getHealthMetrics(days = 30): Promise<HealthMetric[]> {
  return mockHealthMetrics.slice(-days);
}

// GET /api/v1/health/metrics/latest
export async function getLatestHealthMetric(): Promise<HealthMetric | null> {
  return mockHealthMetrics[mockHealthMetrics.length - 1] ?? null;
}
*/
// TO BE CLEANED: END
