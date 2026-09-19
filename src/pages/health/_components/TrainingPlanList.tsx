import type { TrainingPlan } from "@/lib/api/types.ts";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { cn } from "@/lib/utils.ts";
import HealthResourceControls from "./HealthResourceControls.tsx";

interface Props {
  plans: TrainingPlan[];
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/15 text-green-400 border-green-500/30",
  paused: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  completed: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  archived: "bg-muted text-muted-foreground",
};

const WEEKLY_SCHEDULE = [
  { day: "Mon", type: "Strength", note: "Upper Body Pull" },
  { day: "Wed", type: "Strength", note: "Lower Body Push" },
  { day: "Fri", type: "Strength", note: "Full Body / Accessory" },
  { day: "Sat", type: "Cardio", note: "Zone 2, 30–45 min" },
  { day: "Sun", type: "Rest", note: "Active Recovery / Walk" },
];

export default function TrainingPlanList({ plans }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Training plans</h2>
          <p className="text-xs text-muted-foreground">
            Plans are ordered by creation time from the backend.
          </p>
        </div>
        <HealthResourceControls target={{ kind: "plan" }} />
      </div>
      {plans.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No training plans yet.
          </CardContent>
        </Card>
      )}
      {plans.map((plan) => {
        const pct =
          plan.weeks_total > 0
            ? Math.min(
                100,
                Math.max(
                  0,
                  Math.round((plan.week_current / plan.weeks_total) * 100),
                ),
              )
            : 0;
        return (
          <Card key={plan.id}>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-sm">{plan.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {plan.goal}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full border font-medium shrink-0",
                      STATUS_COLORS[plan.status] ?? STATUS_COLORS.archived,
                    )}
                  >
                    {plan.status}
                  </span>
                  <HealthResourceControls
                    target={{ kind: "plan", record: plan }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    Week {plan.week_current} / {plan.weeks_total}
                  </span>
                  <span>{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Weekly schedule suggestion */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <p className="text-sm font-semibold">
            Suggested Weekly Schedule (static guidance)
          </p>
          <p className="text-xs text-muted-foreground">
            This example schedule is not loaded from or connected to a training
            plan.
          </p>
          <div className="grid grid-cols-5 gap-2">
            {WEEKLY_SCHEDULE.map((s) => (
              <div key={s.day} className="text-center space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">
                  {s.day}
                </p>
                <Badge variant="outline" className="text-[10px] px-1.5">
                  {s.type}
                </Badge>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  {s.note}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
