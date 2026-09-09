/**
 * Trigger Engine API — IF/THEN rules across domains
 *
 * INTEGRATION GUIDE:
 * Base URL: http://your-server:8000/api/v1/triggers
 * Replace mock arrays with fetch() calls when FastAPI backend is ready.
 */

import type { DomainName } from "./types.ts";

export type TriggerOperator = ">" | "<" | ">=" | "<=" | "==" | "!=";
export type TriggerActionType = "notify" | "log" | "pause_spend" | "flag";

export interface TriggerCondition {
  domain: DomainName;
  metric: string; // human-readable metric key
  operator: TriggerOperator;
  threshold: number;
  unit: string; // display unit e.g. "%", "h", "commits"
}

export interface TriggerAction {
  type: TriggerActionType;
  message: string;
  target_domain?: DomainName;
}

export interface TriggerRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  condition: TriggerCondition;
  action: TriggerAction;
  created_at: string;
  last_triggered: string | null;
  trigger_count: number;
}

export interface TriggerLogEntry {
  id: string;
  rule_id: string;
  rule_name: string;
  domain: DomainName;
  triggered_at: string;
  condition_summary: string; // e.g. "Budget spent (92%) > 90%"
  action_summary: string; // e.g. "Flagged: budget overage detected"
  resolved: boolean;
}

// ── Metric catalogue (per domain) ────────────────────────────────────────────

export type MetricDef = {
  key: string;
  label: string;
  unit: string;
  defaultThreshold: number;
};

export const DOMAIN_METRICS: Record<DomainName, MetricDef[]> = {
  health: [
    {
      key: "sleep_hours",
      label: "Sleep hours (last night)",
      unit: "h",
      defaultThreshold: 6,
    },
    {
      key: "resting_hr",
      label: "Resting heart rate",
      unit: "bpm",
      defaultThreshold: 65,
    },
    { key: "hrv", label: "HRV score", unit: "ms", defaultThreshold: 40 },
    {
      key: "steps",
      label: "Daily steps",
      unit: "steps",
      defaultThreshold: 8000,
    },
  ],
  finances: [
    {
      key: "budget_pct",
      label: "Budget spent (%)",
      unit: "%",
      defaultThreshold: 90,
    },
    {
      key: "budget_remaining",
      label: "Budget remaining (€)",
      unit: "€",
      defaultThreshold: 100,
    },
    {
      key: "net_worth",
      label: "Net worth (€)",
      unit: "€",
      defaultThreshold: 10000,
    },
  ],
  projects: [
    {
      key: "open_tasks",
      label: "Open tasks",
      unit: "tasks",
      defaultThreshold: 10,
    },
    {
      key: "sprint_velocity",
      label: "Sprint velocity",
      unit: "pts",
      defaultThreshold: 20,
    },
    {
      key: "overdue_milestones",
      label: "Overdue milestones",
      unit: "count",
      defaultThreshold: 1,
    },
  ],
  infrastructure: [
    {
      key: "nodes_online_pct",
      label: "Nodes online (%)",
      unit: "%",
      defaultThreshold: 80,
    },
    {
      key: "cpu_avg",
      label: "Average CPU (%)",
      unit: "%",
      defaultThreshold: 80,
    },
    {
      key: "commits_today",
      label: "Commits today",
      unit: "commits",
      defaultThreshold: 3,
    },
  ],
  learning: [
    {
      key: "cards_due",
      label: "SRS cards due",
      unit: "cards",
      defaultThreshold: 10,
    },
    {
      key: "study_hours_week",
      label: "Study hours (week)",
      unit: "h",
      defaultThreshold: 5,
    },
  ],
  work: [
    {
      key: "overdue_deadlines",
      label: "Overdue deadlines",
      unit: "count",
      defaultThreshold: 1,
    },
    {
      key: "pending_certs",
      label: "Pending certifications",
      unit: "count",
      defaultThreshold: 2,
    },
  ],
  social: [
    {
      key: "overdue_followups",
      label: "Overdue follow-ups",
      unit: "count",
      defaultThreshold: 3,
    },
    {
      key: "dormant_contacts",
      label: "Dormant contacts",
      unit: "count",
      defaultThreshold: 5,
    },
  ],
  logistics: [
    {
      key: "expiring_docs",
      label: "Documents expiring (30d)",
      unit: "count",
      defaultThreshold: 1,
    },
    {
      key: "upcoming_trips",
      label: "Upcoming trips (7d)",
      unit: "count",
      defaultThreshold: 1,
    },
  ],
  appearance: [
    {
      key: "overdue_routines",
      label: "Overdue grooming routines",
      unit: "count",
      defaultThreshold: 2,
    },
  ],
};

