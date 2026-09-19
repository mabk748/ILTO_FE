import { getArray } from "./resource.ts";
import type { ApiRequestOptions } from "./client.ts";
import type { ISODateString } from "./types.ts";

/** Chronological chart points produced by backend aggregation. */
export interface CorrelationPoint {
  date: ISODateString;
  label: string;
  [key: string]: number | string | null;
}

export function getSleepVsCommits(
  options: ApiRequestOptions = {},
): Promise<CorrelationPoint[]> {
  return getArray<CorrelationPoint>("/intelligence/sleep-vs-commits", options);
}

export function getBudgetVsVelocity(
  options: ApiRequestOptions = {},
): Promise<CorrelationPoint[]> {
  return getArray<CorrelationPoint>(
    "/intelligence/budget-vs-velocity",
    options,
  );
}

export function getHrvVsRpe(
  options: ApiRequestOptions = {},
): Promise<CorrelationPoint[]> {
  return getArray<CorrelationPoint>("/intelligence/hrv-vs-rpe", options);
}

export function getNetWorthTrend(
  options: ApiRequestOptions = {},
): Promise<CorrelationPoint[]> {
  return getArray<CorrelationPoint>("/intelligence/net-worth", options);
}

export function getSleepTrend(
  options: ApiRequestOptions = {},
): Promise<(number | null)[]> {
  return getArray<number | null>("/intelligence/sleep-trend", options);
}

export function getCommitsTrend(
  options: ApiRequestOptions = {},
): Promise<(number | null)[]> {
  return getArray<number | null>("/intelligence/commits-trend", options);
}
