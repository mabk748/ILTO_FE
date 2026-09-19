import { getArray } from "./resource.ts";
import { apiClient, type ApiRequestOptions } from "./client.ts";
import { encodeId } from "./resource.ts";
/** Trigger rules and log records are owned and evaluated by the backend. */

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
  target_domain: DomainName | null;
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

export type CreateTriggerRuleInput = Omit<
  TriggerRule,
  "id" | "created_at" | "last_triggered" | "trigger_count"
>;
export type UpdateTriggerRuleInput = Partial<CreateTriggerRuleInput>;

export function getTriggerRules(
  options: ApiRequestOptions = {},
): Promise<TriggerRule[]> {
  return getArray<TriggerRule>("/triggers/rules", options);
}
export function createTriggerRule(
  input: CreateTriggerRuleInput,
  options: ApiRequestOptions = {},
): Promise<TriggerRule> {
  return apiClient.post<TriggerRule>("/triggers/rules", input, options);
}
export function updateTriggerRule(
  id: string,
  input: UpdateTriggerRuleInput,
  options: ApiRequestOptions = {},
): Promise<TriggerRule> {
  return apiClient.patch<TriggerRule>(
    `/triggers/rules/${encodeId(id)}`,
    input,
    options,
  );
}
export function deleteTriggerRule(
  id: string,
  options: ApiRequestOptions = {},
): Promise<void> {
  return apiClient.delete(`/triggers/rules/${encodeId(id)}`, options);
}
export function getTriggerLog(
  options: ApiRequestOptions = {},
): Promise<TriggerLogEntry[]> {
  return getArray<TriggerLogEntry>("/triggers/log", options);
}
export function resolveTriggerLogEntry(
  id: string,
  options: ApiRequestOptions = {},
): Promise<TriggerLogEntry> {
  return apiClient.patch<TriggerLogEntry>(
    `/triggers/log/${encodeId(id)}`,
    { resolved: true },
    options,
  );
}
