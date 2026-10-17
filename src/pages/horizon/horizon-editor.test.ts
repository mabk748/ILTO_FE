import { describe, expect, it } from "vitest";
import type { HorizonEntry } from "@/lib/api/types.ts";
import {
  buildHorizonInput,
  changedHorizonFields,
  horizonDraft,
} from "./horizon-editor.ts";

const entry: HorizonEntry = {
  id: "entry-1",
  title: "Planning",
  starts_at: "2026-10-01T08:00:00.000Z",
  ends_at: "2026-10-01T09:00:00.000Z",
  all_day: false,
  source_domain: "horizon",
  source_type: "item",
  source_id: "item-1",
  horizon_owned: true,
  detail: "Weekly planning",
  status: null,
};

describe("Horizon editor", () => {
  it("converts local date-time values to UTC and preserves nullable end", () => {
    expect(
      buildHorizonInput(
        {
          title: " Planning ",
          starts_at: "2026-10-01T09:00",
          ends_at: "",
          all_day: false,
          description: "",
        },
        "Europe/Paris",
      ),
    ).toEqual({
      title: "Planning",
      starts_at: "2026-10-01T07:00:00.000Z",
      ends_at: null,
      all_day: false,
      description: null,
    });
  });

  it("converts an all-day calendar date at midnight in the configured zone", () => {
    expect(
      buildHorizonInput(
        {
          title: "Holiday",
          starts_at: "2026-10-01",
          ends_at: "2026-10-02",
          all_day: true,
          description: "Away",
        },
        "Africa/Casablanca",
      ),
    ).toEqual({
      title: "Holiday",
      starts_at: "2026-09-30T23:00:00.000Z",
      ends_at: "2026-10-01T23:00:00.000Z",
      all_day: true,
      description: "Away",
    });
  });

  it("omits unchanged PATCH fields while preserving an explicit nullable clear", () => {
    const draft = horizonDraft(entry, "UTC");
    const unchanged = buildHorizonInput(draft, "UTC");
    expect(changedHorizonFields(unchanged, entry)).toEqual({});
    expect(
      changedHorizonFields({ ...unchanged, ends_at: null }, entry),
    ).toEqual({ ends_at: null });
  });

  it("rejects an end before the start", () => {
    expect(() =>
      buildHorizonInput(
        {
          title: "Invalid",
          starts_at: "2026-10-02T10:00",
          ends_at: "2026-10-02T09:00",
          all_day: false,
          description: "",
        },
        "UTC",
      ),
    ).toThrow(/End cannot be before start/);
  });
});
