import { useProjectsData } from "../projects-data.ts";
import ResourceControls from "./ResourceControls.tsx";
import type { Milestone, Project } from "@/lib/api/types.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { formatDistanceToNow } from "date-fns";
import {
  formatCalendarDate,
  isCalendarDateOverdue,
} from "@/lib/calendar-date.ts";
import { cn } from "@/lib/utils.ts";
import LoadError from "@/components/LoadError.tsx";
import { CheckCircle2, Circle, CalendarDays, FolderKanban } from "lucide-react";

const STATUS_COLOR: Record<string, string> = {
  active: "bg-primary/20 text-primary border-primary/30",
  planning: "bg-muted text-muted-foreground border-border",
  on_hold: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  archived: "bg-muted text-muted-foreground border-border",
};

function MilestoneRow({
  milestone,
  project,
}: {
  milestone: Milestone;
  project: Project | undefined;
}) {
  const isDone = milestone.completed_at !== null;
  const overdue = !isDone && isCalendarDateOverdue(milestone.due_date);

  return (
    <div className="flex gap-4 items-start border-b border-border last:border-0 py-4">
      <div className="shrink-0 mt-0.5">
        {isDone ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : (
          <Circle
            className={cn(
              "h-5 w-5",
              overdue ? "text-destructive" : "text-muted-foreground",
            )}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-semibold",
            isDone && "line-through text-muted-foreground",
          )}
        >
          {milestone.title}
        </p>
        <div className="my-2">
          <ResourceControls target={{ kind: "milestone", record: milestone }} />
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {milestone.description}
        </p>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          <div
            className={cn(
              "flex items-center gap-1 text-xs",
              overdue ? "text-destructive" : "text-muted-foreground",
            )}
          >
            <CalendarDays className="h-3 w-3" />
            <span>
              {isDone
                ? `Completed ${formatDistanceToNow(new Date(milestone.completed_at!), { addSuffix: true })}`
                : overdue
                  ? `Overdue · due ${formatCalendarDate(milestone.due_date)}`
                  : `Due ${formatCalendarDate(milestone.due_date)}`}
            </span>
          </div>
          {project && (
            <span className="text-xs text-muted-foreground truncate">
              {project.name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function MilestoneTimeline({ milestones }: { milestones: Milestone[] }) {
  const sorted = [...milestones].sort((a, b) =>
    a.due_date.localeCompare(b.due_date),
  );

  return (
    <div className="relative flex items-center gap-0 overflow-x-auto py-4 px-1">
      {sorted.map((m, i) => {
        const isDone = m.completed_at !== null;
        const overdue = !isDone && isCalendarDateOverdue(m.due_date);
        return (
          <div key={m.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1 min-w-[100px]">
              <div
                className={cn(
                  "w-3 h-3 rounded-full border-2",
                  isDone
                    ? "bg-green-500 border-green-500"
                    : overdue
                      ? "bg-destructive border-destructive"
                      : "bg-background border-primary",
                )}
              />
              <span className="text-[10px] text-center text-muted-foreground leading-tight px-1">
                {formatCalendarDate(m.due_date, "MMM d")}
              </span>
            </div>
            {i < sorted.length - 1 && (
              <div className="h-0.5 w-8 bg-border shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function MilestoneList() {
  const { data, error, isPending: loading, refetch } = useProjectsData();

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return <LoadError error={error} onRetry={() => void refetch()} />;
  }

  const milestones = data?.milestones ?? [];
  const projects = data?.projects ?? [];

  const projectMap = new Map(projects.map((p) => [p.id, p]));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-semibold">Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <MilestoneTimeline milestones={milestones} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 divide-y divide-border">
            {milestones.length === 0 && (
              <p className="py-4 text-sm">No milestones yet.</p>
            )}
            {milestones.map((m) => (
              <MilestoneRow
                key={m.id}
                milestone={m}
                project={projectMap.get(m.project_id)}
              />
            ))}
          </CardContent>
        </Card>
      </div>

      <div>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-primary" />
              Projects
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {projects.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2"
              >
                <span className="text-sm truncate">{p.name}</span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded border font-semibold uppercase shrink-0",
                    STATUS_COLOR[p.status],
                  )}
                >
                  {p.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
