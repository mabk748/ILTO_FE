import { describe, expect, it } from "vitest";
import type {
  BudgetCategory,
  Contact,
  InfraNode,
  SpacedRepetitionCard,
  Task,
  WorkDeadline,
} from "@/lib/api/types.ts";
import {
  financesScore,
  healthScore,
  infraScore,
  learningScore,
  projectsScore,
  socialScore,
  systemScore,
  workScore,
} from "./dashboard-scores.ts";

describe("Dashboard scores", () => {
  it("uses null when a domain has no observations", () => {
    expect(projectsScore([], [])).toBeNull();
    expect(infraScore([])).toBeNull();
    expect(healthScore([])).toBeNull();
    expect(financesScore([])).toBeNull();
    expect(learningScore([], [])).toBeNull();
    expect(workScore([])).toBeNull();
    expect(socialScore([])).toBeNull();
  });

  it("treats a zero budget denominator as no data", () => {
    expect(
      financesScore([
        {
          monthly_limit: 0,
          spent_this_month: 0,
        } as BudgetCategory,
      ]),
    ).toBeNull();
  });

  it("preserves calculated zero scores instead of treating zero as missing", () => {
    expect(projectsScore([{ status: "todo" } as Task], [])).toBe(0);
    expect(infraScore([{ status: "offline" } as InfraNode])).toBe(0);
    expect(socialScore([{ status: "dormant" } as Contact])).toBe(0);
  });

  it("awards learning and work scores only when source records exist", () => {
    expect(learningScore([], [{} as SpacedRepetitionCard])).toBe(100);
    expect(workScore([{ status: "pending" } as WorkDeadline])).toBe(100);
  });

  it("requires every constituent score before calculating System", () => {
    expect(systemScore(null, 100, 100)).toBeNull();
    expect(systemScore(0, 100, 100)).toBe(67);
  });
});
