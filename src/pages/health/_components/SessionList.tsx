import type {
  TrainingPlan,
  WorkoutSession,
  WorkoutType,
} from "@/lib/api/types.ts";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils.ts";
import HealthResourceControls from "./HealthResourceControls.tsx";

interface Props {
  sessions: WorkoutSession[];
  plans?: TrainingPlan[];
  autoCreate?: boolean;
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

export default function SessionList({
  sessions,
  plans = [],
  autoCreate = false,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Workout sessions</h2>
          <p className="text-xs text-muted-foreground">
            Sessions are newest first; this view shows the backend&apos;s 14-day
            window.
          </p>
        </div>
        <HealthResourceControls
          target={{ kind: "workout" }}
          plans={plans}
          autoOpen={autoCreate}
        />
      </div>
      {sessions.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No workout sessions in the selected window.
          </CardContent>
        </Card>
      )}
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
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(s.completed_at), {
                        addSuffix: true,
                      })}
                    </p>
                    <HealthResourceControls
                      target={{ kind: "workout", record: s }}
                      plans={plans}
                    />
                  </div>
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