// ── Mock data ─────────────────────────────────────────────────────────────────

const now = new Date();
const ago = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();
const daysAgo = (d: number) =>
  new Date(now.getTime() - d * 86400000).toISOString();

let mockRules: TriggerRule[] = [
  {
    id: "r1",
    name: "Budget Overage Alert",
    description: "Fire when monthly budget spend crosses 90%",
    enabled: true,
    condition: {
      domain: "finances",
      metric: "budget_pct",
      operator: ">",
      threshold: 90,
      unit: "%",
    },
    action: {
      type: "flag",
      message: "Budget overage detected — review discretionary spend",
      target_domain: "finances",
    },
    created_at: daysAgo(14),
    last_triggered: ago(8),
    trigger_count: 3,
  },
  {
    id: "r2",
    name: "Poor Sleep → Recovery Mode",
    description: "Flag when sleep drops below 6h",
    enabled: true,
    condition: {
      domain: "health",
      metric: "sleep_hours",
      operator: "<",
      threshold: 6,
      unit: "h",
    },
    action: {
      type: "notify",
      message: "Sleep deficit — consider lighter training & earlier sleep",
      target_domain: "health",
    },
    created_at: daysAgo(21),
    last_triggered: ago(36),
    trigger_count: 7,
  },
  {
    id: "r3",
    name: "Overdue Deadline Warning",
    description: "Alert when any work deadline slips to overdue",
    enabled: true,
    condition: {
      domain: "work",
      metric: "overdue_deadlines",
      operator: ">=",
      threshold: 1,
      unit: "count",
    },
    action: {
      type: "notify",
      message: "Overdue work deadline detected — reprioritise tasks",
      target_domain: "work",
    },
    created_at: daysAgo(10),
    last_triggered: ago(4),
    trigger_count: 2,
  },
  {
    id: "r4",
    name: "Node Fleet Degraded",
    description: "Alert when less than 80% of nodes are online",
    enabled: true,
    condition: {
      domain: "infrastructure",
      metric: "nodes_online_pct",
      operator: "<",
      threshold: 80,
      unit: "%",
    },
    action: {
      type: "notify",
      message: "Node fleet health degraded — check Tailscale and node status",
      target_domain: "infrastructure",
    },
    created_at: daysAgo(30),
    last_triggered: ago(4),
    trigger_count: 1,
  },
  {
    id: "r5",
    name: "SRS Card Backlog",
    description: "Remind when >10 cards are due for review",
    enabled: false,
    condition: {
      domain: "learning",
      metric: "cards_due",
      operator: ">",
      threshold: 10,
      unit: "cards",
    },
    action: {
      type: "log",
      message: "SRS backlog growing — schedule a review session",
    },
    created_at: daysAgo(7),
    last_triggered: null,
    trigger_count: 0,
  },
];

