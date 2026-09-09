/**
 * Intelligence API — cross-domain correlation data for charts
 */

import type { ISODateString } from "./types.ts";
import { mockHealthMetrics } from "./mock/health.mock.ts";
import { mockNetWorth } from "./mock/finances.mock.ts";

const SIMULATED_DELAY = 150;
const delay = () => new Promise<void>((r) => setTimeout(r, SIMULATED_DELAY));

export interface CorrelationPoint {
  date: ISODateString;
  label: string; // formatted date for axis
  [key: string]: number | string;
}

// Sleep vs commits (health × infra)
export async function getSleepVsCommits(): Promise<CorrelationPoint[]> {
  await delay();
  const commits = [
    3, 5, 2, 8, 6, 4, 1, 7, 5, 3, 6, 4, 2, 9, 5, 3, 7, 4, 6, 2, 8, 5, 3, 7, 4,
    6, 2, 9, 5, 4,
  ];
  return mockHealthMetrics.map((m, i) => ({
    date: m.date,
    label: new Date(m.date).toLocaleDateString("en-GB", {
      month: "short",
      day: "numeric",
    }),
    sleep: Number((m.sleep_hours ?? 0).toFixed(1)),
    commits: commits[i] ?? 4,
  }));
}

// Budget spent % vs task completion velocity (finances × projects)
export async function getBudgetVsVelocity(): Promise<CorrelationPoint[]> {
  await delay();
  const budgetPercentages = [62, 66, 65, 71, 74, 78, 82, 86];
  const velocities = [30, 29, 31, 27, 26, 24, 25, 22];
  const currentWeek = new Date();
  currentWeek.setUTCHours(0, 0, 0, 0);

  return budgetPercentages.map((budgetPercentage, index) => {
    const weeksAgo = budgetPercentages.length - index - 1;
    return {
      date: new Date(
        currentWeek.getTime() - weeksAgo * 7 * 86400000,
      ).toISOString(),
      label: weeksAgo === 0 ? "Current" : `W-${weeksAgo}`,
      budget_pct: budgetPercentage,
      velocity: velocities[index],
    };
  });
}

// HRV vs workout intensity (health internal)
export async function getHrvVsRpe(): Promise<CorrelationPoint[]> {
  await delay();
  const rpeValues = [
    7, 8, 4, 0, 7, 8, 4, 0, 7, 8, 4, 0, 7, 8, 4, 0, 7, 8, 4, 0, 7, 8, 4, 0, 7,
    8, 4, 0, 7, 8,
  ];
  return mockHealthMetrics.map((m, i) => ({
    date: m.date,
    label: new Date(m.date).toLocaleDateString("en-GB", {
      month: "short",
      day: "numeric",
    }),
    hrv: m.hrv ?? 50,
    rpe: rpeValues[i] ?? 5,
  }));
}

// Net worth trend (finances)
export async function getNetWorthTrend(): Promise<CorrelationPoint[]> {
  await delay();
  return mockNetWorth.map((n) => ({
    date: n.date,
    label: new Date(n.date).toLocaleDateString("en-GB", { month: "short" }),
    net_worth: n.net_worth,
    assets: n.total_assets,
    liabilities: n.total_liabilities,
  }));
}

// Sleep trend sparkline data (last 14 days)
export async function getSleepTrend(): Promise<number[]> {
  await delay();
  return mockHealthMetrics
    .slice(-14)
    .map((m) => Number((m.sleep_hours ?? 0).toFixed(1)));
}

// Commits trend sparkline data (last 14 days)
export async function getCommitsTrend(): Promise<number[]> {
  await delay();
  return [3, 5, 2, 8, 6, 4, 1, 7, 5, 3, 6, 4, 2, 9];
}
