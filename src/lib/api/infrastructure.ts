import { getArray } from "./resource.ts";
/** Proposed backend contract: see docs/backend-api.md. */
import { apiClient, type ApiRequestOptions } from "./client.ts";
import { encodeId } from "./resource.ts";
import { ApiError } from "./errors.ts";
import type { InfraNode, SystemMetric, GitActivity } from "./types.ts";

function validateHours(hours: number): number {
  if (!Number.isInteger(hours) || hours < 1 || hours > 720) {
    throw new ApiError(
      "Metric history hours must be an integer from 1 to 720.",
      "configuration",
    );
  }
  return hours;
}

export function getNodes(
  options: ApiRequestOptions = {},
): Promise<InfraNode[]> {
  return getArray<InfraNode>(`/infrastructure/nodes`, options);
}

export async function getNodeMetrics(
  nodeId: string,
  hours = 24,
  options: ApiRequestOptions = {},
): Promise<SystemMetric[]> {
  const windowHours = validateHours(hours);
  return getArray<SystemMetric>(
    `/infrastructure/nodes/${encodeId(nodeId)}/metrics`,
    { ...options, query: { ...options.query, ...{ hours: windowHours } } },
  );
}

export function getLatestMetric(
  nodeId: string,
  options: ApiRequestOptions = {},
): Promise<SystemMetric | null> {
  return apiClient.get<SystemMetric | null>(
    `/infrastructure/nodes/${encodeId(nodeId)}/metrics/latest`,
    options,
  );
}

export function getGitActivity(
  options: ApiRequestOptions = {},
): Promise<GitActivity[]> {
  return getArray<GitActivity>(`/infrastructure/git`, options);
}

export type CreateNodeInput = Omit<InfraNode, "id" | "status" | "last_seen">;
export type UpdateNodeInput = Partial<CreateNodeInput>;

export function createNode(
  input: CreateNodeInput,
  options: ApiRequestOptions = {},
): Promise<InfraNode> {
  return apiClient.post<InfraNode>("/infrastructure/nodes", input, options);
}

export function updateNode(
  id: string,
  input: UpdateNodeInput,
  options: ApiRequestOptions = {},
): Promise<InfraNode> {
  return apiClient.patch<InfraNode>(
    `/infrastructure/nodes/${encodeId(id)}`,
    input,
    options,
  );
}

export function deleteNode(
  id: string,
  options: ApiRequestOptions = {},
): Promise<void> {
  return apiClient.delete(`/infrastructure/nodes/${encodeId(id)}`, options);
}
