import { format, formatDistanceToNow, isPast } from "date-fns";
import type {
  GroomingRoutine,
  OutfitLog,
  WardrobeItem,
} from "@/lib/api/types.ts";
import { cn } from "@/lib/utils.ts";
import { Flame, Clock } from "lucide-react";
import AppearanceResourceControls from "./AppearanceResourceControls.tsx";

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
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">
          Grooming routines
        </h2>
        <span className="text-xs text-muted-foreground">Imported records</span>
      </div>
      {dueToday > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-medium">
          <Clock className="h-4 w-4 shrink-0" />
          {dueToday} routine{dueToday > 1 ? "s" : ""} due today
        </div>
      )}

      {routines.length === 0 ? (
        <div className="bg-card border border-border rounded-lg py-8 text-center text-sm text-muted-foreground">
          No imported grooming routines.
        </div>
      ) : (
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
                    className={cn(
                      overdue ? "text-destructive font-medium" : "",
                    )}
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
      )}

      {/* Outfit logs */}
      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">Outfit logs</h3>
          <AppearanceResourceControls
            target={{ kind: "outfit" }}
            wardrobeItems={wardrobeItems}
          />
        </div>
        {wardrobeItems.length === 0 && (
          <p className="mb-3 text-sm text-muted-foreground">
            Add a wardrobe item before creating an outfit log.
          </p>
        )}
        {outfitLogs.length === 0 && (
          <div className="bg-card border border-border rounded-lg py-8 text-center text-sm text-muted-foreground">
            No outfit logs yet.
          </div>
        )}
        <div className="space-y-2">
          {[...outfitLogs]
            .sort(
              (left, right) =>
                new Date(right.date).getTime() - new Date(left.date).getTime(),
            )
            .map((log) => {
              const items = log.item_ids
                .map((id) => itemMap[id])
                .filter((item): item is WardrobeItem => item !== undefined);
              const missingItemCount = log.item_ids.length - items.length;
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
                    {missingItemCount > 0 && (
                      <span className="text-[10px] text-destructive">
                        {missingItemCount} missing
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">
                      {log.occasion}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(log.date), "MMM d")}
                      {log.notes && ` · ${log.notes}`}
                    </p>
                    {missingItemCount > 0 && (
                      <p className="text-[10px] text-destructive">
                        This historical outfit references a deleted wardrobe
                        item.
                      </p>
                    )}
                    {log.item_ids.length === 0 && (
                      <p className="text-[10px] text-muted-foreground">
                        No wardrobe items remain for this historical outfit.
                      </p>
                    )}
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
                  <AppearanceResourceControls
                    target={{ kind: "outfit", record: log }}
                    wardrobeItems={wardrobeItems}
                  />
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
