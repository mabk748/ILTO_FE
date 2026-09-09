import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Sprint, Task, SprintStatus } from "@/lib/api/types.ts";
import { getSprints, getTasks } from "@/lib/api/projects.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { format } from "date-fns";
import { cn } from "@/lib/utils.ts";
import { ChevronDown, ChevronRight, Zap } from "lucide-react";
import VelocityChart from "./VelocityChart.tsx";
import LoadError from "@/components/LoadError.tsx";

const STATUS_CLASSES: Record<SprintStatus, string> = {
  planned: "bg-muted text-muted-foreground border-border",
  active: "bg-primary/20 text-primary border-primary/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
};

interface SprintWithTasks extends Sprint {
  tasks: Task[];
  pointsDone: number;
  pointsTotal: number;
}

function SprintRow({ sprint }: { sprint: SprintWithTasks }) {
  const [expanded, setExpanded] = useState(false);
  const progress =
    sprint.pointsTotal > 0
      ? Math.round((sprint.pointsDone / sprint.pointsTotal) * 100)
      : 0;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/40 transition-colors cursor-pointer"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold truncate">
              {sprint.name}
            </span>
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wide",
                STATUS_CLASSES[sprint.status],
              )}
            >
              {sprint.status}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{sprint.goal}</p>
        </div>
        <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>
              {format(new Date(sprint.start_date), "MMM d")} –{" "}
              {format(new Date(sprint.end_date), "MMM d")}
            </span>
          </div>
          {sprint.velocity > 0 && (
            <div className="flex items-center gap-1 text-xs text-primary">
              <Zap className="h-3 w-3" />
              <span>{sprint.velocity} pts</span>
            </div>
          )}
        </div>
      </button>

      <div className="px-4 pb-3 space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {sprint.pointsDone}/{sprint.pointsTotal} story points
          </span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {expanded && sprint.tasks.length > 0 && (
        <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-1.5">
          {sprint.tasks.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span
                className={cn(
                  "truncate",
                  t.status === "done" && "line-through text-muted-foreground",
                )}
              >
                {t.title}
              </span>
              <span className="text-xs text-muted-foreground font-mono shrink-0">
                {t.story_points}sp
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SprintList() {
  const {
    data: sprints = [],
    error,
    isPending: loading,
    refetch,
  } = useQuery({
    queryKey: ["projects", "sprints"],
    queryFn: async (): Promise<SprintWithTasks[]> => {
      const [sprintData, taskData] = await Promise.all([
        getSprints(),
        getTasks(),
      ]);
      const enriched: SprintWithTasks[] = sprintData.map((s) => {
        const tasks = taskData.filter((t) => t.sprint_id === s.id);
        const pointsDone = tasks
          .filter((t) => t.status === "done")
          .reduce((sum, t) => sum + t.story_points, 0);
        const pointsTotal = tasks.reduce((sum, t) => sum + t.story_points, 0);
        return { ...s, tasks, pointsDone, pointsTotal };
      });
      return enriched;
    },
  });

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return <LoadError error={error} onRetry={() => void refetch()} />;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {sprints.map((s) => (
          <SprintRow key={s.id} sprint={s} />
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Sprint Velocity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <VelocityChart sprints={sprints} />
        </CardContent>
      </Card>
    </div>
  );
}
