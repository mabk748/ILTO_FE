import {
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { Link } from "react-router-dom";
import {
  ExternalLink,
  FolderKanban,
  GitBranch,
  List,
  LocateFixed,
  Network,
  Plus,
  RefreshCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import LoadError from "@/components/LoadError.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  EmptyState,
  EmptyStateDescription,
  EmptyStateMedia,
  EmptyStateTitle,
} from "@/components/ui/empty-state.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";
import {
  githubRepositoryLinks,
  useAllProjectRepositories,
} from "../project-repositories.ts";
import {
  buildProjectSystemGraph,
  layoutProjectSystemGraph,
  type ProjectSystemNode,
} from "../project-system-graph.ts";
import type { ProjectsData } from "../projects-data.ts";

const clampZoom = (value: number) => Math.min(1.6, Math.max(0.5, value));

function NodeDetails({ node }: { node: ProjectSystemNode | null }) {
  if (!node) {
    return (
      <Card className="min-h-48 border-dashed bg-card/55">
        <CardHeader>
          <CardTitle>Select a node</CardTitle>
          <CardDescription>
            Choose a Project or repository to inspect its confirmed context.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (node.kind === "project") {
    return (
      <Card className="border-primary/25">
        <CardHeader>
          <Badge variant="default">Project</Badge>
          <CardTitle>{node.project.name}</CardTitle>
          <CardDescription className="whitespace-pre-wrap">
            {node.project.description || "No project description yet."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {node.project.status.replaceAll("_", " ")} · {node.project.priority}{" "}
            priority
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to={`/projects/${encodeURIComponent(node.project.id)}`}>
                Open Project
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link
                to={`/projects/${encodeURIComponent(node.project.id)}/explore?view=architecture`}
              >
                Repositories
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const links = githubRepositoryLinks(node.repository.repository_url);
  return (
    <Card className="border-info/25">
      <CardHeader>
        <Badge variant="info">Repository</Badge>
        <CardTitle>{node.repository.label}</CardTitle>
        <CardDescription className="break-all">
          {links?.display ?? node.repository.repository_url}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {node.project
            ? `Explicitly linked to ${node.project.name}`
            : "The referenced Project is unavailable."}
        </p>
        <div className="flex flex-wrap gap-2">
          {node.project && (
            <Button asChild>
              <Link to={`/projects/${encodeURIComponent(node.project.id)}`}>
                Open Project
              </Link>
            </Button>
          )}
          {links && (
            <Button asChild variant="outline">
              <a href={links.github} target="_blank" rel="noopener noreferrer">
                Open GitHub
                <ExternalLink />
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SystemList({
  graph,
  onSelect,
}: {
  graph: ReturnType<typeof buildProjectSystemGraph>;
  onSelect: (node: ProjectSystemNode) => void;
}) {
  const projects = graph.nodes.filter((node) => node.kind === "project");
  return (
    <div className="space-y-3" aria-label="Accessible Project system list">
      {projects.map((projectNode) => {
        const repositories = graph.nodes.filter(
          (node) =>
            node.kind === "repository" &&
            node.project?.id === projectNode.project.id,
        );
        return (
          <Card key={projectNode.id} className="gap-3 py-4">
            <CardHeader className="gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Badge variant="default">Project</Badge>
                  <CardTitle className="mt-2">{projectNode.label}</CardTitle>
                </div>
                <Button asChild size="sm">
                  <Link
                    to={`/projects/${encodeURIComponent(projectNode.project.id)}`}
                    onFocus={() => onSelect(projectNode)}
                  >
                    Open Project
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {repositories.length ? (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {repositories.map((repositoryNode) => (
                    <li key={repositoryNode.id}>
                      <button
                        type="button"
                        className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-border bg-background/40 px-3 py-2 text-left text-sm transition-colors hover:border-info/35 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        onClick={() => onSelect(repositoryNode)}
                      >
                        <GitBranch className="size-4 shrink-0 text-info" />
                        <span className="truncate">{repositoryNode.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No repositories are explicitly linked to this Project.
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function SystemCanvas({
  graph,
  selectedId,
  onSelect,
}: {
  graph: ReturnType<typeof buildProjectSystemGraph>;
  selectedId: string | null;
  onSelect: (node: ProjectSystemNode) => void;
}) {
  const layout = useMemo(() => layoutProjectSystemGraph(graph), [graph]);
  const positions = useMemo(
    () => new Map(layout.nodes.map((item) => [item.node.id, item])),
    [layout.nodes],
  );
  const [zoom, setZoom] = useState(0.8);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{
    pointerId: number;
    x: number;
    y: number;
    panX: number;
    panY: number;
  } | null>(null);

  const reset = () => {
    setZoom(0.8);
    setPan({ x: 0, y: 0 });
  };
  const startPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest("[data-system-node]")) return;
    drag.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const movePan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    setPan({
      x: drag.current.panX + event.clientX - drag.current.x,
      y: drag.current.panY + event.clientY - drag.current.y,
    });
  };
  const stopPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
  };
  const wheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    setZoom((current) => clampZoom(current + (event.deltaY < 0 ? 0.1 : -0.1)));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Drag the canvas to pan. Use controls or the mouse wheel to zoom.
        </p>
        <div
          className="flex items-center gap-1"
          role="group"
          aria-label="System View canvas controls"
        >
          <Button
            size="icon-sm"
            variant="outline"
            aria-label="Zoom out"
            disabled={zoom <= 0.5}
            onClick={() => setZoom((current) => clampZoom(current - 0.1))}
          >
            <ZoomOut />
          </Button>
          <span className="min-w-12 text-center font-mono text-xs text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            size="icon-sm"
            variant="outline"
            aria-label="Zoom in"
            disabled={zoom >= 1.6}
            onClick={() => setZoom((current) => clampZoom(current + 0.1))}
          >
            <ZoomIn />
          </Button>
          <Button
            size="icon-sm"
            variant="outline"
            aria-label="Reset canvas"
            onClick={reset}
          >
            <LocateFixed />
          </Button>
        </div>
      </div>
      <div
        data-testid="project-system-canvas"
        className="relative h-[31rem] w-full touch-none cursor-grab overflow-hidden rounded-xl border border-border bg-canvas shadow-inner active:cursor-grabbing"
        onPointerDown={startPan}
        onPointerMove={movePan}
        onPointerUp={stopPan}
        onPointerCancel={stopPan}
        onWheel={wheel}
      >
        <div
          className="absolute left-0 top-0 origin-top-left transition-transform duration-150 motion-reduce:transition-none"
          style={{
            width: layout.width,
            height: layout.height,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          <svg
            aria-hidden="true"
            className="absolute inset-0"
            width={layout.width}
            height={layout.height}
          >
            {graph.edges.map((edge) => {
              const source = positions.get(edge.source);
              const target = positions.get(edge.target);
              if (!source || !target) return null;
              return (
                <line
                  key={edge.id}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke="var(--primary)"
                  strokeOpacity="0.28"
                  strokeWidth="1.5"
                />
              );
            })}
          </svg>

          {layout.nodes.map(({ node, x, y }) => {
            const selected = node.id === selectedId;
            const isProject = node.kind === "project";
            return (
              <div
                key={node.id}
                data-system-node
                className={cn(
                  "absolute w-56 -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-surface/95 p-2 shadow-xl transition-[border-color,box-shadow]",
                  selected
                    ? "border-primary shadow-[0_0_0_1px_color-mix(in_srgb,var(--primary)_20%,transparent),0_18px_45px_-28px_var(--primary)]"
                    : "border-border",
                )}
                style={{ left: x, top: y }}
              >
                <button
                  type="button"
                  className="flex min-h-12 w-full items-center gap-3 rounded-lg px-2 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  aria-pressed={selected}
                  aria-label={`Select ${isProject ? "Project" : "repository"}: ${node.label}`}
                  onClick={() => onSelect(node)}
                >
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-lg border",
                      isProject
                        ? "border-primary/25 bg-primary/10 text-primary"
                        : "border-info/25 bg-info/10 text-info",
                    )}
                  >
                    {isProject ? <FolderKanban /> : <GitBranch />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[0.65rem] font-semibold tracking-wider text-muted-foreground uppercase">
                      {isProject ? "Project" : "Repository"}
                    </span>
                    <span className="block truncate text-sm font-semibold">
                      {node.label}
                    </span>
                  </span>
                </button>
                {isProject && (
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="mt-1 w-full"
                  >
                    <Link
                      to={`/projects/${encodeURIComponent(node.project.id)}`}
                    >
                      Open Project
                    </Link>
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ProjectSystemView({ data }: { data: ProjectsData }) {
  const repositories = useAllProjectRepositories(
    data.projects.map((project) => project.id),
  );
  const graph = useMemo(
    () => buildProjectSystemGraph(data.projects, repositories.data),
    [data.projects, repositories.data],
  );
  const [presentation, setPresentation] = useState<"canvas" | "list">("canvas");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedNode =
    graph.nodes.find((node) => node.id === selectedId) ?? null;

  if (data.projects.length === 0) {
    return (
      <EmptyState>
        <EmptyStateMedia>
          <Network />
        </EmptyStateMedia>
        <EmptyStateTitle>No Projects to map</EmptyStateTitle>
        <EmptyStateDescription>
          Create a Project before using System View. No topology is fabricated
          for an empty directory.
        </EmptyStateDescription>
      </EmptyState>
    );
  }
  if (repositories.error) {
    return (
      <LoadError
        error={repositories.error}
        title="Could not load Project repositories"
        onRetry={() => void repositories.refetch()}
      />
    );
  }
  if (repositories.isPending) {
    return (
      <div
        className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]"
        aria-label="Loading System View"
      >
        <Skeleton className="h-[31rem] w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  const connectedProjects = new Set(
    repositories.data.map((repository) => repository.project_id),
  );

  return (
    <section className="space-y-4" aria-labelledby="system-view-heading">
      <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-card/55 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2
            id="system-view-heading"
            className="flex items-center gap-2 font-semibold"
          >
            <Network className="size-5 text-primary" />
            Project topology
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Shows only persisted Project-to-Repository ownership. The backend
            does not yet expose Systems or Project-to-Project relationships.
          </p>
        </div>
        <div
          className="flex items-center gap-1"
          role="group"
          aria-label="System View presentation"
        >
          <Button
            size="sm"
            variant={presentation === "canvas" ? "secondary" : "ghost"}
            aria-pressed={presentation === "canvas"}
            onClick={() => setPresentation("canvas")}
          >
            <Network />
            Canvas
          </Button>
          <Button
            size="sm"
            variant={presentation === "list" ? "secondary" : "ghost"}
            aria-pressed={presentation === "list"}
            onClick={() => setPresentation("list")}
          >
            <List />
            List
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Refresh System View"
            disabled={repositories.isFetching}
            onClick={() => void repositories.refetch()}
          >
            <RefreshCw
              className={cn(repositories.isFetching && "animate-spin")}
            />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">{data.projects.length} Projects</Badge>
        <Badge variant="outline">{repositories.data.length} repositories</Badge>
        <Badge variant="outline">
          {data.projects.length - connectedProjects.size} unlinked Projects
        </Badge>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          {presentation === "canvas" ? (
            <SystemCanvas
              graph={graph}
              selectedId={selectedId}
              onSelect={(node) => setSelectedId(node.id)}
            />
          ) : (
            <SystemList
              graph={graph}
              onSelect={(node) => setSelectedId(node.id)}
            />
          )}
        </div>
        <aside aria-label="Selected system node">
          <NodeDetails node={selectedNode} />
        </aside>
      </div>

      {repositories.data.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          Every Project is currently unlinked. Add repositories from each
          Project&apos;s Architecture view; no relationship lines are inferred.
        </div>
      )}
      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Plus className="mt-0.5 size-3.5 shrink-0" />
        System nodes and relationships between Projects require a future
        persisted backend contract.
      </p>
    </section>
  );
}
