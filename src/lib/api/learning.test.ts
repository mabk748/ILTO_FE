import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createReadingEntry,
  createRoadmap,
  createSkill,
  deleteReadingEntry,
  deleteRoadmap,
  deleteSkill,
  getDueCards,
  getSkills,
  reviewCard,
  updateReadingEntry,
  updateRoadmap,
  updateSkill,
} from "./learning.ts";

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test/api/v1");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("learning backend adapter", () => {
  it("preserves the server's skill ordering", async () => {
    const skills = [
      { id: "skill-2", roadmap_id: "roadmap-1", name: "Zulu" },
      { id: "skill-1", roadmap_id: "roadmap-1", name: "alpha" },
    ];
    const fetchMock = vi.fn().mockResolvedValue(Response.json(skills));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getSkills()).resolves.toEqual(skills);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.example.test/api/v1/learning/skills",
    );
  });

  it("requests server-side due filtering", async () => {
    const cards = [{ id: "due", next_review: "2020-01-01T00:00:00Z" }];
    const fetchMock = vi.fn().mockResolvedValue(Response.json(cards));
    vi.stubGlobal("fetch", fetchMock);
    await expect(getDueCards()).resolves.toEqual(cards);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.example.test/api/v1/learning/sr-cards?due=true",
    );
  });
  it("posts reviews and returns the server's updated schedule", async () => {
    const card = {
      id: "card1",
      times_reviewed: 2,
      next_review: "2026-09-15T00:00:00Z",
    };
    const fetchMock = vi.fn().mockResolvedValue(Response.json(card));
    vi.stubGlobal("fetch", fetchMock);
    const review = { reviewed_at: "2026-09-09T00:00:00Z" };
    await expect(reviewCard("card1", review)).resolves.toEqual(card);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/api/v1/learning/sr-cards/card1/reviews",
      expect.objectContaining({ method: "POST", body: JSON.stringify(review) }),
    );
  });

  it("uses the roadmap CRUD paths with only caller-supplied writable payloads", async () => {
    const roadmap = { id: "roadmap-1", name: "Roadmap" };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json(roadmap))
      .mockResolvedValueOnce(Response.json(roadmap))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    await createRoadmap({
      name: "Roadmap",
      goal: "Learn",
      status: "active",
    });
    await updateRoadmap("road/map", { status: "paused" });
    await deleteRoadmap("road/map");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://api.example.test/api/v1/learning/roadmaps",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Roadmap",
          goal: "Learn",
          status: "active",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.example.test/api/v1/learning/roadmaps/road%2Fmap",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ status: "paused" }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "https://api.example.test/api/v1/learning/roadmaps/road%2Fmap",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("uses reading CRUD paths and preserves null and zero payload values", async () => {
    const entry = { id: "reading-1", pages_read: 0, completed_at: null };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json(entry))
      .mockResolvedValueOnce(Response.json(entry))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    await createReadingEntry({
      title: "Reading",
      author: "Author",
      pages_total: 100,
      pages_read: 0,
      words_per_minute: 250,
      started_at: "2026-09-17T10:00:00.000Z",
      completed_at: null,
      tags: [],
    });
    await updateReadingEntry("read/one", { completed_at: null });
    await deleteReadingEntry("read/one");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://api.example.test/api/v1/learning/reading",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"pages_read":0'),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.example.test/api/v1/learning/reading/read%2Fone",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ completed_at: null }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "https://api.example.test/api/v1/learning/reading/read%2Fone",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("uses exact skill CRUD paths and strips server-owned or unknown fields", async () => {
    const saved = {
      id: "skill-1",
      roadmap_id: "roadmap-1",
      name: "TypeScript",
      category: "Engineering",
      current_level: "beginner",
      target_level: "advanced",
      gap_score: 0,
      resources: ["https://example.test/course"],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json(saved, { status: 201 }))
      .mockResolvedValueOnce(Response.json(saved))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await createSkill({
      ...saved,
      created_at: "2026-09-20T00:00:00.000Z",
      user_id: "server-user",
      skills_total: 99,
      skills_completed: 98,
      unknown: "drop-me",
    } as unknown as Parameters<typeof createSkill>[0]);
    await updateSkill("skill/one", {
      roadmap_id: "roadmap-2",
      gap_score: 0,
      resources: [],
      id: "server-id",
      user_id: "server-user",
    } as unknown as Parameters<typeof updateSkill>[1]);
    await deleteSkill("skill/one");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://api.example.test/api/v1/learning/skills",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          roadmap_id: "roadmap-1",
          name: "TypeScript",
          category: "Engineering",
          current_level: "beginner",
          target_level: "advanced",
          gap_score: 0,
          resources: ["https://example.test/course"],
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.example.test/api/v1/learning/skills/skill%2Fone",
      expect.objectContaining({
        method: "PATCH",
        credentials: "include",
        body: JSON.stringify({
          roadmap_id: "roadmap-2",
          gap_score: 0,
          resources: [],
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "https://api.example.test/api/v1/learning/skills/skill%2Fone",
      expect.objectContaining({ method: "DELETE", credentials: "include" }),
    );
  });
});
