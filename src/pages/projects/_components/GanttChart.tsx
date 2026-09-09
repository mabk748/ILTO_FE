import { useState, useEffect, useRef } from "react";
import { getMilestones, getProjects, getSprints } from "@/lib/api/projects.ts";
import type { Milestone, Project, Sprint } from "@/lib/api/types.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";
import { addDays, differenceInDays, format, startOfDay } from "date-fns";
import LoadError from "@/components/LoadError.tsx";

const COLUMN_WIDTH = 36; // px per day
const ROW_HEIGHT = 40;

type GanttRow =
  | { kind: "project"; project: Project }
  | { kind: "sprint"; sprint: Sprint; project: Project }
  | { kind: "milestone"; milestone: Milestone; project: Project };

function getRowKey(row: GanttRow): string {
  if (row.kind === "project") return `project-${row.project.id}`;
  if (row.kind === "sprint") return `sprint-${row.sprint.id}`;
  return `milestone-${row.milestone.id}`;
}

function getBarColor(kind: GanttRow["kind"], status: string) {
  if (kind === "milestone") {
    if (status === "completed") return "bg-green-500/70 border-green-500";
    if (status === "overdue") return "bg-destructive/70 border-destructive";
    return "bg-primary/70 border-primary";
  }
  if (kind === "sprint") {
    if (status === "completed") return "bg-green-500/40 border-green-500/60";
    if (status === "active") return "bg-primary/40 border-primary/60";
    return "bg-muted border-border";
  }
  // project
  if (status === "completed") return "bg-green-500/30 border-green-500/50";
  if (status === "active") return "bg-accent/30 border-accent/50";
  return "bg-muted border-border";
}

