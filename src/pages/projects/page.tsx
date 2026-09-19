import { useProjectsData, summarizeProjects } from "./projects-data.ts";
import ProjectList from "./_components/ProjectList.tsx";
import ResourceControls from "./_components/ResourceControls.tsx";
import { FolderKanban, Activity, ListTodo, Zap } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import KanbanBoard from "./_components/KanbanBoard.tsx";
import SprintList from "./_components/SprintList.tsx";
import MilestoneList from "./_components/MilestoneList.tsx";
import GanttChart from "./_components/GanttChart.tsx";
import LoadError from "@/components/LoadError.tsx";

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
    <div className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-3">
      <Icon className="h-4 w-4 text-primary shrink-0" />
      <div>
        <p className="text-xl font-bold font-mono leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const { data, error, isPending: statsLoading, refetch } = useProjectsData();
  const stats = data ? summarizeProjects(data) : undefined;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FolderKanban className="h-6 w-6 text-primary shrink-0" />
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Projects
        </h1>
      </div>

      {/* Stats row */}
      {error ? (
        <LoadError error={error} onRetry={() => void refetch()} />
      ) : statsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

      <div className="flex flex-wrap gap-2">
        <ResourceControls target={{ kind: "project" }} />
        <ResourceControls target={{ kind: "sprint" }} />
        <ResourceControls target={{ kind: "task" }} />
        <ResourceControls target={{ kind: "milestone" }} />
        <button
          type="button"
          className="text-sm underline px-2"
          onClick={() => void refetch()}
        >
          Refresh Projects
        </button>
      </div>
      {data && data.projects.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Create a project first to add sprints, tasks, and milestones.
        </p>
      )}
      {/* Tabs */}
      <Tabs defaultValue="board">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="sprints">Sprints</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="gantt">Gantt</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="mt-4">
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
      </Tabs>
    </div>
  );
}
