import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { InfraNode, SystemMetric } from "@/lib/api/types.ts";
import MetricsChart from "./MetricsChart.tsx";

const node: InfraNode = {
  id: "node-a",
  name: "Server A",
  hostname: "server-a",
  type: "server",
  status: "online",
  ip_address: "192.0.2.10",
  os: "Linux",
  last_seen: "2026-10-18T08:00:00Z",
};

const observation: SystemMetric = {
  id: "metric-a",
  node_id: node.id,
  timestamp: "2026-10-18T08:00:00Z",
  cpu_percent: 42,
  ram_percent: 55,
  disk_percent: 60,
  uptime_seconds: 120,
  temperature_celsius: null,
};

describe("Infrastructure metric chart composition", () => {
  it("uses compact states for absent and single-observation data", () => {
    const { rerender } = render(
      <MetricsChart
        nodes={[node]}
        metricsMap={{ [node.id]: [] }}
        metric="cpu_percent"
        title="CPU Usage %"
      />,
    );
    expect(
      screen.getByText("No metric observations in this window."),
    ).toBeVisible();

    rerender(
      <MetricsChart
        nodes={[node]}
        metricsMap={{ [node.id]: [observation] }}
        metric="cpu_percent"
        title="CPU Usage %"
      />,
    );
    expect(
      screen.getByText(/another is needed to establish a trend/),
    ).toBeVisible();
    expect(screen.getByText("Server A")).toBeVisible();
    expect(screen.getByText("42.0%")).toBeVisible();
  });
});
