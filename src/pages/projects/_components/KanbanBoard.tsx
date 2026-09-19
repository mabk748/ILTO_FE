import { useProjectsData } from "../projects-data.ts";
import { useProjectsMutation } from "../use-projects-mutation.ts";
import { projectWriteError } from "../project-editor.ts";
import ResourceControls from "./ResourceControls.tsx";
import type { Task, TaskStatus, Priority } from "@/lib/api/types.ts";
import { updateTask } from "@/lib/api/projects.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";
import LoadError from "@/components/LoadError.tsx";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "backlog", label: "Backlog" },
  { status: "todo", label: "Todo" },
  { status: "in_progress", label: "In Progress" },
  { status: "review", label: "Review" },
  { status: "done", label: "Done" },
];

const PRIORITY_CLASSES: Record<Priority, string> = {
  critical: "bg-destructive/20 text-destructive border-destructive/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
  low: "bg-muted text-muted-foreground border-border",
};

function TaskCard({ task }: { task: Task }) {
  const mutation = useProjectsMutation((status: TaskStatus) =>
    updateTask(task.id, { status }),
  );
  const initials = task.assignee
    ? task.assignee.slice(0, 2).toUpperCase()
    : "?";

  return (
    <div className="bg-card border border-border rounded-md p-3 space-y-2 hover:border-primary/50 transition-colors">
      <p className="text-sm font-medium leading-tight">{task.title}</p>
      <label className="block text-xs space-y-1">
        <span>Status</span>
        <select
          aria-label={`Status for ${task.title}`}
          className="w-full rounded border bg-background p-1"
          value={task.status}
          disabled={mutation.isPending}
          onChange={(event) =>
            mutation.mutate(event.target.value as TaskStatus)
          }
        >
          {COLUMNS.map((column) => (
            <option key={column.status} value={column.status}>
              {column.label}
            </option>
          ))}
        </select>
      </label>
      {mutation.error && (
        <p role="alert" className="text-xs text-destructive">
          {projectWriteError(mutation.error)}
        </p>
      )}
      <ResourceControls target={{ kind: "task", record: task }} />
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 flex-wrap">
          <span
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wide",
              PRIORITY_CLASSES[task.priority],
            )}
          >
            {task.priority}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded border bg-muted text-muted-foreground font-mono">
            {task.story_points}sp
          </span>
        </div>
        {task.assignee && (
          <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-[9px] font-bold flex items-center justify-center border border-primary/30 shrink-0">
            {initials}
          </div>
        )}
      </div>
    </div>
  );
}

function ColumnSkeleton() {
  return (
    <div className="min-w-[220px] max-w-[220px] space-y-2">
      <Skeleton className="h-5 w-28" />
      <div className="space-y-2 rounded-md bg-muted/30 p-2 border border-dashed border-border min-h-[80px]">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function KanbanBoard() {
  const { data, error, isPending: loading, refetch } = useProjectsData();
  const tasks = data?.tasks ?? [];

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <ColumnSkeleton key={col.status} />
        ))}
      </div>
    );
  }

  if (error) {
    return <LoadError error={error} onRetry={() => void refetch()} />;
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.status);
        return (
          <div
            key={col.status}
            className="min-w-[220px] max-w-[220px] space-y-2"
          >
            <div className="flex items-center gap-2 px-1">
              <span className="text-sm font-semibold">{col.label}</span>
              <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5 font-mono leading-none">
                {colTasks.length}
              </span>
            </div>
            <div className="space-y-2 min-h-[80px] rounded-md bg-muted/30 p-2 border border-dashed border-border">
              {colTasks.map((t) => (
                <TaskCard key={t.id} task={t} />
              ))}
              {colTasks.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">
                  Empty
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
