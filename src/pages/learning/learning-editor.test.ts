import { describe, expect, it } from "vitest";
import type {
  LearningRoadmap,
  ReadingEntry,
  SkillNode,
} from "@/lib/api/types.ts";
import { ApiError } from "@/lib/api/errors.ts";
import {
  buildLearningInput,
  changedFields,
  learningWriteError,
  toLocalDateTimeValue,
} from "./learning-editor.ts";

const roadmap: LearningRoadmap = {
  id: "roadmap-1",
  name: "Existing roadmap",
  goal: "Learn testing",
  status: "active",
  created_at: "2026-09-01T00:00:00.000Z",
  skills_total: 10,
  skills_completed: 2,
};

const entry: ReadingEntry = {
  id: "reading-1",
  title: "Existing book",
  author: "Author",
  pages_total: 200,
  pages_read: 0,
  words_per_minute: 250,
  started_at: "2026-09-15T10:00:00.000Z",
  completed_at: "2026-09-16T10:00:00.000Z",
  tags: ["frontend", "testing"],
};

const secondRoadmap: LearningRoadmap = {
  ...roadmap,
  id: "roadmap-2",
  name: "Second roadmap",
};

const skill: SkillNode = {
  id: "skill-1",
  roadmap_id: roadmap.id,
  name: "TypeScript",
  category: "Engineering",
  current_level: "beginner",
  target_level: "advanced",
  gap_score: 0,
  resources: ["https://example.test/course", "Practice project"],
};

describe("Learning editor contract", () => {
  it("sends only writable roadmap fields", () => {
    const input = buildLearningInput(
      { kind: "roadmap", record: roadmap },
      { name: "Disposable roadmap", goal: "Verify API", status: "paused" },
    );
    expect(input).toEqual({
      name: "Disposable roadmap",
      goal: "Verify API",
      status: "paused",
    });
    expect(input).not.toHaveProperty("id");
    expect(input).not.toHaveProperty("created_at");
    expect(input).not.toHaveProperty("skills_total");
    expect(input).not.toHaveProperty("skills_completed");
  });

  it("converts reading timestamps, preserves zero pages read, and sends an explicit completion clear", () => {
    const input = buildLearningInput(
      { kind: "reading", record: entry },
      {
        title: "Disposable reading",
        author: "Author",
        pages_total: "200",
        pages_read: "0",
        words_per_minute: "250",
        started_at: "2026-09-16T12:00",
        completed_at: "",
        tags: "frontend, testing",
      },
    );
    expect(input).toMatchObject({
      pages_read: 0,
      completed_at: null,
      started_at: expect.stringMatching(/Z$/),
      tags: ["frontend", "testing"],
    });
    expect(input).not.toHaveProperty("id");
    expect(toLocalDateTimeValue(entry.started_at)).toMatch(/^2026-09-15T/);
  });

  it("builds an exact skill body with zero gap score and resource arrays", () => {
    const input = buildLearningInput(
      {
        kind: "skill",
        record: {
          ...skill,
          created_at: "2026-09-20T00:00:00.000Z",
          user_id: "server-user",
          skills_total: 8,
          skills_completed: 7,
        } as SkillNode,
      },
      {
        roadmap_id: roadmap.id,
        name: " TypeScript ",
        category: " Engineering ",
        current_level: "beginner",
        target_level: "advanced",
        gap_score: "0",
        resources: "https://example.test/course\n\nPractice project",
      },
      [roadmap, secondRoadmap],
    );
    expect(input).toEqual({
      roadmap_id: roadmap.id,
      name: "TypeScript",
      category: "Engineering",
      current_level: "beginner",
      target_level: "advanced",
      gap_score: 0,
      resources: ["https://example.test/course", "Practice project"],
    });
    for (const field of [
      "id",
      "created_at",
      "user_id",
      "skills_total",
      "skills_completed",
    ]) {
      expect(input).not.toHaveProperty(field);
    }
  });

  it("creates partial skill PATCH bodies, including a roadmap move", () => {
    const moved = {
      roadmap_id: secondRoadmap.id,
      name: skill.name,
      category: skill.category,
      current_level: skill.current_level,
      target_level: skill.target_level,
      gap_score: skill.gap_score,
      resources: skill.resources,
    };
    expect(changedFields(moved, skill)).toEqual({
      roadmap_id: secondRoadmap.id,
    });
    expect(
      changedFields({ ...moved, roadmap_id: skill.roadmap_id }, skill),
    ).toEqual({});
  });

  it("rejects unknown roadmaps, invalid scores, and oversized resource arrays", () => {
    const values = {
      roadmap_id: "other-user-roadmap",
      name: "Skill",
      category: "Category",
      current_level: "beginner",
      target_level: "expert",
      gap_score: "0",
      resources: "",
    };
    expect(() =>
      buildLearningInput({ kind: "skill" }, values, [roadmap]),
    ).toThrow(/current signed-in user/);
    expect(() =>
      buildLearningInput(
        { kind: "skill" },
        { ...values, roadmap_id: roadmap.id, gap_score: "101" },
        [roadmap],
      ),
    ).toThrow(/0 through 100/);
    expect(() =>
      buildLearningInput(
        { kind: "skill" },
        {
          ...values,
          roadmap_id: roadmap.id,
          resources: Array.from({ length: 51 }, (_, index) => `r${index}`).join(
            "\n",
          ),
        },
        [roadmap],
      ),
    ).toThrow(/at most 50/);
  });

  it("omits no-op PATCH fields but retains explicit null clears", () => {
    const unchanged = {
      title: entry.title,
      author: entry.author,
      pages_total: entry.pages_total,
      pages_read: entry.pages_read,
      words_per_minute: entry.words_per_minute,
      started_at: entry.started_at,
      completed_at: entry.completed_at,
      tags: entry.tags,
    };
    expect(changedFields(unchanged, entry)).toEqual({});
    expect(changedFields({ completed_at: null, pages_read: 0 }, entry)).toEqual(
      { completed_at: null },
    );
    expect(
      changedFields(
        { started_at: "2026-09-15T10:00:00.000Z" },
        { started_at: "2026-09-15T11:00:00+01:00" },
      ),
    ).toEqual({});
  });

  it.each([404, 409, 422, 503])(
    "maps HTTP %s without claiming a Learning write succeeded",
    (status) => {
      expect(
        learningWriteError(new ApiError("backend", "http", { status })),
      ).toMatch(/record|conflict|rejected|confirm/);
    },
  );
});
