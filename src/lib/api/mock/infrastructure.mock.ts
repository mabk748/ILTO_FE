import type { InfraNode, SystemMetric, GitActivity } from "../types.ts";

export const mockNodes: InfraNode[] = [
  {
    id: "n1",
    name: "Dev Laptop",
    hostname: "momo-dev",
    type: "laptop",
    status: "online",
    ip_address: "100.64.0.1",
    os: "Ubuntu 24.04",
    last_seen: new Date().toISOString(),
  },
  {
    id: "n2",
    name: "Server Laptop",
    hostname: "momo-server",
    type: "server",
    status: "online",
    ip_address: "100.64.0.2",
    os: "Ubuntu 22.04",
    last_seen: new Date().toISOString(),
  },
  {
    id: "n3",
    name: "Raspberry Pi 4",
    hostname: "momo-edge",
    type: "raspberry_pi",
    status: "degraded",
    ip_address: "100.64.0.3",
    os: "Raspberry Pi OS",
    last_seen: new Date(Date.now() - 120000).toISOString(),
  },
  {
    id: "n4",
    name: "Galaxy A70",
    hostname: "momo-mobile",
    type: "mobile",
    status: "online",
    ip_address: "100.64.0.4",
    os: "Android 11",
    last_seen: new Date(Date.now() - 300000).toISOString(),
  },
];

function generateMetrics(
  nodeId: string,
  baseCpu: number,
  baseRam: number,
): SystemMetric[] {
  return Array.from({ length: 24 }, (_, i) => ({
    id: `${nodeId}-m${i}`,
    node_id: nodeId,
    timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
    cpu_percent: Math.max(
      0,
      Math.min(100, baseCpu + (Math.random() - 0.5) * 20),
    ),
    ram_percent: Math.max(
      0,
      Math.min(100, baseRam + (Math.random() - 0.5) * 10),
    ),
    disk_percent: 45 + Math.random() * 5,
    uptime_seconds: 3600 * 24 * 14 + i * 3600,
    temperature_celsius: nodeId === "n3" ? 52 + Math.random() * 8 : null,
  }));
}

export const mockMetrics: Record<string, SystemMetric[]> = {
  n1: generateMetrics("n1", 35, 62),
  n2: generateMetrics("n2", 22, 78),
  n3: generateMetrics("n3", 48, 55),
  n4: generateMetrics("n4", 15, 40),
};

export const mockGitActivity: GitActivity[] = [
  {
    id: "g1",
    repo: "ilto-frontend",
    branch: "main",
    commits_today: 4,
    commits_week: 18,
    last_commit_at: new Date(Date.now() - 3600000).toISOString(),
    velocity_score: 82,
  },
  {
    id: "g2",
    repo: "ilto-backend",
    branch: "main",
    commits_today: 2,
    commits_week: 9,
    last_commit_at: new Date(Date.now() - 7200000).toISOString(),
    velocity_score: 61,
  },
  {
    id: "g3",
    repo: "homelab-scripts",
    branch: "main",
    commits_today: 0,
    commits_week: 3,
    last_commit_at: new Date(Date.now() - 86400000).toISOString(),
    velocity_score: 30,
  },
];
