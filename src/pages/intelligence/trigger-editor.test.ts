import { describe, expect, it } from "vitest";
import type { TriggerRule } from "@/lib/api/triggers.ts";
import {
  buildTriggerRuleInput,
  initialTriggerDraft,
  triggerWriteError,
} from "./trigger-editor.ts";
import { ApiError } from "@/lib/api/errors.ts";

const rule: TriggerRule = {
  id: "rule-1",
  name: "Existing rule",
  description: "Stored description",
  enabled: true,
  condition: {
    domain: "finances",
    metric: "budget_pct",
    operator: ">",
    threshold: 90,
    unit: "%",
  },
  action: {
    type: "notify",
    message: "Review spend",
    target_domain: "finances",
  },
  created_at: "2026-09-19T10:00:00.000Z",
  last_triggered: null,
  trigger_count: 2,
};

describe("Trigger rule editor contract", () => {
  it("sends nested writable fields while preserving false, zero, and null", () => {
    const input = buildTriggerRuleInput({
      name: "Disposable rule",
      description: "",
      enabled: false,
      domain: "finances",
      metric: "budget_pct",
      operator: ">=",
      threshold: "0",
      unit: "%",
      action_type: "flag",
      action_message: "Review now",
      target_domain: "",
    });
    expect(input).toEqual({
      name: "Disposable rule",
      description: "",
      enabled: false,
      condition: {
        domain: "finances",
        metric: "budget_pct",
        operator: ">=",
        threshold: 0,
        unit: "%",
      },
      action: {
        type: "flag",
        message: "Review now",
        target_domain: null,
      },
    });
    expect(input).not.toHaveProperty("id");
    expect(input).not.toHaveProperty("created_at");
    expect(input).not.toHaveProperty("last_triggered");
    expect(input).not.toHaveProperty("trigger_count");
  });

  it("loads existing values and exposes backend validation failures", () => {
    expect(initialTriggerDraft({ record: rule })).toMatchObject({
      enabled: true,
      threshold: "90",
      target_domain: "finances",
    });
    expect(() =>
      buildTriggerRuleInput({
        ...initialTriggerDraft({ record: rule }),
        threshold: "not-a-number",
      }),
    ).toThrow("Threshold must be a finite number");
    expect(
      triggerWriteError(new ApiError("Invalid", "http", { status: 422 })),
    ).toContain("nested condition and action");
  });
});
