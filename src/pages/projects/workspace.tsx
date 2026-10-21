import { useEffect, useRef } from "react";
import {
  Link,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useOutletContext,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  Compass,
  Crosshair,
  Layers3,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import FocusNow from "./_components/FocusNow.tsx";
import ProjectNext from "./_components/ProjectNext.tsx";
import ProjectOverview from "./_components/ProjectOverview.tsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.tsx";
import LoadError from "@/components/LoadError.tsx";
import type { Project } from "@/lib/api/types.ts";
import { ProjectScopeContext } from "./project-scope.ts";
import {
  scopeProjectsData,
  useProjectsData,
  type ProjectsData,
} from "./projects-data.ts";
import ResourceControls from "./_components/ResourceControls.tsx";
import KanbanBoard from "./_components/KanbanBoard.tsx";
import SprintList from "./_components/SprintList.tsx";
import MilestoneList from "./_components/MilestoneList.tsx";
import GanttChart from "./_components/GanttChart.tsx";
import ArchitectureView from "./_components/ArchitectureView.tsx";
import WorkstreamPanel from "./_components/WorkstreamPanel.tsx";
import "./workspace.css";

const EXPLORE_VIEWS = [
  "overview",
  "board",
  "sprints",
  "milestones",
  "gantt",
  "architecture",
] as const;
type WorkspaceContext = { project: Project; data: ProjectsData };
const useWorkspace = () => useOutletContext<WorkspaceContext>();
const projectPath = (id: string) => `/projects/${encodeURIComponent(id)}`;
const readable = (value: string) => value.replaceAll("_", " ");
const WORKSPACE_AREAS = [
  {
    id: "now",
    label: "NOW",
    description: "Execute",
    icon: Crosshair,
  },
  {
    id: "next",
    label: "NEXT",
    description: "Sequence",
    icon: Layers3,
  },
  {
    id: "explore",
    label: "EXPLORE",
    description: "Understand",
    icon: Compass,
  },
] as const;

function projectStatusVariant(status: Project["status"]) {
  if (status === "active" || status === "completed") return "success";
  if (status === "on_hold") return "warning";
  return "outline";
}

/** Mounted under the existing owner guard and app shell. */
export default function ProjectWorkspace() {
  return (
    <Routes>
      <Route element={<WorkspaceLayout />}>
        <Route index element={<WorkspaceIndex />} />
        <Route path="now" element={<Now />} />
        <Route path="next" element={<Next />} />
        <Route path="explore" element={<Explore />} />
        <Route
          path="*"
          element={
            <p role="alert">
              Workspace page not found. Choose NOW, NEXT or EXPLORE.
            </p>
          }
        />
      </Route>
    </Routes>
  );
}

function WorkspaceIndex() {
  const { search } = useLocation();
  return <Navigate to={`now${search}`} replace />;
}

function WorkspaceLayout() {
  const { projectId = "" } = useParams();
  const query = useProjectsData();
  const location = useLocation();
  const heading = useRef<HTMLHeadingElement>(null);
  const project = query.data?.projects.find((item) => item.id === projectId);
  useEffect(() => {
    // Route changes move keyboard focus to the new context, not on every filter edit.
    heading.current?.focus();
  }, [location.pathname, project?.id]);

  return (
    <div className="project-workspace mx-auto min-w-0 max-w-[92rem] space-y-5 p-4 pb-24 md:p-6 md:pb-8">
      <Link
        className="inline-flex min-h-10 items-center gap-2 rounded-md px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        to="/projects"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Projects
      </Link>
      {query.error && !query.data ? (
        <LoadError
          error={query.error}
          title="Could not load project workspace"
          onRetry={() => void query.refetch()}
        />
      ) : query.isPending ? (
        <p role="status">Loading project workspace…</p>
      ) : !project ? (
        <section className="space-y-2 rounded-lg border p-5">
          <h1 className="text-xl font-semibold">Project unavailable</h1>
          <p role="alert">
            This Project does not exist or has been deleted. No other Project
            has been selected.
          </p>
        </section>
      ) : (
        <ProjectScopeContext.Provider value={project.id} key={project.id}>
          {query.error && (
            <LoadError
              error={query.error}
              title="Project refresh failed; showing last loaded context"
              onRetry={() => void query.refetch()}
            />
          )}
          <header className="relative overflow-hidden rounded-2xl border border-border/70 bg-surface/85 p-4 shadow-[0_24px_70px_-48px_color-mix(in_srgb,var(--primary)_50%,transparent)] sm:p-5 lg:p-6">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent"
            />
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 max-w-4xl space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[0.68rem] font-semibold tracking-[0.18em] text-primary uppercase">
                    Project workspace
                  </p>
                  <span className="h-1 w-1 rounded-full bg-border" />
                  <Badge variant={projectStatusVariant(project.status)}>
                    {readable(project.status)}
                  </Badge>
                  <Badge variant="secondary">{project.priority} priority</Badge>
                </div>
                <h1
                  ref={heading}
                  tabIndex={-1}
                  className="break-words font-mono text-2xl font-bold tracking-tight sm:text-3xl"
                >
                  {project.name}
                </h1>
                <p className="max-w-3xl whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                  {project.description || "No project description yet."}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="self-start"
                disabled={query.isFetching}
                onClick={() => void query.refetch()}
              >
                <RefreshCw
                  className={query.isFetching ? "animate-spin" : undefined}
                  aria-hidden="true"
                />
                {query.isFetching ? "Refreshing…" : "Refresh project"}
              </Button>
            </div>
            <nav
              aria-label="Project workspace"
              className="mt-5 grid grid-cols-3 gap-1 rounded-xl border border-border/70 bg-canvas/60 p-1"
            >
              {WORKSPACE_AREAS.map((area) => {
                const Icon = area.icon;
                return (
                  <NavLink
                    key={area.id}
                    aria-label={area.label}
                    to={`${projectPath(project.id)}/${area.id}${location.search}`}
                    className={({ isActive }) =>
                      `group flex min-h-12 items-center justify-center gap-2 rounded-lg border px-2 py-2 text-center transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:min-h-14 sm:px-4 ${isActive ? "border-primary/35 bg-primary/12 text-foreground shadow-[inset_0_-2px_0_var(--primary)]" : "border-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground"}`
                    }
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    <span>
                      <span className="block font-mono text-xs font-bold tracking-[0.12em] sm:text-sm">
                        {area.label}
                      </span>
                      <span className="hidden text-[0.65rem] font-normal text-muted-foreground sm:block">
                        {area.description}
                      </span>
                    </span>
                  </NavLink>
                );
              })}
            </nav>
          </header>
          <Outlet
            context={
              {
                project,
                data: scopeProjectsData(query.data, project.id),
              } satisfies WorkspaceContext
            }
          />
        </ProjectScopeContext.Provider>
      )}
    </div>
  );
}

function Now() {
  const { project, data } = useWorkspace();
  return <FocusNow project={project} sprints={data.sprints} />;
}

function UnavailableTask() {
  return (
    <p role="alert" className="rounded-lg border p-4 text-sm">
      Selected task unavailable. It may have been deleted or may belong to
      another Project. Choose a task from this Project.
    </p>
  );
}

function Next() {
  const { project, data } = useWorkspace();
  return (
    <ProjectNext project={project} tasks={data.tasks} sprints={data.sprints} />
  );
}

function Explore() {
  const { project, data } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const requested = params.get("view") ?? "overview";
  const view = EXPLORE_VIEWS.find((item) => item === requested);
  const taskId = params.get("task");
  const selectedTask = data.tasks.find((task) => task.id === taskId);
  return (
    <section
      aria-labelledby="explore-heading"
      data-workspace-area="explore"
      className="min-w-0 space-y-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.68rem] font-semibold tracking-[0.18em] text-primary uppercase">
            Project intelligence
          </p>
          <h2
            id="explore-heading"
            className="mt-1 font-mono text-xl font-bold tracking-tight sm:text-2xl"
          >
            EXPLORE
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Understand progress, inspect delivery context and open focused
            management views for this Project.
          </p>
        </div>
        <div
          className="flex flex-wrap gap-2 rounded-xl border border-border/70 bg-card/60 p-2"
          aria-label="Create Project resources"
        >
          <ResourceControls target={{ kind: "task" }} />
          <ResourceControls
            target={{ kind: "sprint" }}
            triggerVariant="outline"
          />
          <ResourceControls
            target={{ kind: "milestone" }}
            triggerVariant="outline"
          />
        </div>
      </div>
      <WorkstreamPanel data={data} />
      <Tabs
        value={view ?? ""}
        onValueChange={(value) => {
          const next = new URLSearchParams(params);
          next.set("view", value);
          setParams(next);
        }}
      >
        <TabsList
          aria-label="Explore views"
          className="flex h-auto w-full max-w-full justify-start overflow-x-auto sm:w-fit"
          variant="line"
        >
          {EXPLORE_VIEWS.map((item) => (
            <TabsTrigger key={item} value={item} className="capitalize">
              {item}
            </TabsTrigger>
          ))}
        </TabsList>
        {!view && (
          <p role="alert" className="mt-4">
            Unknown EXPLORE view. Choose a view above.
          </p>
        )}
        <TabsContent value="overview" className="mt-5">
          <ProjectOverview project={project} data={data} />
        </TabsContent>
        <TabsContent value="board" className="mt-5 space-y-3">
          {taskId !== null && (
            <div className="space-y-2 rounded-lg border p-3">
              {selectedTask ? (
                <p className="text-sm">
                  Managing selected task: {selectedTask.title}
                </p>
              ) : (
                <UnavailableTask />
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const next = new URLSearchParams(params);
                  next.delete("task");
                  setParams(next);
                }}
              >
                Show all tasks
              </Button>
            </div>
          )}
          {(taskId === null || selectedTask) && (
            <KanbanBoard taskId={selectedTask?.id} />
          )}
        </TabsContent>
        <TabsContent value="sprints" className="mt-5">
          <SprintList />
        </TabsContent>
        <TabsContent value="milestones" className="mt-5">
          <MilestoneList />
        </TabsContent>
        <TabsContent value="gantt" className="mt-5">
          <GanttChart />
        </TabsContent>
        <TabsContent value="architecture" className="mt-5">
          <ArchitectureView />
        </TabsContent>
      </Tabs>
      <p className="text-xs text-muted-foreground">
        Imports, cross-project moves and explicit deletion of a Project with its
        contents remain in{" "}
        <Link className="underline" to="/projects?tab=projects">
          Projects management
        </Link>
        . You are viewing {project.name} only.
      </p>
    </section>
  );
}
