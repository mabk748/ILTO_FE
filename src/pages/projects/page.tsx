import { Link, useSearchParams } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  FolderKanban,
  LayoutGrid,
  ListTodo,
  Network,
  Settings2,
  Zap,
} from "lucide-react";
import LoadError from "@/components/LoadError.tsx";
import {
  ModuleHeader,
  ModulePage,
  ModuleSectionHeader,
} from "@/components/layout/ModulePage.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.tsx";
import ArchitectureView from "./_components/ArchitectureView.tsx";
import GanttChart from "./_components/GanttChart.tsx";
import KanbanBoard from "./_components/KanbanBoard.tsx";
import MilestoneList from "./_components/MilestoneList.tsx";
import ProjectDirectory from "./_components/ProjectDirectory.tsx";
import ProjectImportDialog from "./_components/ProjectImportDialog.tsx";
import ProjectList from "./_components/ProjectList.tsx";
import ProjectSystemView from "./_components/ProjectSystemView.tsx";
import ResourceControls from "./_components/ResourceControls.tsx";
import SprintList from "./_components/SprintList.tsx";
import { summarizeProjects, useProjectsData } from "./projects-data.ts";

const PROJECT_TABS = [
  "projects",
  "board",
  "sprints",
  "milestones",
  "gantt",
  "architecture",
] as const;
type ProjectTab = (typeof PROJECT_TABS)[number];

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <Icon className="size-4 shrink-0 text-primary" />
      <div>
        <p className="font-mono text-xl font-bold leading-none">{value}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function DirectoryHeader({ systemView }: { systemView: boolean }) {
  return (
    <header className="flex flex-col gap-5 border-b border-border/70 pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl space-y-2">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
            <FolderKanban className="size-5" />
          </span>
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
              Project command center
            </p>
            <h1 className="font-mono text-2xl font-bold tracking-tight sm:text-3xl">
              Projects
            </h1>
          </div>
        </div>
        <p className="text-sm text-muted-foreground sm:text-base">
          Choose a Project workspace, return to active Focus, or inspect the
          relationships currently persisted by ILTO.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <nav
          aria-label="Projects landing view"
          className="grid grid-cols-2 rounded-lg border border-border bg-muted/55 p-1"
        >
          <Link
            to="/projects"
            aria-current={!systemView ? "page" : undefined}
            className={`flex min-h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors ${
              !systemView
                ? "bg-surface-elevated text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="size-4" />
            Directory
          </Link>
          <Link
            to="/projects?view=system"
            aria-current={systemView ? "page" : undefined}
            className={`flex min-h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors ${
              systemView
                ? "bg-surface-elevated text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Network className="size-4" />
            System View
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <ResourceControls target={{ kind: "project" }} />
          <Button asChild size="sm" variant="outline">
            <Link to="/projects?tab=board">
              <Settings2 />
              Management
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function LegacyProjectManagement({ tab }: { tab: ProjectTab }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const createMilestone = searchParams.get("create") === "milestone";
  const { data, error, isPending, refetch } = useProjectsData();
  const stats = data ? summarizeProjects(data) : undefined;
  const changeTab = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", value);
    next.delete("create");
    setSearchParams(next);
  };

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Project management"
        eyebrow="Cross-Project tools"
        icon={Settings2}
        description="Manage planning resources across Projects. Individual work remains inside each Project workspace."
        actions={
          <>
            <Button asChild size="sm" variant="ghost" className="-ml-3">
              <Link to="/projects">
                <ArrowLeft />
                Project directory
              </Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => void refetch()}
            >
              Refresh data
            </Button>
          </>
        }
      />

      {error ? (
        <LoadError error={error} onRetry={() => void refetch()} />
      ) : isPending ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Active Projects"
            value={stats.activeProjects}
            icon={FolderKanban}
          />
          <StatCard
            label="Active Sprints"
            value={stats.activeSprints}
            icon={Activity}
          />
          <StatCard
            label="Open Tasks"
            value={stats.openTasks}
            icon={ListTodo}
          />
          <StatCard
            label="Active Sprint Points"
            value={stats.sprintPoints}
            icon={Zap}
          />
        </div>
      ) : null}

      <div className="space-y-3 rounded-xl border border-border/70 bg-card/55 p-4">
        <ModuleSectionHeader
          title="Add planning resources"
          description="Create records directly or import an existing Project plan."
        />
        <div className="flex flex-wrap gap-2">
          <ResourceControls target={{ kind: "project" }} />
          <ResourceControls target={{ kind: "sprint" }} />
          <ResourceControls target={{ kind: "task" }} />
          <ResourceControls
            target={{ kind: "milestone" }}
            autoOpen={createMilestone}
          />
          <ProjectImportDialog />
        </div>
      </div>
      {data && data.projects.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Create a Project first to add Sprints, Tasks and Milestones.
        </p>
      )}

      <Tabs value={tab} onValueChange={changeTab}>
        <TabsList
          variant="line"
          className="h-auto w-full justify-start overflow-x-auto"
          aria-label="Project management views"
        >
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="sprints">Sprints</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="gantt">Gantt</TabsTrigger>
          <TabsTrigger value="architecture">Architecture</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="mt-4 rounded-xl">
          <ProjectList />
        </TabsContent>
        <TabsContent value="board" className="mt-4">
          <KanbanBoard />
        </TabsContent>
        <TabsContent value="sprints" className="mt-4">
          <SprintList />
        </TabsContent>
        <TabsContent value="milestones" className="mt-4">
          <MilestoneList />
        </TabsContent>
        <TabsContent value="gantt" className="mt-4">
          <GanttChart />
        </TabsContent>
        <TabsContent value="architecture" className="mt-4">
          <ArchitectureView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ProjectsPage() {
  const [searchParams] = useSearchParams();
  const createMilestone = searchParams.get("create") === "milestone";
  const requestedTab = searchParams.get("tab");
  const managementRequested = requestedTab !== null || createMilestone;
  const tab: ProjectTab = createMilestone
    ? "milestones"
    : PROJECT_TABS.includes(requestedTab as ProjectTab)
      ? (requestedTab as ProjectTab)
      : "board";
  const systemView =
    !managementRequested && searchParams.get("view") === "system";
  const query = useProjectsData();

  if (managementRequested) {
    return (
      <ModulePage>
        <LegacyProjectManagement tab={tab} />
      </ModulePage>
    );
  }

  return (
    <ModulePage>
      <DirectoryHeader systemView={systemView} />
      {query.error ? (
        <LoadError
          error={query.error}
          title="Could not load the Project directory"
          onRetry={() => void query.refetch()}
        />
      ) : query.isPending || !query.data ? (
        <div className="space-y-4" aria-label="Loading Project directory">
          <Skeleton className="h-24 w-full" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-64 w-full" />
            ))}
          </div>
        </div>
      ) : systemView ? (
        <ProjectSystemView data={query.data} />
      ) : (
        <ProjectDirectory data={query.data} />
      )}
    </ModulePage>
  );
}
