import { useState } from "react";
import type { FollowUpPrompt, Priority } from "@/lib/api/types.ts";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils.ts";

interface Props {
  followUps: FollowUpPrompt[];
}

const PRIORITY_STYLES: Record<Priority, string> = {
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  low: "bg-muted text-muted-foreground border-border",
};

export default function FollowUpList({ followUps }: Props) {
  const [done, setDone] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(followUps.map((f) => [f.id, f.completed])),
  );

  const sorted = [...followUps].sort(
    (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime(),
  );

  return (
    <div className="space-y-3">
      {sorted.map((f) => {
        const isOverdue = new Date(f.due_date) < new Date() && !done[f.id];
        const isDone = done[f.id];

        return (
          <Card
            key={f.id}
            className={cn(
              isOverdue && "border-destructive/50",
              isDone && "opacity-50",
            )}
          >
            <CardContent className="pt-3 pb-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        isDone && "line-through text-muted-foreground",
                      )}
                    >
                      {f.contact_name}
                    </p>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full border",
                        PRIORITY_STYLES[f.priority],
                      )}
                    >
                      {f.priority}
                    </span>
                    {isOverdue && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
                        overdue
                      </span>
                    )}
                  </div>
                  <p
                    className={cn(
                      "text-xs text-muted-foreground mt-0.5",
                      isDone && "line-through",
                    )}
                  >
                    {f.prompt}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(f.due_date), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <button
                  onClick={() =>
                    setDone((prev) => ({ ...prev, [f.id]: !prev[f.id] }))
                  }
                  className={cn(
                    "cursor-pointer transition-colors shrink-0",
                    isDone
                      ? "text-green-400"
                      : "text-muted-foreground hover:text-primary",
                  )}
                >
                  <CheckCircle className="h-5 w-5" />
                </button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
