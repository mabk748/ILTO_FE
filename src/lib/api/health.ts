import { getArray } from "./resource.ts";
/** Proposed backend contract: see docs/backend-api.md. */
import { apiClient, type ApiRequestOptions } from "./client.ts";
import { ApiError } from "./errors.ts";
import { encodeId, getNullable } from "./resource.ts";
import type { TrainingPlan, WorkoutSession, HealthMetric } from "./types.ts";

export function getTrainingPlans(
  options: ApiRequestOptions = {},
): Promise<TrainingPlan[]> {
  return getArray<TrainingPlan>(`/health/training-plans`, options);
}

export function getTrainingPlan(
  id: string,
  options: ApiRequestOptions = {},
): Promise<TrainingPlan | null> {
  return getNullable<TrainingPlan>(
    `/health/training-plans/${encodeId(id)}`,
    options,
  );
}

export function getWorkoutSessions(
  days = 14,
  options: ApiRequestOptions = {},
): Promise<WorkoutSession[]> {
  if (!Number.isInteger(days) || days < 1 || days > 3650) {
    return Promise.reject(
      new ApiError(
        "Workout history days must be an integer from 1 to 3650.",
        "configuration",
      ),
    );
  }
  return getArray<WorkoutSession>(`/health/workouts`, {
    ...options,
    query: { ...options.query, ...{ days } },
  });
}

export function getHealthMetrics(
  days = 30,
  options: ApiRequestOptions = {},
): Promise<HealthMetric[]> {
  if (!Number.isInteger(days) || days < 1 || days > 3650) {
    return Promise.reject(
      new ApiError(
        "Health metric history days must be an integer from 1 to 3650.",
        "configuration",
      ),
    );
  }
  return getArray<HealthMetric>(`/health/metrics`, {
    ...options,
    query: { ...options.query, ...{ days } },
  });
}

export function getLatestHealthMetric(
  options: ApiRequestOptions = {},
): Promise<HealthMetric | null> {
  return apiClient.get<HealthMetric | null>(`/health/metrics/latest`, options);
}

export type CreateTrainingPlanInput = Omit<TrainingPlan, "id" | "created_at">;
export type UpdateTrainingPlanInput = Partial<CreateTrainingPlanInput>;

export function createTrainingPlan(
  input: CreateTrainingPlanInput,
  options: ApiRequestOptions = {},
): Promise<TrainingPlan> {
  return apiClient.post<TrainingPlan>("/health/training-plans", input, options);
}

export function updateTrainingPlan(
  id: string,
  input: UpdateTrainingPlanInput,
  options: ApiRequestOptions = {},
): Promise<TrainingPlan> {
  return apiClient.patch<TrainingPlan>(
    `/health/training-plans/${encodeId(id)}`,
    input,
    options,
  );
}

export function deleteTrainingPlan(
  id: string,
  options: ApiRequestOptions = {},
): Promise<void> {
  return apiClient.delete(`/health/training-plans/${encodeId(id)}`, options);
}

export type CreateWorkoutSessionInput = Omit<WorkoutSession, "id">;
export type UpdateWorkoutSessionInput = Partial<CreateWorkoutSessionInput>;

export function createWorkoutSession(
  input: CreateWorkoutSessionInput,
  options: ApiRequestOptions = {},
): Promise<WorkoutSession> {
  return apiClient.post<WorkoutSession>("/health/workouts", input, options);
}

export function updateWorkoutSession(
  id: string,
  input: UpdateWorkoutSessionInput,
  options: ApiRequestOptions = {},
): Promise<WorkoutSession> {
  return apiClient.patch<WorkoutSession>(
    `/health/workouts/${encodeId(id)}`,
    input,
    options,
  );
}

export function deleteWorkoutSession(
  id: string,
  options: ApiRequestOptions = {},
): Promise<void> {
  return apiClient.delete(`/health/workouts/${encodeId(id)}`, options);
}

export type CreateHealthMetricInput = Omit<HealthMetric, "id">;
export type UpdateHealthMetricInput = Partial<CreateHealthMetricInput>;

export function createHealthMetric(
  input: CreateHealthMetricInput,
  options: ApiRequestOptions = {},
): Promise<HealthMetric> {
  return apiClient.post<HealthMetric>("/health/metrics", input, options);
}

export function updateHealthMetric(
  id: string,
  input: UpdateHealthMetricInput,
  options: ApiRequestOptions = {},
): Promise<HealthMetric> {
  return apiClient.patch<HealthMetric>(
    `/health/metrics/${encodeId(id)}`,
    input,
    options,
  );
}

export function deleteHealthMetric(
  id: string,
  options: ApiRequestOptions = {},
): Promise<void> {
  return apiClient.delete(`/health/metrics/${encodeId(id)}`, options);
}
