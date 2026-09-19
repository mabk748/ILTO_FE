import { useProjectsData } from "../projects-data.ts";
import LoadError from "@/components/LoadError.tsx";
import { formatCalendarDate } from "@/lib/calendar-date.ts";
import ResourceControls from "./ResourceControls.tsx";

export default function ProjectList() {
  const { data, error, isPending, refetch } = useProjectsData();
  if (isPending) return <p role="status">Loading projects…</p>;
  if (error) return <LoadError error={error} onRetry={() => void refetch()} />;
  return (
    <div className="space-y-3">
      {!data.projects.length && (
        <p>
          No projects yet. Create a project to add sprints, tasks, and
          milestones.
        </p>
      )}
      {data.projects.map((project) => (
        <article key={project.id} className="rounded-lg border p-4 space-y-2">
          <h2 className="font-semibold">{project.name}</h2>
          <p className="text-sm whitespace-pre-wrap">{project.description}</p>
          <p className="text-sm text-muted-foreground">
            {project.status.replaceAll("_", " ")} · {project.priority} priority
          </p>
          <p className="text-sm">
            {formatCalendarDate(project.start_date)} –{" "}
            {project.end_date
              ? formatCalendarDate(project.end_date)
              : "No end date"}
          </p>
          <ResourceControls target={{ kind: "project", record: project }} />
        </article>
      ))}
    </div>
  );
}