let mockLog: TriggerLogEntry[] = [
  {
    id: "l1",
    rule_id: "r1",
    rule_name: "Budget Overage Alert",
    domain: "finances",
    triggered_at: ago(8),
    condition_summary: "Budget spent (92%) > 90%",
    action_summary:
      "Flagged: Budget overage detected — review discretionary spend",
    resolved: false,
  },
  {
    id: "l2",
    rule_id: "r4",
    rule_name: "Node Fleet Degraded",
    domain: "infrastructure",
    triggered_at: ago(4),
    condition_summary: "Nodes online (75%) < 80%",
    action_summary:
      "Notified: Node fleet health degraded — check Tailscale and node status",
    resolved: false,
  },
  {
    id: "l3",
    rule_id: "r3",
    rule_name: "Overdue Deadline Warning",
    domain: "work",
    triggered_at: ago(4),
    condition_summary: "Overdue deadlines (1) ≥ 1",
    action_summary:
      "Notified: Overdue work deadline detected — reprioritise tasks",
    resolved: false,
  },
  {
    id: "l4",
    rule_id: "r2",
    rule_name: "Poor Sleep → Recovery Mode",
    domain: "health",
    triggered_at: ago(36),
    condition_summary: "Sleep hours (5.4h) < 6h",
    action_summary:
      "Notified: Sleep deficit — consider lighter training & earlier sleep",
    resolved: true,
  },
  {
    id: "l5",
    rule_id: "r1",
    rule_name: "Budget Overage Alert",
    domain: "finances",
    triggered_at: daysAgo(3),
    condition_summary: "Budget spent (91%) > 90%",
    action_summary:
      "Flagged: Budget overage detected — review discretionary spend",
    resolved: true,
  },
  {
    id: "l6",
    rule_id: "r2",
    rule_name: "Poor Sleep → Recovery Mode",
    domain: "health",
    triggered_at: daysAgo(4),
    condition_summary: "Sleep hours (5.1h) < 6h",
    action_summary:
      "Notified: Sleep deficit — consider lighter training & earlier sleep",
    resolved: true,
  },
  {
    id: "l7",
    rule_id: "r1",
    rule_name: "Budget Overage Alert",
    domain: "finances",
    triggered_at: daysAgo(8),
    condition_summary: "Budget spent (93%) > 90%",
    action_summary:
      "Flagged: Budget overage detected — review discretionary spend",
    resolved: true,
  },
  {
    id: "l8",
    rule_id: "r2",
    rule_name: "Poor Sleep → Recovery Mode",
    domain: "health",
    triggered_at: daysAgo(9),
    condition_summary: "Sleep hours (4.9h) < 6h",
    action_summary:
      "Notified: Sleep deficit — consider lighter training & earlier sleep",
    resolved: true,
  },
];

const SIMULATED_DELAY = 150;
const delay = () => new Promise<void>((r) => setTimeout(r, SIMULATED_DELAY));

export async function getTriggerRules(): Promise<TriggerRule[]> {
  await delay();
  return [...mockRules];
}

export async function createTriggerRule(
  rule: Omit<
    TriggerRule,
    "id" | "created_at" | "last_triggered" | "trigger_count"
  >,
): Promise<TriggerRule> {
  await delay();
  const newRule: TriggerRule = {
    ...rule,
    id: `r${Date.now()}`,
    created_at: new Date().toISOString(),
    last_triggered: null,
    trigger_count: 0,
  };
  mockRules = [...mockRules, newRule];
  return newRule;
}

export async function updateTriggerRule(
  id: string,
  patch: Partial<TriggerRule>,
): Promise<void> {
  await delay();
  mockRules = mockRules.map((r) => (r.id === id ? { ...r, ...patch } : r));
}

export async function deleteTriggerRule(id: string): Promise<void> {
  await delay();
  mockRules = mockRules.filter((r) => r.id !== id);
}

export async function getTriggerLog(): Promise<TriggerLogEntry[]> {
  await delay();
  return [...mockLog].sort(
    (a, b) =>
      new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime(),
  );
}

export async function resolveTriggerLogEntry(id: string): Promise<void> {
  await delay();
  mockLog = mockLog.map((e) => (e.id === id ? { ...e, resolved: true } : e));
}
