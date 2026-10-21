import { useSearchParams } from "react-router-dom";
import { GitBranch } from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import type { ProjectsData } from "../projects-data.ts";
import { NO_WORKSTREAM_FILTER } from "../project-filters.ts";
import ResourceControls from "./ResourceControls.tsx";

export default function WorkstreamPanel({ data }: { data: ProjectsData }) {
  const [params, setParams] = useSearchParams();
  const openTasks = (workstreamId: string) => {
    const next = new URLSearchParams(params);
    next.set("view", "board");
    next.delete("task");
    next.delete("workstream");
    next.append("workstream", workstreamId);
    setParams(next);
  };

  return (
    <section
      aria-labelledby="workstreams-heading"
      className="space-y-3 rounded-xl border border-border/70 bg-card/55 p-3 sm:p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <GitBranch className="size-4 text-primary" aria-hidden="true" />
            <h3 id="workstreams-heading" className="font-mono font-semibold">
              Workstreams
            </h3>
          </div>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
            Persistent areas of responsibility within this Project. Sprints are
            separate, time-bounded delivery cycles and may optionally belong to
            a Workstream.
          </p>
        </div>
        <ResourceControls
          target={{ kind: "workstream" }}
          triggerVariant="outline"
        />
      </div>

      {data.workstreams.length === 0 ? (
        <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          No Workstreams yet. Existing Tasks and Sprints remain unassigned.
        </p>
      ) : (
        <ul className="grid gap-2 lg:grid-cols-2">
          {data.workstreams.map((workstream) => {
            const taskCount = data.tasks.filter(
              (task) => task.workstream_id === workstream.id,
            ).length;
            const sprintCount = data.sprints.filter(
              (sprint) => sprint.workstream_id === workstream.id,
            ).length;
            return (
              <li
                key={workstream.id}
                className="flex min-w-0 flex-col gap-3 rounded-lg border border-border/70 bg-background/45 p-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="break-words text-sm font-semibold">
                      {workstream.name}
                    </span>
                    <Badge
                      variant={
                        workstream.status === "active" ? "success" : "outline"
                      }
                    >
                      {workstream.status}
                    </Badge>
                  </div>
                  {workstream.description && (
                    <p className="whitespace-pre-wrap break-words text-xs text-muted-foreground">
                      {workstream.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {taskCount} {taskCount === 1 ? "Task" : "Tasks"} ·{" "}
                    {sprintCount} {sprintCount === 1 ? "Sprint" : "Sprints"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={`View tasks in ${workstream.name}`}
                    onClick={() => openTasks(workstream.id)}
                  >
                    View Tasks
                  </Button>
                  <ResourceControls
                    target={{ kind: "workstream", record: workstream }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => openTasks(NO_WORKSTREAM_FILTER)}
      >
        View unassigned Tasks
      </Button>
    </section>
  );
}
