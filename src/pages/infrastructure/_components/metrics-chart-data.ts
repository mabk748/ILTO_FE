import type { InfraNode, SystemMetric } from "@/lib/api/types.ts";

const NODE_COLORS = [
  "#6366f1",
  "#22d3ee",
  "#f59e0b",
  "#10b981",
  "#f472b6",
  "#a78bfa",
  "#fb7185",
  "#2dd4bf",
] as const;

export type ChartPoint = {
  timestamp: number;
  [key: string]: string | number | null;
};

export function buildChartData(
  nodes: InfraNode[],
  metricsMap: Record<string, SystemMetric[]>,
  field: "cpu_percent" | "ram_percent",
): ChartPoint[] {
  const timestamps = new Set<number>();
  for (const node of nodes) {
    for (const metric of metricsMap[node.id] ?? []) {
      const timestamp = new Date(metric.timestamp).getTime();
      if (Number.isFinite(timestamp)) timestamps.add(timestamp);
    }
  }

  return [...timestamps]
    .sort((a, b) => a - b)
    .map((timestamp) => {
      const point: ChartPoint = { timestamp };
      for (const node of nodes) {
        const metric = (metricsMap[node.id] ?? []).find(
          (item) => new Date(item.timestamp).getTime() === timestamp,
        );
        point[node.id] = metric?.[field] ?? null;
      }
      return point;
    });
}

/** Colors are derived from the opaque server ID, not registration order. */
export function nodeColor(nodeId: string): string {
  let hash = 0;
  for (let index = 0; index < nodeId.length; index += 1) {
    hash = (hash * 31 + nodeId.charCodeAt(index)) | 0;
  }
  const index =
    ((hash % NODE_COLORS.length) + NODE_COLORS.length) % NODE_COLORS.length;
  return NODE_COLORS[index];
}
