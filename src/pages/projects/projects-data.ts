import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useProjectScope } from "./project-scope.ts";
import {
  getAllProjects,
  getMilestones,
  getSprints,
  getTasks,
} from "@/lib/api/projects.ts";

/** All Projects views share this snapshot, including Gantt and edit selectors. */
export function useProjectsData() {
  return useQuery({
    queryKey: ["projects", "data"],
    queryFn: async ({ signal }) => {
      const [projects, sprints, tasks, milestones] = await Promise.all([
        getAllProjects({ signal }),
        getSprints(undefined, { signal }),
        getTasks(undefined, { signal }),
        getMilestones(undefined, { signal }),
      ]);
      return { projects, sprints, tasks, milestones };
    },
  });
}

export type ProjectsData = NonNullable<
  ReturnType<typeof useProjectsData>["data"]
>;

export function scopeProjectsData(
  data: ProjectsData,
  projectId: string,
): ProjectsData {
  return {
    projects: data.projects.filter((project) => project.id === projectId),
    sprints: data.sprints.filter((sprint) => sprint.project_id === projectId),
    tasks: data.tasks.filter((task) => task.project_id === projectId),
    milestones: data.milestones.filter(
      (milestone) => milestone.project_id === projectId,
    ),
  };
}

/** Scope observers, never overwrite the shared cache with a partial snapshot. */
export function useProjectsViewData() {
  const query = useProjectsData();
  const projectId = useProjectScope();
  const data = useMemo(
    () =>
      query.data && projectId !== undefined
        ? scopeProjectsData(query.data, projectId)
        : query.data,
    [query.data, projectId],
  );
  return { ...query, data };
}

export function summarizeProjects(
  data: NonNullable<ReturnType<typeof useProjectsData>["data"]>,
) {
  const activeSprints = new Set(
    data.sprints.filter((s) => s.status === "active").map((s) => s.id),
  );
  return {
    activeProjects: data.projects.filter((p) => p.status === "active").length,
    activeSprints: activeSprints.size,
    openTasks: data.tasks.filter((t) => t.status !== "done").length,
    // Multiple active sprints are valid; never silently select just the first.
    sprintPoints: data.tasks
      .filter((t) => t.sprint_id !== null && activeSprints.has(t.sprint_id))
      .reduce((sum, t) => sum + t.story_points, 0),
  };
}
