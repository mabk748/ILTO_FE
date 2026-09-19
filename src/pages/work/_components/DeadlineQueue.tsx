import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { WorkDeadline, Priority } from "@/lib/api/types.ts";
import { updateDeadline } from "@/lib/api/work.ts";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { differenceInDays, format } from "date-fns";
import { cn } from "@/lib/utils.ts";
import { workWriteError } from "../work-editor.ts";
import WorkResourceControls from "./WorkResourceControls.tsx";

interface Props {
  deadlines: WorkDeadline[];
}

const PRIORITY_STYLES: Record<Priority, string> = {
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  low: "bg-muted text-muted-foreground border-border",
};

const PRIORITY_ORDER: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const STATUS_STYLES: Record<WorkDeadline["status"], string> = {
  pending: "bg-muted text-muted-foreground border-border",
  completed: "bg-green-500/15 text-green-400 border-green-500/30",
  overdue: "bg-red-500/15 text-red-400 border-red-500/30",
};

function DeadlineCompletionControl({ deadline }: { deadline: WorkDeadline }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const nextStatus = deadline.status === "completed" ? "pending" : "completed";
  const mutation = useMutation({
    mutationFn: () => updateDeadline(deadline.id, { status: nextStatus }),
    retry: false,
  });
  const updateStatus = async () => {
    setError(null);
    try {
      await mutation.mutateAsync();
      await Promise.all(
        ["work", "dashboard"].map((domain) =>
          queryClient.invalidateQueries({ queryKey: [domain] }),
        ),
      );
    } catch (reason) {
      setError(workWriteError(reason));
    }
  };
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant="outline"
        disabled={mutation.isPending}
        aria-label={
          deadline.status === "completed"
            ? `Reopen deadline: ${deadline.title}`
            : `Mark deadline completed: ${deadline.title}`
        }
        onClick={() => void updateStatus()}
      >
        {mutation.isPending
          ? "Saving…"
          : deadline.status === "completed"
            ? "Reopen"
            : "Mark completed"}
      </Button>
      {error && (
        <p
          role="alert"
          className="max-w-64 text-right text-xs text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export default function DeadlineQueue({ deadlines }: Props) {
  // The API returns due-date order; this view intentionally promotes priority,
  // retaining due date as the deterministic secondary ordering.
  const sorted = [...deadlines].sort((a, b) => {
    const priority = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priority !== 0) return priority;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });
  const now = new Date();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Deadlines</h2>
          <p className="text-xs text-muted-foreground">
            Priorities are shown first, then the backend due-date order.
          </p>
        </div>
        <WorkResourceControls target={{ kind: "deadline" }} />
      </div>
      {sorted.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No deadlines yet.
          </CardContent>
        </Card>
      )}
      {sorted.map((deadline) => {
        const daysLeft = differenceInDays(new Date(deadline.due_date), now);
        const isOverdue = deadline.status === "overdue";
        const statusText =
          deadline.status === "completed"
            ? "Completed"
            : deadline.status === "overdue"
              ? `${Math.abs(daysLeft)}d overdue`
              : daysLeft > 0
                ? `${daysLeft}d left`
                : "Pending";
        return (
          <Card
            key={deadline.id}
            className={cn(isOverdue && "border-destructive/50")}
          >
            <CardContent className="pt-3 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        deadline.status === "completed" &&
                          "text-muted-foreground line-through",
                      )}
                    >
                      {deadline.title}
                    </p>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full border",
                        PRIORITY_STYLES[deadline.priority],
                      )}
                    >
                      {deadline.priority.toUpperCase()}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full border",
                        STATUS_STYLES[deadline.status],
                      )}
                    >
                      {deadline.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {deadline.project_or_context}
                  </p>
                  {deadline.notes && (
                    <p className="text-xs text-muted-foreground italic">
                      {deadline.notes}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(deadline.due_date), "MMM d")}
                    </p>
                    <p
                      className={cn(
                        "text-xs font-medium",
                        isOverdue ? "text-red-400" : "text-muted-foreground",
                      )}
                    >
                      {statusText}
                    </p>
                  </div>
                  <DeadlineCompletionControl deadline={deadline} />
                  <WorkResourceControls
                    target={{ kind: "deadline", record: deadline }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
