import { useState } from "react";
import { format, differenceInDays } from "date-fns";
import type { LogisticsEvent, Trip, TripStatus } from "@/lib/api/types.ts";
import { cn } from "@/lib/utils.ts";
import { Plane, RefreshCw, CalendarCheck, Bell, MapPin } from "lucide-react";

const eventTypeIcon: Record<string, React.ElementType> = {
  trip: Plane,
  renewal: RefreshCw,
  admin: CalendarCheck,
  appointment: CalendarCheck,
  reminder: Bell,
};

const tripStatusConfig: Record<TripStatus, { label: string; cls: string }> = {
  confirmed: {
    label: "Confirmed",
    cls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  planned: {
    label: "Planned",
    cls: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  active: {
    label: "Active",
    cls: "bg-primary/20 text-primary border-primary/30",
  },
  completed: {
    label: "Completed",
    cls: "bg-muted text-muted-foreground border-border",
  },
  cancelled: {
    label: "Cancelled",
    cls: "bg-red-500/20 text-red-400 border-red-500/30",
  },
};

function getTimeBucket(date: Date): string {
  const now = new Date();
  const diff = differenceInDays(date, now);
  if (diff < 0) return "Past";
  if (diff === 0) return "Today";
  if (diff <= 7) return "This Week";
  if (diff <= 31) return "This Month";
  return "Later";
}

interface Props {
  events: LogisticsEvent[];
  trips: Trip[];
}

export default function EventCalendar({ events, trips }: Props) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Group upcoming (non-completed) events
  const upcoming = events.filter((e) => !e.completed);
  const buckets: Record<string, LogisticsEvent[]> = {};
  for (const e of upcoming) {
    const b = getTimeBucket(new Date(e.date));
    if (!buckets[b]) buckets[b] = [];
    buckets[b].push(e);
  }

  const bucketOrder = ["Today", "This Week", "This Month", "Later", "Past"];

  return (
    <div className="space-y-5">
      {/* Events timeline */}
      {bucketOrder
        .filter((b) => buckets[b]?.length > 0)
        .map((bucket) => (
          <div key={bucket}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {bucket}
            </h3>
            <div className="space-y-2">
              {(buckets[bucket] ?? []).map((evt) => {
                const Icon = eventTypeIcon[evt.type] ?? Bell;
                const isChecked = checked.has(evt.id);
                const durationDays = evt.end_date
                  ? differenceInDays(new Date(evt.end_date), new Date(evt.date))
                  : null;

                return (
                  <div
                    key={evt.id}
                    className={cn(
                      "bg-card border border-border rounded-lg p-3 flex items-start gap-3 transition-opacity",
                      isChecked && "opacity-50",
                    )}
                  >
                    <div className="mt-0.5 shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p
                          className={cn(
                            "text-sm font-medium text-foreground",
                            isChecked && "line-through",
                          )}
                        >
                          {evt.title}
                        </p>
                        {durationDays !== null && durationDays > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                            {durationDays + 1}d
                          </span>
                        )}
                        {evt.linked_trip_id && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex items-center gap-0.5">
                            <MapPin className="h-2.5 w-2.5" /> Trip
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(evt.date), "EEE, MMM d")}
                        {evt.end_date &&
                          ` – ${format(new Date(evt.end_date), "MMM d")}`}
                        {evt.notes && ` · ${evt.notes}`}
                      </p>
                    </div>
                    <button
                      onClick={() => toggle(evt.id)}
                      className="shrink-0 cursor-pointer text-muted-foreground hover:text-foreground transition-colors mt-0.5"
                      aria-label="Toggle done"
                    >
                      <CalendarCheck
                        className={cn(
                          "h-4 w-4",
                          isChecked && "text-emerald-400",
                        )}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

      {/* Trips section */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Trips
        </h3>
        <div className="space-y-2">
          {trips.map((trip) => {
            const cfg = tripStatusConfig[trip.status];
            const nights = differenceInDays(
              new Date(trip.return_date),
              new Date(trip.departure_date),
            );
            return (
              <div
                key={trip.id}
                className="bg-card border border-border rounded-lg p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {trip.name}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {trip.destination}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded border shrink-0",
                      cfg.cls,
                    )}
                  >
                    {cfg.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    {format(new Date(trip.departure_date), "MMM d")} –{" "}
                    {format(new Date(trip.return_date), "MMM d")}
                  </span>
                  {nights > 0 && (
                    <span>
                      {nights} night{nights > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                {trip.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {trip.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {trip.notes && (
                  <p className="text-xs text-muted-foreground italic">
                    {trip.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
