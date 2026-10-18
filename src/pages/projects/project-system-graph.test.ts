import { describe, expect, it } from "vitest";
import type { ProjectRepository } from "@/lib/api/types.ts";
import { project } from "./__tests__/fixtures.ts";
import {
  buildProjectSystemGraph,
  layoutProjectSystemGraph,
} from "./project-system-graph.ts";

const repository = (
  id: string,
  projectId: string,
  label: string,
): ProjectRepository => ({
  id,
  project_id: projectId,
  label,
  provider: "github",
  repository_url: `https://github.com/example/${id}`,
  created_at: "2026-10-17T10:00:00Z",
  updated_at: "2026-10-17T10:00:00Z",
});

describe("Project System graph", () => {
  it("creates only explicit Project-to-Repository ownership edges", () => {
    const projects = [
      { ...project, id: "p1", name: "Alpha" },
      { ...project, id: "p2", name: "Beta" },
    ];
    const graph = buildProjectSystemGraph(projects, [
      repository("r1", "p1", "Frontend"),
      repository("r2", "p1", "Backend"),
      repository("orphan", "missing", "Orphan"),
    ]);

    expect(graph.nodes).toHaveLength(5);
    expect(graph.edges).toEqual([
      {
        id: "project:p1->repository:r1",
        source: "project:p1",
        target: "repository:r1",
        kind: "owns_repository",
      },
      {
        id: "project:p1->repository:r2",
        source: "project:p1",
        target: "repository:r2",
        kind: "owns_repository",
      },
    ]);
    expect(
      graph.edges.some(
        (edge) =>
          edge.source.startsWith("project:p2") &&
          edge.target.startsWith("project:"),
      ),
    ).toBe(false);
    expect(graph.nodes.some((node) => node.id.startsWith("system:"))).toBe(
      false,
    );
  });

  it("places every represented node inside a deterministic positive canvas", () => {
    const graph = buildProjectSystemGraph(
      [{ ...project, id: "p1", name: "Alpha" }],
      [repository("r1", "p1", "Frontend")],
    );
    const first = layoutProjectSystemGraph(graph);
    const second = layoutProjectSystemGraph(graph);

    expect(first).toEqual(second);
    expect(first.nodes).toHaveLength(graph.nodes.length);
    expect(first.width).toBeGreaterThan(0);
    expect(first.height).toBeGreaterThan(0);
    expect(first.nodes.every((node) => node.x > 0 && node.y > 0)).toBe(true);
  });
});
