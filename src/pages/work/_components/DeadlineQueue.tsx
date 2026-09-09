import type { WorkDeadline, Priority } from "@/lib/api/types.ts";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { differenceInDays, format } from "date-fns";
import { cn } from "@/lib/utils.ts";

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

export default function DeadlineQueue({ deadlines }: Props) {
  const sorted = [...deadlines].sort((a, b) => {
    const po = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (po !== 0) return po;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  const now = new Date();

  return (
    <div className="space-y-3">
      {sorted.map((d) => {
        const daysLeft = differenceInDays(new Date(d.due_date), now);
        const isOverdue = daysLeft < 0;

        return (
          <Card key={d.id} className={cn(isOverdue && "border-destructive/50")}>
            <CardContent className="pt-3 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{d.title}</p>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full border",
                        PRIORITY_STYLES[d.priority],
                      )}
                    >
                      {d.priority.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {d.project_or_context}
                  </p>
                  {d.notes && (
                    <p className="text-xs text-muted-foreground italic">
                      {d.notes}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(d.due_date), "MMM d")}
                  </p>
                  <p
                    className={cn(
                      "text-xs font-medium",
                      isOverdue
                        ? "text-red-400"
                        : daysLeft <= 3
                          ? "text-orange-400"
                          : "text-muted-foreground",
                    )}
                  >
                    {isOverdue
                      ? `${Math.abs(daysLeft)}d overdue`
                      : `${daysLeft}d left`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
