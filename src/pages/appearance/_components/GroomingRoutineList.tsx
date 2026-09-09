import { format, formatDistanceToNow, isPast } from "date-fns";
import type {
  GroomingRoutine,
  OutfitLog,
  WardrobeItem,
} from "@/lib/api/types.ts";
import { cn } from "@/lib/utils.ts";
import { Flame, Clock } from "lucide-react";

const categoryBadge: Record<string, string> = {
  skincare: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  haircare: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  fitness: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  hygiene: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  dental: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  other: "bg-muted text-muted-foreground border-border",
};

const freqLabel: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  bi_weekly: "Every 2 weeks",
  monthly: "Monthly",
};

interface Props {
  routines: GroomingRoutine[];
  outfitLogs: OutfitLog[];
  wardrobeItems: WardrobeItem[];
}

export default function GroomingRoutineList({
  routines,
  outfitLogs,
  wardrobeItems,
}: Props) {
  const itemMap = Object.fromEntries(wardrobeItems.map((i) => [i.id, i]));
  const dueToday = routines.filter((r) => {
    const due = new Date(r.next_due);
    const now = new Date();
    return due <= now || due.toDateString() === now.toDateString();
  }).length;

  return (
    <div className="space-y-5">
      {dueToday > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-medium">
          <Clock className="h-4 w-4 shrink-0" />
          {dueToday} routine{dueToday > 1 ? "s" : ""} due today
        </div>
      )}

      <div className="space-y-3">
        {routines.map((r) => {
          const overdue = isPast(new Date(r.next_due));
          const catCls = categoryBadge[r.category] ?? categoryBadge.other;

          return (
            <div
              key={r.id}
              className="bg-card border border-border rounded-lg p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {r.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded border capitalize",
                        catCls,
                      )}
                    >
                      {r.category}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {freqLabel[r.frequency]}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Clock className="h-3 w-3" /> {r.duration_minutes}m
                    </span>
                  </div>
                </div>
                {r.streak_days > 0 && (
                  <div className="flex items-center gap-1 text-amber-400 shrink-0">
                    <Flame className="h-4 w-4" />
                    <span className="text-xs font-semibold">
                      {r.streak_days}d
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>
                  Last:{" "}
                  {r.last_done
                    ? formatDistanceToNow(new Date(r.last_done), {
                        addSuffix: true,
                      })
                    : "Never"}
                </span>
                <span
                  className={cn(overdue ? "text-destructive font-medium" : "")}
                >
                  Due: {format(new Date(r.next_due), "MMM d")}
                  {overdue && " (overdue)"}
                </span>
              </div>

              <div className="flex gap-1.5 flex-wrap">
                {r.steps.map((step) => (
                  <span
                    key={step}
                    className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border"
                  >
                    {step}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent outfit logs */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Recent Outfits
        </h3>
        <div className="space-y-2">
          {outfitLogs.slice(0, 5).map((log) => {
            const items = log.item_ids.map((id) => itemMap[id]).filter(Boolean);
            return (
              <div
                key={log.id}
                className="bg-card border border-border rounded-lg p-3 flex items-center gap-3"
              >
                {/* Color swatches */}
                <div className="flex gap-1 shrink-0">
                  {items.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="h-6 w-6 rounded-sm border border-border/50"
                      style={{ backgroundColor: item.image_placeholder }}
                      title={item.name}
                    />
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">
                    {log.occasion}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(log.date), "MMM d")}
                    {log.notes && ` · ${log.notes}`}
                  </p>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "text-xs",
                        i < log.rating
                          ? "text-amber-400"
                          : "text-muted-foreground/30",
                      )}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
