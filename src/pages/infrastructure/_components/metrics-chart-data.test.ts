import { describe, expect, it } from "vitest";
import type { InfraNode, SystemMetric } from "@/lib/api/types.ts";
import { buildChartData, nodeColor } from "./metrics-chart-data.ts";

const nodes: InfraNode[] = [
  {
    id: "node-a",
    name: "A",
    hostname: "a",
    type: "server",
    status: "offline",
    ip_address: "192.0.2.1",
    os: "Linux",
    last_seen: null,
  },
  {
    id: "node-b",
    name: "B",
    hostname: "b",
    type: "server",
    status: "offline",
    ip_address: "192.0.2.2",
    os: "Linux",
    last_seen: null,
  },
];

function metric(
  id: string,
  node_id: string,
  timestamp: string,
  cpu_percent: number,
): SystemMetric {
  return {
    id,
    node_id,
    timestamp,
    cpu_percent,
    ram_percent: cpu_percent,
    disk_percent: 0,
    uptime_seconds: 1,
    temperature_celsius: null,
  };
}

describe("MetricsChart data", () => {
  it("sorts the timestamp union and preserves gaps as null", () => {
    const data = buildChartData(
      nodes,
      {
        "node-a": [
          metric("a2", "node-a", "2026-09-15T01:00:00Z", 20),
          metric("a1", "node-a", "2026-09-15T00:00:00Z", 10),
        ],
        "node-b": [metric("b1", "node-b", "2026-09-15T00:30:00Z", 30)],
      },
      "cpu_percent",
    );

    expect(data).toEqual([
      {
        timestamp: Date.parse("2026-09-15T00:00:00Z"),
        "node-a": 10,
        "node-b": null,
      },
      {
        timestamp: Date.parse("2026-09-15T00:30:00Z"),
        "node-a": null,
        "node-b": 30,
      },
      {
        timestamp: Date.parse("2026-09-15T01:00:00Z"),
        "node-a": 20,
        "node-b": null,
      },
    ]);
  });

  it("aligns equivalent instants with different timezone offsets", () => {
    const data = buildChartData(
      nodes,
      {
        "node-a": [metric("a", "node-a", "2026-09-15T01:00:00+01:00", 10)],
        "node-b": [metric("b", "node-b", "2026-09-15T00:00:00Z", 20)],
      },
      "cpu_percent",
    );
    expect(data).toEqual([
      {
        timestamp: Date.parse("2026-09-15T00:00:00Z"),
        "node-a": 10,
        "node-b": 20,
      },
    ]);
  });

  it("does not require the first node to have observations", () => {
    const data = buildChartData(
      nodes,
      {
        "node-a": [],
        "node-b": [metric("b", "node-b", "2026-09-15T00:00:00Z", 20)],
      },
      "cpu_percent",
    );
    expect(data[0]["node-a"]).toBeNull();
    expect(data[0]["node-b"]).toBe(20);
  });

  it("keeps colors stable for the same real node ID", () => {
    expect(nodeColor("node-a")).toBe(nodeColor("node-a"));
    expect(nodeColor("node-a")).toBe(nodeColor("node-a"));
  });
});
