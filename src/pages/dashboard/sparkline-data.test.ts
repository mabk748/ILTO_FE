import { describe, expect, it } from "vitest";
import { hasTrendObservations, toSparklinePoints } from "./sparkline-data.ts";

describe("Dashboard trend data", () => {
  it("keeps server null gaps and never manufactures a commit point", () => {
    expect(toSparklinePoints([])).toEqual([]);
    expect(toSparklinePoints([null, 3, null])).toEqual([
      { v: null },
      { v: 3 },
      { v: null },
    ]);
    expect(hasTrendObservations([])).toBe(false);
    expect(hasTrendObservations([null, null])).toBe(false);
    expect(hasTrendObservations([null, 3])).toBe(true);
  });
});
