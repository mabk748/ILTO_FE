import * as api from "@/lib/api/triggers.ts";
import { ApiError } from "@/lib/api/errors.ts";
import type { DomainName } from "@/lib/api/types.ts";
import type {
  TriggerActionType,
  TriggerOperator,
  TriggerRule,
} from "@/lib/api/triggers.ts";

export const triggerDomains = [
  "projects",
  "infrastructure",
  "health",
  "finances",
  "learning",
  "work",
  "social",
  "logistics",
  "appearance",
] as const satisfies readonly DomainName[];

export const triggerOperators = [
  ">",
  ">=",
  "<",
  "<=",
  "==",
  "!=",
] as const satisfies readonly TriggerOperator[];
export const triggerActionTypes = [
  "notify",
  "log",
  "pause_spend",
  "flag",
] as const satisfies readonly TriggerActionType[];

export type TriggerTarget = { record?: TriggerRule };
export type TriggerDraft = Record<string, string | boolean>;

function choice<T extends string>(
  value: string,
  options: readonly T[],
  label: string,
): T {
  if (!options.includes(value as T))
    throw new Error(`Choose a valid ${label}.`);
  return value as T;
}

function requiredText(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${label} is required.`);
  return trimmed;
}

function number(value: string, label: string): number {
  if (!value.trim()) throw new Error(`${label} is required.`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed))
    throw new Error(`${label} must be a finite number.`);
  return parsed;
}

export function initialTriggerDraft(target: TriggerTarget): TriggerDraft {
  const rule = target.record;
  return {
    name: rule?.name ?? "",
    description: rule?.description ?? "",
    enabled: rule?.enabled ?? true,
    domain: rule?.condition.domain ?? "finances",
    metric: rule?.condition.metric ?? "budget_pct",
    operator: rule?.condition.operator ?? ">",
    threshold: rule?.condition.threshold.toString() ?? "90",
    unit: rule?.condition.unit ?? "%",
    action_type: rule?.action.type ?? "notify",
    action_message: rule?.action.message ?? "",
    target_domain: rule?.action.target_domain ?? "",
  };
}

export function buildTriggerRuleInput(
  values: TriggerDraft,
): api.CreateTriggerRuleInput {
  const targetDomain = String(values.target_domain).trim();
  return {
    name: requiredText(String(values.name), "Rule name"),
    description: String(values.description).trim(),
    enabled: values.enabled === true,
    condition: {
      domain: choice(String(values.domain), triggerDomains, "condition domain"),
      metric: requiredText(String(values.metric), "Metric"),
      operator: choice(
        String(values.operator),
        triggerOperators,
        "condition operator",
      ),
      threshold: number(String(values.threshold), "Threshold"),
      unit: requiredText(String(values.unit), "Unit"),
    },
    action: {
      type: choice(
        String(values.action_type),
        triggerActionTypes,
        "action type",
      ),
      message: requiredText(String(values.action_message), "Action message"),
      target_domain: targetDomain
        ? choice(targetDomain, triggerDomains, "action target domain")
        : null,
    },
  };
}

export async function saveTriggerRule(
  target: TriggerTarget,
  values: TriggerDraft,
) {
  const input = buildTriggerRuleInput(values);
  return target.record
    ? api.updateTriggerRule(target.record.id, input)
    : api.createTriggerRule(input);
}

export function deleteTriggerRule(target: TriggerTarget): Promise<void> {
  if (!target.record) throw new Error("Select a saved rule first.");
  return api.deleteTriggerRule(target.record.id);
}

export function triggerWriteError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return "This trigger rule or log entry no longer exists. Refresh and try again.";
    }
    if (error.status === 409) {
      return "The backend rejected this change because related trigger data conflicts.";
    }
    if (error.status === 422) {
      return "The backend rejected these rule values. Check the nested condition and action fields.";
    }
    if (
      error.status === 503 ||
      error.code === "network" ||
      error.code === "timeout"
    ) {
      return "The backend could not confirm this trigger change. Refresh and check the saved state before retrying.";
    }
  }
  return error instanceof Error
    ? error.message
    : "Could not save the trigger rule.";
}
