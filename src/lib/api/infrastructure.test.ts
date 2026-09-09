import { afterEach, describe, expect, it, vi } from "vitest";
import { getLatestMetric, getNodeMetrics } from "./infrastructure.ts";
import type { SystemMetric } from "./types.ts";

const metrics: SystemMetric[] = [
  {
    id: "metric-a",
    node_id: "node-a",
    timestamp: "2026-09-07T08:00:00.000Z",
    cpu_percent: 10,
    ram_percent: 20,
    disk_percent: 30,
    uptime_seconds: 100,
    temperature_celsius: null,
  },
  {
    id: "metric-b",
    node_id: "node-b",
    timestamp: "2026-09-07T09:00:00.000Z",
    cpu_percent: 40,
    ram_percent: 50,
    disk_percent: 60,
    uptime_seconds: 200,
    temperature_celsius: 45,
  },
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("infrastructure API filtering", () => {
  it("returns only metrics belonging to the requested node", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => structuredClone(metrics),
      }),
    );

    const result = await getNodeMetrics("node-a");

    expect(result.map((metric) => metric.id)).toEqual(["metric-a"]);
    expect(result[0].node_id).toBe("node-a");
  });

  it("returns the latest metric for the requested node", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => structuredClone(metrics),
      }),
    );

    await expect(getLatestMetric("node-b")).resolves.toMatchObject({
      id: "metric-b",
      node_id: "node-b",
    });
  });
});
