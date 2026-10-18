import type { Project, ProjectRepository } from "@/lib/api/types.ts";

export type ProjectSystemNode =
  | {
      id: `project:${string}`;
      kind: "project";
      label: string;
      project: Project;
    }
  | {
      id: `repository:${string}`;
      kind: "repository";
      label: string;
      repository: ProjectRepository;
      project: Project | null;
    };

export interface ProjectSystemEdge {
  id: string;
  source: `project:${string}`;
  target: `repository:${string}`;
  kind: "owns_repository";
}

export interface ProjectSystemGraph {
  nodes: ProjectSystemNode[];
  edges: ProjectSystemEdge[];
}

/** Builds only relationships explicitly represented by backend foreign keys. */
export function buildProjectSystemGraph(
  projects: readonly Project[],
  repositories: readonly ProjectRepository[],
): ProjectSystemGraph {
  const projectsById = new Map(
    projects.map((project) => [project.id, project]),
  );
  const projectNodes = [...projects]
    .sort((left, right) =>
      left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
    )
    .map((project): ProjectSystemNode => ({
      id: `project:${project.id}`,
      kind: "project",
      label: project.name,
      project,
    }));
  const repositoryNodes = [...repositories]
    .sort((left, right) =>
      left.label.localeCompare(right.label, undefined, {
        sensitivity: "base",
      }),
    )
    .map((repository): ProjectSystemNode => ({
      id: `repository:${repository.id}`,
      kind: "repository",
      label: repository.label,
      repository,
      project: projectsById.get(repository.project_id) ?? null,
    }));
  const edges = repositories
    .filter((repository) => projectsById.has(repository.project_id))
    .map((repository): ProjectSystemEdge => ({
      id: `project:${repository.project_id}->repository:${repository.id}`,
      source: `project:${repository.project_id}`,
      target: `repository:${repository.id}`,
      kind: "owns_repository",
    }));

  return { nodes: [...projectNodes, ...repositoryNodes], edges };
}

export interface PositionedProjectSystemNode {
  node: ProjectSystemNode;
  x: number;
  y: number;
}

export interface ProjectSystemLayout {
  width: number;
  height: number;
  nodes: PositionedProjectSystemNode[];
}

/** Deterministic ownership layout: Projects form the primary column and their
 * repository leaves occupy the secondary column. */
export function layoutProjectSystemGraph(
  graph: ProjectSystemGraph,
): ProjectSystemLayout {
  const projectNodes = graph.nodes.filter((node) => node.kind === "project");
  const repositoryNodes = graph.nodes.filter(
    (node) => node.kind === "repository",
  );
  const positioned: PositionedProjectSystemNode[] = [];
  let cursorY = 64;

  for (const projectNode of projectNodes) {
    const repositories = repositoryNodes.filter(
      (node) => node.project?.id === projectNode.project.id,
    );
    const blockHeight = Math.max(144, repositories.length * 88 + 32);
    positioned.push({
      node: projectNode,
      x: 280,
      y: cursorY + blockHeight / 2,
    });
    repositories.forEach((repositoryNode, index) => {
      positioned.push({
        node: repositoryNode,
        x: 700,
        y: cursorY + 44 + index * 88,
      });
    });
    cursorY += blockHeight + 44;
  }

  const orphanRepositoryNodes = repositoryNodes.filter(
    (node) => node.project === null,
  );
  orphanRepositoryNodes.forEach((repositoryNode, index) => {
    positioned.push({
      node: repositoryNode,
      x: 700,
      y: cursorY + index * 88,
    });
  });

  return {
    width: 1000,
    height: Math.max(
      480,
      cursorY + Math.max(0, orphanRepositoryNodes.length - 1) * 88 + 96,
    ),
    nodes: positioned,
  };
}
