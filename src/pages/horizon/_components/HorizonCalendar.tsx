import { format, isSameMonth } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";
import type { HorizonEntry } from "@/lib/api/types.ts";
import { formatInstant } from "@/lib/time-zone.ts";
import {
  dateKeyInZone,
  groupEntriesByDay,
  type HorizonView,
} from "../horizon-calendar.ts";

const SOURCE_LABELS: Record<HorizonEntry["source_domain"], string> = {
  horizon: "Horizon",
  projects: "Projects",
  work: "Work",
  logistics: "Logistics",
};

const SOURCE_STYLES: Record<HorizonEntry["source_domain"], string> = {
  horizon: "border-l-primary bg-primary/10",
  projects: "border-l-violet-400 bg-violet-500/10",
  work: "border-l-orange-400 bg-orange-500/10",
  logistics: "border-l-cyan-400 bg-cyan-500/10",
};

function EntryButton({
  entry,
  timeZone,
  onSelect,
}: {
  entry: HorizonEntry;
  timeZone: string;
  onSelect: (entry: HorizonEntry) => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "min-h-9 w-full rounded-r border-l-2 px-1.5 py-1 text-left text-[11px] transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        SOURCE_STYLES[entry.source_domain],
      )}
      aria-label={`Open ${entry.title} from ${SOURCE_LABELS[entry.source_domain]}`}
      onClick={() => onSelect(entry)}
    >
      <span className="block truncate font-semibold">{entry.title}</span>
      <span className="block truncate text-[10px] text-muted-foreground">
        {entry.all_day
          ? SOURCE_LABELS[entry.source_domain]
          : `${formatInstant(entry.starts_at, timeZone, {
              hour: "2-digit",
              minute: "2-digit",
            })} · ${SOURCE_LABELS[entry.source_domain]}`}
      </span>
    </button>
  );
}

export default function HorizonCalendar({
  anchor,
  days,
  entries,
  timeZone,
  view,
  onAnchorChange,
  onViewChange,
  onSelect,
}: {
  anchor: Date;
  days: Date[];
  entries: HorizonEntry[];
  timeZone: string;
  view: HorizonView;
  onAnchorChange: (direction: -1 | 0 | 1) => void;
  onViewChange: (view: HorizonView) => void;
  onSelect: (entry: HorizonEntry) => void;
}) {
  const grouped = groupEntriesByDay(entries, days, timeZone);
  const today = dateKeyInZone(new Date(), timeZone);
  return (
    <section className="space-y-3" aria-label={`${view} calendar`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label={`Previous ${view}`}
            onClick={() => onAnchorChange(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onAnchorChange(0)}
          >
            Today
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label={`Next ${view}`}
            onClick={() => onAnchorChange(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h2 className="order-first w-full text-lg font-semibold sm:order-none sm:w-auto">
          {view === "month"
            ? format(anchor, "MMMM yyyy")
            : `${format(days[0], "MMM d")} – ${format(days.at(-1)!, "MMM d, yyyy")}`}
        </h2>
        <div
          className="flex rounded-md border p-0.5"
          aria-label="Calendar view"
        >
          {(["month", "week"] as const).map((option) => (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={view === option ? "secondary" : "ghost"}
              aria-pressed={view === option}
              onClick={() => onViewChange(option)}
            >
              {option === "month" ? "Month" : "Week"}
            </Button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <div className="min-w-[700px]">
          <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-semibold text-muted-foreground">
            {[
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ].map((day) => (
              <div key={day} className="p-2">
                <span className="sm:hidden">{day.slice(0, 3)}</span>
                <span className="hidden sm:inline">{day}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayEntries = grouped.get(key) ?? [];
              return (
                <div
                  key={key}
                  className={cn(
                    "min-h-32 border-b border-r p-1.5 last:border-r-0",
                    view === "week" && "min-h-80",
                    view === "month" &&
                      !isSameMonth(day, anchor) &&
                      "bg-muted/20",
                  )}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <time
                      dateTime={key}
                      className={cn(
                        "flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-xs",
                        key === today &&
                          "bg-primary font-semibold text-primary-foreground",
                        view === "month" &&
                          !isSameMonth(day, anchor) &&
                          "text-muted-foreground",
                      )}
                    >
                      {format(day, view === "week" ? "MMM d" : "d")}
                    </time>
                    {dayEntries.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        {dayEntries.length}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {dayEntries.map((entry) => (
                      <EntryButton
                        key={`${key}-${entry.id}`}
                        entry={entry}
                        timeZone={timeZone}
                        onSelect={onSelect}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Times use {timeZone}. Swipe horizontally on a narrow screen to inspect
        every day.
      </p>
    </section>
  );
}
