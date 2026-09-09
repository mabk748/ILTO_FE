import { afterEach, describe, expect, it, vi } from "vitest";
import { getDueCards } from "./learning.ts";
import type { SpacedRepetitionCard } from "./types.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("learning API due-card filtering", () => {
  it("excludes cards scheduled in the future", async () => {
    const cards = [
      { id: "due", next_review: "2020-01-01T00:00:00.000Z" },
      { id: "future", next_review: "2999-01-01T00:00:00.000Z" },
    ] as SpacedRepetitionCard[];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => cards }),
    );

    const result = await getDueCards();

    expect(result.map((card) => card.id)).toEqual(["due"]);
  });
});
