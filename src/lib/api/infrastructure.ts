import type { InfraNode, SystemMetric, GitActivity } from "./types.ts";

const API_BASE =
  import.meta.env.VITE_API_BASE ??
  "https://n8n-pr.mhabproperties.org/webhook/api/v1/infrastructure";

async function getJson<T>(resource: string): Promise<T> {
  const res = await fetch(`${API_BASE}?resource=${resource}`);
  if (!res.ok)
    throw new Error(
      `GET /infrastructure?resource=${resource} failed: ${res.status}`,
    );
  return res.json();
}

// GET /api/v1/infrastructure/nodes
export async function getNodes(): Promise<InfraNode[]> {
  return getJson<InfraNode[]>("infra-node");
}

// GET /api/v1/infrastructure/nodes/:id/metrics?hours=24
export async function getNodeMetrics(
  nodeId: string,
  hours = 24,
): Promise<SystemMetric[]> {
  const metric = await getJson<SystemMetric[]>("system-metric");
  return metric.filter((item) => item.node_id === nodeId).slice(-hours);
}

// GET /api/v1/infrastructure/nodes/:id/metrics/latest
export async function getLatestMetric(
  nodeId: string,
): Promise<SystemMetric | null> {
  const metric = await getJson<SystemMetric[]>("system-metric");
  const metrics = metric.filter((item) => item.node_id === nodeId);
  return metrics[metrics.length - 1] ?? null;
}

// GET /api/v1/infrastructure/git
export async function getGitActivity(): Promise<GitActivity[]> {
  return getJson<GitActivity[]>("git-activity");
}

// TO BE CLEANED: START
/*
// GET /api/v1/appearance/wardrobe
export async function getWardrobeItems(): Promise<WardrobeItem[]> {
  return getJson<WardrobeItem[]>("wardrobe-item");
}

// GET /api/v1/appearance/outfits?limit=20
export async function getOutfitLogs(limit = 20): Promise<OutfitLog[]> {
  const outfit = await getJson<OutfitLog[]>("outfit-log");
  return outfit.slice(0, limit);
}

// GET /api/v1/appearance/grooming
export async function getGroomingRoutines(): Promise<GroomingRoutine[]> {
  return getJson<GroomingRoutine[]>("grooming-routine");
}

// GET /api/v1/appearance/spend
export async function getAppearanceSpend(): Promise<AppearanceSpend[]> {
  return getJson<AppearanceSpend[]>("appearance-spend");
}
*/
// TO BE CLEANED: END

// TO BE CLEANED: START
/**
 * Infrastructure Domain API
 *
 * INTEGRATION GUIDE:
 * Base URL: http://your-server:8000/api/v1/infrastructure
 *
 * Metric collection is done server-side by Netdata/Prometheus-compatible collectors.
 * The frontend polls these endpoints to display live-style dashboards.
 * WebSocket upgrade available at: ws://your-server:8000/ws/metrics/:node_id
 

import type { InfraNode, SystemMetric, GitActivity } from "./types.ts";
import { mockNodes, mockMetrics, mockGitActivity } from "./mock/infrastructure.mock.ts";

const delay = (): Promise<void> => new Promise(r => setTimeout(r, 150));

// GET /api/v1/infrastructure/nodes
export async function getNodes(): Promise<InfraNode[]> {
  await delay();
  return mockNodes;
}

// GET /api/v1/infrastructure/nodes/:id/metrics?hours=24
export async function getNodeMetrics(nodeId: string, hours = 24): Promise<SystemMetric[]> {
  await delay();
  return (mockMetrics[nodeId] ?? []).slice(-hours);
}

// GET /api/v1/infrastructure/nodes/:id/metrics/latest
export async function getLatestMetric(nodeId: string): Promise<SystemMetric | null> {
  await delay();
  const metrics = mockMetrics[nodeId] ?? [];
  return metrics[metrics.length - 1] ?? null;
}

// GET /api/v1/infrastructure/git
export async function getGitActivity(): Promise<GitActivity[]> {
  await delay();
  return mockGitActivity;
}
*/
// TO BE CLEANED: END
