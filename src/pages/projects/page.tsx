import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FolderKanban, Activity, ListTodo, Zap } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { getProjects, getSprints, getTasks } from "@/lib/api/projects.ts";
import KanbanBoard from "./_components/KanbanBoard.tsx";
import SprintList from "./_components/SprintList.tsx";
import MilestoneList from "./_components/MilestoneList.tsx";
import GanttChart from "./_components/GanttChart.tsx";
import LoadError from "@/components/LoadError.tsx";

interface SummaryStats {
  activeProjects: number;
  activeSprints: number;
  openTasks: number;
  sprintPoints: number;
}

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
  const {
    data: stats,
    error,
    isPending: statsLoading,
    refetch,
  } = useQuery({
    queryKey: ["projects", "summary"],
    queryFn: async (): Promise<SummaryStats> => {
      const [projects, sprints, tasks] = await Promise.all([
        getProjects(),
        getSprints(),
        getTasks(),
      ]);
      const activeSprint = sprints.find((sprint) => sprint.status === "active");
      return {
        activeProjects: projects.data.filter(
          (project) => project.status === "active",
        ).length,
        activeSprints: sprints.filter((sprint) => sprint.status === "active")
          .length,
        openTasks: tasks.filter((task) => task.status !== "done").length,
        sprintPoints: activeSprint
          ? tasks
              .filter((task) => task.sprint_id === activeSprint.id)
              .reduce((sum, task) => sum + task.story_points, 0)
          : 0,
      };
    },
  });

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
            label="Sprint Points"
            value={stats.sprintPoints}
            icon={Zap}
          />
        </div>
      ) : null}

      {/* Tabs */}
      <Tabs defaultValue="board">
        <TabsList>
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="sprints">Sprints</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="gantt">Gantt</TabsTrigger>
        </TabsList>

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
