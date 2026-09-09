import type { WorkoutSession, WorkoutType } from "@/lib/api/types.ts";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils.ts";

interface Props {
  sessions: WorkoutSession[];
}

const TYPE_STYLES: Record<WorkoutType, string> = {
  strength: "bg-primary/15 text-primary border-primary/30",
  cardio: "bg-green-500/15 text-green-400 border-green-500/30",
  flexibility: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  rest: "bg-muted text-muted-foreground border-border",
  hiit: "bg-red-500/15 text-red-400 border-red-500/30",
};

function RpeDots({ rpe }: { rpe: number }) {
  return (
    <div className="flex gap-0.5 items-center">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            i < rpe ? "bg-primary" : "bg-muted",
          )}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1">{rpe}/10</span>
    </div>
  );
}

export default function SessionList({ sessions }: Props) {
  return (
    <div className="space-y-3">
      {sessions.map((s) => (
        <Card key={s.id}>
          <CardContent className="pt-3 pb-3">
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "text-[11px] px-2 py-0.5 rounded-full border font-medium shrink-0 mt-0.5",
                  TYPE_STYLES[s.type],
                )}
              >
                {s.type}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(s.completed_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                {s.duration_minutes > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {s.duration_minutes} min
                  </p>
                )}
                {s.rpe > 0 && <RpeDots rpe={s.rpe} />}
                {s.notes && (
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    {s.notes}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
