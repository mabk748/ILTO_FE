import { useMemo, useEffect, useRef } from "react";
import { useProjectsData } from "../projects-data.ts";
import {
  parseCalendarDate,
  isCalendarDateOverdue,
} from "@/lib/calendar-date.ts";
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
  const { data, error, isPending: loading, refetch } = useProjectsData();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { rows, rangeStart, totalDays } = useMemo(() => {
    const rows: GanttRow[] = [];
    const dates = [startOfDay(new Date())];
    for (const project of data?.projects ?? []) {
      rows.push({ kind: "project", project });
      dates.push(parseCalendarDate(project.start_date));
      if (project.end_date) dates.push(parseCalendarDate(project.end_date));
      for (const sprint of data?.sprints.filter(
        (s) => s.project_id === project.id,
      ) ?? []) {
        rows.push({ kind: "sprint", sprint, project });
        dates.push(
          parseCalendarDate(sprint.start_date),
          parseCalendarDate(sprint.end_date),
        );
      }
      for (const milestone of data?.milestones.filter(
        (m) => m.project_id === project.id,
      ) ?? []) {
        rows.push({ kind: "milestone", milestone, project });
        dates.push(parseCalendarDate(milestone.due_date));
      }
    }
    const min = dates.reduce((a, b) => (a < b ? a : b));
    const max = dates.reduce((a, b) => (a > b ? a : b));
    const rangeStart = addDays(min, -7);
    return {
      rows,
      rangeStart,
      totalDays: differenceInDays(addDays(max, 14), rangeStart) + 1,
    };
  }, [data]);
  // Keep very long valid date ranges usable instead of creating millions of cells.
  const columnWidth = Math.min(COLUMN_WIDTH, 10_000 / totalDays);
  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollLeft = Math.max(
        0,
        differenceInDays(startOfDay(new Date()), rangeStart) * columnWidth -
          120,
      );
  }, [rangeStart, columnWidth, loading]);

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
        onRetry={() => void refetch()}
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
  const tickDays = Math.max(7, Math.ceil(totalDays / 150 / 7) * 7);
  let d = 0;
  while (d < totalDays) {
    const weekStart = addDays(rangeStart, d);
    const daysLeft = totalDays - d;
    const span = Math.min(tickDays, daysLeft);
    weeks.push({
      label: format(weekStart, "MMM d"),
      startDay: d,
      span,
    });
    d += tickDays;
  }

  const todayOffset = differenceInDays(startOfDay(new Date()), rangeStart);
  const totalWidth = totalDays * columnWidth;
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
            let label: string;
            let indent: number;
            let weight = "font-medium";
            if (row.kind === "project") {
              label = row.project.end_date
                ? row.project.name
                : `${row.project.name} (no end date)`;
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
                  style={{ width: w.span * columnWidth }}
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
                  style={{ left: todayOffset * columnWidth }}
                />
              )}
            </div>

            {/* Rows */}
            {rows.map((row) => {
              let barLeft: number;
              let barWidth: number;
              let status: string;
              let label: string;

              if (row.kind === "project") {
                const start = parseCalendarDate(row.project.start_date);
                const end = row.project.end_date
                  ? parseCalendarDate(row.project.end_date)
                  : start;
                barLeft = differenceInDays(start, rangeStart) * columnWidth;
                barWidth = (differenceInDays(end, start) + 1) * columnWidth;
                status = row.project.status;
                label = row.project.end_date
                  ? row.project.name
                  : `${row.project.name} (no end date)`;
              } else if (row.kind === "sprint") {
                const start = parseCalendarDate(row.sprint.start_date);
                const end = parseCalendarDate(row.sprint.end_date);
                barLeft = differenceInDays(start, rangeStart) * columnWidth;
                barWidth = (differenceInDays(end, start) + 1) * columnWidth;
                status = row.sprint.status;
                label = row.sprint.name;
              } else {
                const due = parseCalendarDate(row.milestone.due_date);
                const isDone = row.milestone.completed_at !== null;
                const isOverdue =
                  !isDone && isCalendarDateOverdue(row.milestone.due_date);
                barLeft = differenceInDays(due, rangeStart) * columnWidth - 6;
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
                      style={{ left: w.startDay * columnWidth }}
                    />
                  ))}

                  {/* Today line */}
                  {todayOffset >= 0 && todayOffset <= totalDays && (
                    <div
                      className="absolute top-0 bottom-0 w-px bg-primary/30 z-10"
                      style={{ left: todayOffset * columnWidth }}
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

      <p className="px-4 py-2 text-xs text-muted-foreground">
        Projects without an end date show only their start; no duration is
        assumed.
      </p>
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
