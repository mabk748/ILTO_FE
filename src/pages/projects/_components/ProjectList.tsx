import { useProjectsData } from "../projects-data.ts";
import LoadError from "@/components/LoadError.tsx";
import { formatCalendarDate } from "@/lib/calendar-date.ts";
import ResourceControls from "./ResourceControls.tsx";
import { useProjectsFilters } from "../project-filters.ts";
import {
  FilterSelect,
  FilteredEmptyState,
  ProjectFilterBar,
} from "./ProjectFilterBar.tsx";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { ModuleSectionHeader } from "@/components/layout/ModulePage.tsx";
import type { Project } from "@/lib/api/types.ts";
import ProjectDeleteDialog from "./ProjectDeleteDialog.tsx";
import { Link } from "react-router-dom";

const PROJECT_FILTER_KEYS = ["project_status", "project_priority"] as const;
export default function ProjectList() {
  const [deleting, setDeleting] = useState<Project | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const list = useRef<HTMLElement>(null);
  return (
    <section
      ref={list}
      tabIndex={-1}
      aria-label="Projects list"
      className="space-y-3"
    >
      <ProjectListContents
        onDeleteContents={(project, button) => {
          trigger.current = button;
          setDeleting(project);
        }}
      />
      {deleting && (
        <ProjectDeleteDialog
          key={deleting.id}
          project={deleting}
          onClose={() => setDeleting(null)}
          restoreFocus={() => {
            if (trigger.current?.isConnected) trigger.current.focus();
            else list.current?.focus();
          }}
        />
      )}
    </section>
  );
}

function ProjectListContents({
  onDeleteContents,
}: {
  onDeleteContents: (project: Project, button: HTMLButtonElement) => void;
}) {
  const { data, error, isPending, refetch } = useProjectsData();
  const filterState = useProjectsFilters(data);
  if (isPending) return <p role="status">Loading projects…</p>;
  if (error) return <LoadError error={error} onRetry={() => void refetch()} />;
  const { filters } = filterState;
  const visibleProjects = data.projects.filter(
    (project) =>
      (!filters.projectStatus || project.status === filters.projectStatus) &&
      (!filters.projectPriority ||
        project.priority === filters.projectPriority),
  );
  const activeLabels = [
    filters.projectStatus
      ? `Status: ${filters.projectStatus.replaceAll("_", " ")}`
      : null,
    filters.projectPriority ? `Priority: ${filters.projectPriority}` : null,
  ].filter((value): value is string => value !== null);
  const clearFilters = () => filterState.clear(PROJECT_FILTER_KEYS);
  return (
    <div className="space-y-3">
      <ModuleSectionHeader
        title="Project records"
        description="Open a workspace or maintain the Project record and its contents."
      />
      <ProjectFilterBar
        total={data.projects.length}
        shown={visibleProjects.length}
        noun="project"
        activeLabels={activeLabels}
        onClear={clearFilters}
      >
        <FilterSelect
          label="Project status"
          allLabel="All statuses"
          value={filters.projectStatus}
          options={[
            { value: "planning", label: "Planning" },
            { value: "active", label: "Active" },
            { value: "on_hold", label: "On hold" },
            { value: "completed", label: "Completed" },
            { value: "archived", label: "Archived" },
          ]}
          onChange={(value) => filterState.setSingle("project_status", value)}
        />
        <FilterSelect
          label="Project priority"
          allLabel="All priorities"
          value={filters.projectPriority}
          options={[
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" },
            { value: "critical", label: "Critical" },
          ]}
          onChange={(value) => filterState.setSingle("project_priority", value)}
        />
      </ProjectFilterBar>
      {!data.projects.length && (
        <p>
          No projects yet. Create a project to add sprints, tasks, and
          milestones.
        </p>
      )}
      {data.projects.length > 0 && visibleProjects.length === 0 && (
        <FilteredEmptyState noun="projects" onClear={clearFilters} />
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleProjects.map((project) => (
          <article
            key={project.id}
            className="flex min-w-0 flex-col gap-4 rounded-xl border border-border/70 bg-card/55 p-4 shadow-sm transition-colors hover:border-primary/35"
          >
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate font-mono font-semibold">
                  {project.name}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {project.priority} priority
                </p>
              </div>
              <Badge
                variant={
                  project.status === "completed"
                    ? "success"
                    : project.status === "on_hold"
                      ? "warning"
                      : project.status === "active"
                        ? "default"
                        : "secondary"
                }
              >
                {project.status.replaceAll("_", " ")}
              </Badge>
            </div>
            <p className="line-clamp-3 min-h-10 whitespace-pre-wrap text-sm text-muted-foreground">
              {project.description || "No description provided."}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatCalendarDate(project.start_date)} –{" "}
              {project.end_date
                ? formatCalendarDate(project.end_date)
                : "No end date"}
            </p>
            <div className="mt-auto space-y-3 border-t border-border/60 pt-3">
              <Button asChild size="sm" className="w-full">
                <Link
                  to={`/projects/${encodeURIComponent(project.id)}`}
                  aria-label={`Open project: ${project.name}`}
                >
                  Open project
                </Link>
              </Button>
              <div className="flex flex-wrap items-center gap-2">
                <ResourceControls
                  target={{ kind: "project", record: project }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-auto whitespace-normal text-left"
                  aria-label={`Delete project and contents: ${project.name}`}
                  onClick={(event) =>
                    onDeleteContents(project, event.currentTarget)
                  }
                >
                  Delete with contents
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