export default function GanttChart() {
  const [rows, setRows] = useState<GanttRow[]>([]);
  const [rangeStart, setRangeStart] = useState<Date>(new Date());
  const [totalDays, setTotalDays] = useState(90);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    let scrollTimer: ReturnType<typeof setTimeout> | undefined;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [pData, sprints, milestones] = await Promise.all([
          getProjects(),
          getSprints(),
          getMilestones(),
        ]);
        if (!active) return;
        const projects = pData.data;
        const built: GanttRow[] = [];

        // Find overall range
        const dates: Date[] = [];
        projects.forEach((p) => {
          dates.push(new Date(p.start_date));
          dates.push(
            p.end_date ? new Date(p.end_date) : addDays(new Date(), 30),
          );
        });
        sprints.forEach((s) => {
          dates.push(new Date(s.start_date));
          dates.push(new Date(s.end_date));
        });
        milestones.forEach((m) => {
          dates.push(new Date(m.due_date));
        });

        const minDate = dates.reduce((a, b) => (a < b ? a : b), new Date());
        const maxDate = dates.reduce((a, b) => (a > b ? a : b), new Date());
        const start = startOfDay(addDays(minDate, -7));
        const end = addDays(maxDate, 14);
        const days = differenceInDays(end, start) + 1;

        setRangeStart(start);
        setTotalDays(days);

        // Build rows: project → sprints for that project → milestones for that project
        projects.forEach((p) => {
          built.push({ kind: "project", project: p });
          sprints
            .filter((s) => s.project_id === p.id)
            .forEach((s) =>
              built.push({ kind: "sprint", sprint: s, project: p }),
            );
          milestones
            .filter((m) => m.project_id === p.id)
            .forEach((m) =>
              built.push({ kind: "milestone", milestone: m, project: p }),
            );
        });

        setRows(built);

        // Scroll to today
        const todayOffset = differenceInDays(startOfDay(new Date()), start);
        scrollTimer = setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollLeft = Math.max(
              0,
              todayOffset * COLUMN_WIDTH - 120,
            );
          }
        }, 50);
      } catch (loadError) {
        if (active) setError(loadError);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
      if (scrollTimer) clearTimeout(scrollTimer);
    };
  }, [loadAttempt]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <LoadError
        error={error}
        onRetry={() => setLoadAttempt((attempt) => attempt + 1)}
        title="Could not load the project timeline"
      />
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        No project timeline data yet.
      </div>
    );
  }

  // Build week header columns
  const weeks: { label: string; startDay: number; span: number }[] = [];
  let d = 0;
  while (d < totalDays) {
    const weekStart = addDays(rangeStart, d);
    const daysLeft = totalDays - d;
    const span = Math.min(7, daysLeft);
    weeks.push({
      label: format(weekStart, "MMM d"),
      startDay: d,
      span,
    });
    d += 7;
  }

  const todayOffset = differenceInDays(startOfDay(new Date()), rangeStart);
  const totalWidth = totalDays * COLUMN_WIDTH;
  const LABEL_WIDTH = 180;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex">
        {/* Sticky label column */}
        <div
          className="shrink-0 border-r border-border bg-card z-10"
          style={{ width: LABEL_WIDTH }}
        >
          {/* Header spacer */}
          <div
            className="border-b border-border bg-muted/40 px-3 flex items-center"
            style={{ height: ROW_HEIGHT }}
          >
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Item
            </span>
          </div>
          {rows.map((row) => {
            let label = "";
            let indent = 0;
            let weight = "font-medium";
            if (row.kind === "project") {
              label = row.project.name;
              indent = 0;
              weight = "font-bold";
            } else if (row.kind === "sprint") {
              label = row.sprint.name;
              indent = 12;
            } else {
              label = row.milestone.title;
              indent = 24;
            }
            return (
              <div
                key={getRowKey(row)}
                className={cn(
                  "border-b border-border last:border-0 flex items-center px-3 truncate",
                  row.kind === "project" && "bg-muted/20",
                )}
                style={{ height: ROW_HEIGHT, paddingLeft: indent + 12 }}
              >
                <span className={cn("text-xs truncate", weight)}>
                  {row.kind === "milestone" && (
                    <span className="text-primary mr-1">◆</span>
                  )}
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Scrollable timeline */}
        <div ref={scrollRef} className="overflow-x-auto flex-1 relative">
          <div style={{ width: totalWidth, minWidth: totalWidth }}>
            {/* Week header */}
            <div
              className="flex border-b border-border bg-muted/40 relative"
              style={{ height: ROW_HEIGHT }}
            >
              {weeks.map((w) => (
                <div
                  key={w.startDay}
                  className="border-r border-border/40 px-2 flex items-center shrink-0"
                  style={{ width: w.span * COLUMN_WIDTH }}
                >
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    {w.label}
                  </span>
                </div>
              ))}
              {/* Today line in header */}
              {todayOffset >= 0 && todayOffset <= totalDays && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-primary/60 z-20"
                  style={{ left: todayOffset * COLUMN_WIDTH }}
                />
              )}
            </div>

            {/* Rows */}
            {rows.map((row) => {
              let barLeft = 0;
              let barWidth = 0;
              let status = "";
              let label = "";

              if (row.kind === "project") {
                const start = new Date(row.project.start_date);
                const end = row.project.end_date
                  ? new Date(row.project.end_date)
                  : addDays(new Date(), 30);
                barLeft = differenceInDays(start, rangeStart) * COLUMN_WIDTH;
                barWidth = (differenceInDays(end, start) + 1) * COLUMN_WIDTH;
                status = row.project.status;
                label = row.project.name;
              } else if (row.kind === "sprint") {
                const start = new Date(row.sprint.start_date);
                const end = new Date(row.sprint.end_date);
                barLeft = differenceInDays(start, rangeStart) * COLUMN_WIDTH;
                barWidth = (differenceInDays(end, start) + 1) * COLUMN_WIDTH;
                status = row.sprint.status;
                label = row.sprint.name;
              } else {
                const due = new Date(row.milestone.due_date);
                const isDone = row.milestone.completed_at !== null;
                const isOverdue = !isDone && due < new Date();
                barLeft = differenceInDays(due, rangeStart) * COLUMN_WIDTH - 6;
                barWidth = 12;
                status = isDone
                  ? "completed"
                  : isOverdue
                    ? "overdue"
                    : "pending";
                label = row.milestone.title;
              }

              const color = getBarColor(row.kind, status);

              return (
                <div
                  key={getRowKey(row)}
                  className={cn(
                    "border-b border-border last:border-0 relative",
                    row.kind === "project" && "bg-muted/10",
                  )}
                  style={{ height: ROW_HEIGHT, width: totalWidth }}
                >
                  {/* Grid lines */}
                  {weeks.map((w, wi) => (
                    <div
                      key={wi}
                      className="absolute top-0 bottom-0 border-r border-border/20"
                      style={{ left: w.startDay * COLUMN_WIDTH }}
                    />
                  ))}

                  {/* Today line */}
                  {todayOffset >= 0 && todayOffset <= totalDays && (
                    <div
                      className="absolute top-0 bottom-0 w-px bg-primary/30 z-10"
                      style={{ left: todayOffset * COLUMN_WIDTH }}
                    />
                  )}

                  {/* Bar */}
                  {barWidth > 0 && (
                    <div
                      className={cn(
                        "absolute top-1/2 -translate-y-1/2 rounded border flex items-center overflow-hidden",
                        row.kind === "milestone"
                          ? "rounded-sm rotate-45"
                          : "rounded",
                        color,
                      )}
                      style={{
                        left: Math.max(0, barLeft),
                        width:
                          row.kind === "milestone"
                            ? barWidth
                            : Math.max(barWidth, 8),
                        height: row.kind === "milestone" ? 12 : 22,
                      }}
                      title={label}
                    >
                      {row.kind !== "milestone" && barWidth > 60 && (
                        <span className="text-[10px] font-semibold px-2 truncate">
                          {label}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-border bg-muted/20">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 rounded bg-accent/30 border border-accent/50" />
          <span className="text-[10px] text-muted-foreground">Project</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 rounded bg-primary/40 border border-primary/60" />
          <span className="text-[10px] text-muted-foreground">Sprint</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rotate-45 bg-primary/70 border border-primary" />
          <span className="text-[10px] text-muted-foreground">Milestone</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-px h-4 bg-primary/60" />
          <span className="text-[10px] text-muted-foreground">Today</span>
        </div>
      </div>
    </div>
  );
}
