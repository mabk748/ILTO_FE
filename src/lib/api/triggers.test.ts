import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createTriggerRule,
  deleteTriggerRule,
  getTriggerLog,
  getTriggerRules,
  resolveTriggerLogEntry,
  updateTriggerRule,
} from "./triggers.ts";

const fetchMock = vi.fn<typeof fetch>();
const ruleInput = {
  name: "Disposable stored rule",
  description: "Frontend test only",
  enabled: false,
  condition: {
    domain: "finances" as const,
    metric: "budget_pct",
    operator: ">" as const,
    threshold: 0,
    unit: "%",
  },
  action: {
    type: "flag" as const,
    message: "Review budget",
    target_domain: null,
  },
};

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test/api/v1");
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Trigger backend adapter", () => {
  it("keeps rules and audit logs as credentialed plain arrays", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(Response.json([])));
    await expect(
      Promise.all([getTriggerRules(), getTriggerLog()]),
    ).resolves.toEqual([[], []]);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://api.example.test/api/v1/triggers/rules",
      "https://api.example.test/api/v1/triggers/log",
    ]);
  });

  it("sends nested writable rule fields, deletion, and strict log resolution", async () => {
    fetchMock
      .mockResolvedValueOnce(
        Response.json({ id: "rule-1", ...ruleInput }, { status: 201 }),
      )
      .mockResolvedValueOnce(Response.json({ id: "rule-1", ...ruleInput }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ id: "log-1", resolved: true }));
    await createTriggerRule(ruleInput);
    await updateTriggerRule("rule/1", ruleInput);
    await deleteTriggerRule("rule/1");
    await resolveTriggerLogEntry("log/1");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual(
      ruleInput,
    );
    expect(fetchMock.mock.calls[1][0]).toContain("rules/rule%2F1");
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual(
      ruleInput,
    );
    expect(fetchMock.mock.calls[2][1]?.method).toBe("DELETE");
    expect(JSON.parse(String(fetchMock.mock.calls[3][1]?.body))).toEqual({
      resolved: true,
    });
  });
});
