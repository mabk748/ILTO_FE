import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LearningPage from "./page.tsx";
import type { LearningRoadmap, SkillNode } from "@/lib/api/types.ts";

const fetchMock = vi.fn<typeof fetch>();

const roadmap: LearningRoadmap = {
  id: "roadmap-1",
  name: "Server roadmap",
  goal: "Verify derived counts",
  status: "active",
  created_at: "2026-09-20T00:00:00.000Z",
  skills_total: 0,
  skills_completed: 0,
};

const savedSkill: SkillNode = {
  id: "skill-1",
  roadmap_id: roadmap.id,
  name: "TypeScript",
  category: "Engineering",
  current_level: "advanced",
  target_level: "advanced",
  gap_score: 0,
  resources: [],
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

describe("Learning skill refresh", () => {
  it("uses refetched server roadmap counts after a confirmed skill create", async () => {
    let skillCreated = false;
    let roadmapReads = 0;
    let skillReads = 0;
    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.endsWith("/learning/roadmaps") && method === "GET") {
        roadmapReads += 1;
        return Response.json([
          skillCreated
            ? { ...roadmap, skills_total: 1, skills_completed: 1 }
            : roadmap,
        ]);
      }
      if (url.endsWith("/learning/skills") && method === "GET") {
        skillReads += 1;
        return Response.json(skillCreated ? [savedSkill] : []);
      }
      if (url.endsWith("/learning/skills") && method === "POST") {
        skillCreated = true;
        return Response.json(savedSkill, { status: 201 });
      }
      if (url.includes("/learning/sr-cards?due=true")) {
        return Response.json([]);
      }
      if (url.endsWith("/learning/reading")) return Response.json([]);
      throw new Error(`Unexpected request: ${method} ${url}`);
    });

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <LearningPage />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("0 / 0 skills")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Create skill for Server roadmap",
      }),
    );
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: savedSkill.name },
    });
    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: savedSkill.category },
    });
    fireEvent.change(screen.getByLabelText("Current level"), {
      target: { value: "advanced" },
    });
    fireEvent.change(screen.getByLabelText("Target level"), {
      target: { value: "advanced" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("1 / 1 skills")).toBeInTheDocument();
    await waitFor(() => {
      expect(roadmapReads).toBe(2);
      expect(skillReads).toBe(2);
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: /Server roadmap/,
        expanded: false,
      }),
    );
    expect(await screen.findByText("TypeScript")).toBeInTheDocument();
  });
});
