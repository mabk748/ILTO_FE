import type { NetworkingGoal } from "@/lib/api/types.ts";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { format } from "date-fns";
import { cn } from "@/lib/utils.ts";

interface Props {
  goals: NetworkingGoal[];
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-500/15 text-green-400 border-green-500/30",
  paused: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  completed: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  archived: "bg-muted text-muted-foreground border-border",
};

export default function NetworkingGoals({ goals }: Props) {
  return (
    <div className="space-y-3">
      {goals.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No networking goals yet.
          </CardContent>
        </Card>
      )}
      {goals.map((g) => {
        const pct =
          g.target_contacts > 0
            ? Math.round((g.current_contacts / g.target_contacts) * 100)
            : 0;
        const clampedPct = Math.min(100, Math.max(0, pct));
        return (
          <Card key={g.id}>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-sm">{g.title}</p>
                <span
                  className={cn(
                    "text-[11px] px-2 py-0.5 rounded-full border font-medium shrink-0",
                    STATUS_STYLES[g.status] ?? STATUS_STYLES.archived,
                  )}
                >
                  {g.status}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {g.current_contacts} / {g.target_contacts} contacts
                  </span>
                  <span>{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${clampedPct}%` }}
                    role="progressbar"
                    aria-label={`${g.title} networking progress`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={clampedPct}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Due {format(new Date(g.due_date), "MMM d, yyyy")}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
