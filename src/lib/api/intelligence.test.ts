import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getBudgetVsVelocity,
  getCommitsTrend,
  getHrvVsRpe,
  getNetWorthTrend,
  getSleepTrend,
  getSleepVsCommits,
} from "./intelligence.ts";

const fetchMock = vi.fn<typeof fetch>();

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

describe("Intelligence backend adapter", () => {
  it("uses credentialed plain-array reads for every stored Intelligence series", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(Response.json([])));
    await expect(
      Promise.all([
        getSleepVsCommits(),
        getBudgetVsVelocity(),
        getHrvVsRpe(),
        getNetWorthTrend(),
        getSleepTrend(),
        getCommitsTrend(),
      ]),
    ).resolves.toEqual([[], [], [], [], [], []]);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://api.example.test/api/v1/intelligence/sleep-vs-commits",
      "https://api.example.test/api/v1/intelligence/budget-vs-velocity",
      "https://api.example.test/api/v1/intelligence/hrv-vs-rpe",
      "https://api.example.test/api/v1/intelligence/net-worth",
      "https://api.example.test/api/v1/intelligence/sleep-trend",
      "https://api.example.test/api/v1/intelligence/commits-trend",
    ]);
    expect(
      fetchMock.mock.calls.every(
        ([, options]) => options?.credentials === "include",
      ),
    ).toBe(true);
  });

  it("preserves null trend gaps and accepts an honestly empty commit history", async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json([null, 7.5, null]))
      .mockResolvedValueOnce(Response.json([]));
    await expect(getSleepTrend()).resolves.toEqual([null, 7.5, null]);
    await expect(getCommitsTrend()).resolves.toEqual([]);
  });
});
