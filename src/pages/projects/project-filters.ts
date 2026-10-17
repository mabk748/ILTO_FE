import { useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type {
  Milestone,
  Priority,
  Project,
  ProjectStatus,
  Sprint,
  SprintStatus,
  Task,
  TaskCategory,
  TaskStatus,
} from "@/lib/api/types.ts";
import { TASK_CATEGORIES } from "./task-model.ts";

export const NO_SPRINT_FILTER = "__no_sprint__";
export const UNASSIGNED_FILTER = "__unassigned__";
export const GANTT_ITEM_TYPES = ["project", "sprint", "milestone"] as const;

export type GanttItemType = (typeof GANTT_ITEM_TYPES)[number];
export type TaskStatusFilter = "not_done" | TaskStatus;

type MultiFilterKey = "project" | "sprint" | "milestone" | "gantt_type";
type SingleFilterKey =
  | "task_status"
  | "priority"
  | "category"
  | "assignee"
  | "sprint_status"
  | "project_status"
  | "project_priority";

export interface ProjectsFilterCollections {
  projects: readonly Project[];
  sprints: readonly Sprint[];
  tasks: readonly Task[];
  milestones: readonly Milestone[];
}

export interface ProjectsFilters {
  projectIds: string[];
  sprintIds: string[];
  milestoneIds: string[];
  taskStatus: TaskStatusFilter | null;
  taskPriority: Priority | null;
  taskCategory: TaskCategory | null;
  taskAssignee: string | null;
  sprintStatus: SprintStatus | null;
  projectStatus: ProjectStatus | null;
  projectPriority: Priority | null;
  ganttItemTypes: GanttItemType[];
}

export interface ProjectsFilterState {
  filters: ProjectsFilters;
  setProjectIds: (values: readonly string[]) => void;
  setMulti: (
    key: Exclude<MultiFilterKey, "project">,
    values: readonly string[],
  ) => void;
  setSingle: (key: SingleFilterKey, value: string | null) => void;
  clear: (keys: readonly (MultiFilterKey | SingleFilterKey)[]) => void;
}

const EMPTY_PROJECTS_DATA: ProjectsFilterCollections = {
  projects: [],
  sprints: [],
  tasks: [],
  milestones: [],
};

const PROJECT_STATUSES = [
  "planning",
  "active",
  "on_hold",
  "completed",
  "archived",
] as const satisfies readonly ProjectStatus[];
const SPRINT_STATUSES = [
  "planned",
  "active",
  "completed",
] as const satisfies readonly SprintStatus[];
const TASK_STATUSES = [
  "not_done",
  "backlog",
  "todo",
  "in_progress",
  "review",
  "done",
] as const satisfies readonly TaskStatusFilter[];
const PRIORITIES = [
  "low",
  "medium",
  "high",
  "critical",
] as const satisfies readonly Priority[];

function uniqueValid(values: readonly string[], allowed: ReadonlySet<string>) {
  return Array.from(new Set(values.filter((value) => allowed.has(value))));
}

function validSingle<T extends string>(
  value: string | null,
  allowed: readonly T[],
): T | null {
  return value && allowed.includes(value as T) ? (value as T) : null;
}

function replaceValues(
  params: URLSearchParams,
  key: string,
  values: readonly string[],
) {
  params.delete(key);
  for (const value of values) params.append(key, value);
}

function replaceSingle(
  params: URLSearchParams,
  key: string,
  value: string | null,
) {
  if (value) params.set(key, value);
  else params.delete(key);
}

export function useProjectsFilters(
  collections: ProjectsFilterCollections | undefined,
): ProjectsFilterState {
  const [searchParams, setSearchParams] = useSearchParams();
  const availableCollections = collections ?? EMPTY_PROJECTS_DATA;
  const filters = useMemo<ProjectsFilters>(() => {
    const projectIds = uniqueValid(
      searchParams.getAll("project"),
      new Set(availableCollections.projects.map((project) => project.id)),
    );
    const projectScope = new Set(projectIds);
    const visibleSprints = availableCollections.sprints.filter(
      (sprint) =>
        projectIds.length === 0 || projectScope.has(sprint.project_id),
    );
    const visibleMilestones = availableCollections.milestones.filter(
      (milestone) =>
        projectIds.length === 0 || projectScope.has(milestone.project_id),
    );
    const sprintIds = uniqueValid(
      searchParams.getAll("sprint"),
      new Set([...visibleSprints.map((sprint) => sprint.id), NO_SPRINT_FILTER]),
    );
    const milestoneIds = uniqueValid(
      searchParams.getAll("milestone"),
      new Set(visibleMilestones.map((milestone) => milestone.id)),
    );
    const assignees = new Set([
      UNASSIGNED_FILTER,
      ...availableCollections.tasks.flatMap((task) =>
        task.assignee?.trim() ? [task.assignee] : [],
      ),
    ]);

    return {
      projectIds,
      sprintIds,
      milestoneIds,
      taskStatus: validSingle(searchParams.get("task_status"), TASK_STATUSES),
      taskPriority: validSingle(searchParams.get("priority"), PRIORITIES),
      taskCategory: validSingle(searchParams.get("category"), TASK_CATEGORIES),
      taskAssignee:
        searchParams.get("assignee") &&
        assignees.has(searchParams.get("assignee")!)
          ? searchParams.get("assignee")
          : null,
      sprintStatus: validSingle(
        searchParams.get("sprint_status"),
        SPRINT_STATUSES,
      ),
      projectStatus: validSingle(
        searchParams.get("project_status"),
        PROJECT_STATUSES,
      ),
      projectPriority: validSingle(
        searchParams.get("project_priority"),
        PRIORITIES,
      ),
      ganttItemTypes: uniqueValid(
        searchParams.getAll("gantt_type"),
        new Set(GANTT_ITEM_TYPES),
      ) as GanttItemType[],
    };
  }, [availableCollections, searchParams]);

  useEffect(() => {
    if (!collections) return;
    const sanitized = new URLSearchParams(searchParams);
    replaceValues(sanitized, "project", filters.projectIds);
    replaceValues(sanitized, "sprint", filters.sprintIds);
    replaceValues(sanitized, "milestone", filters.milestoneIds);
    replaceValues(sanitized, "gantt_type", filters.ganttItemTypes);
    replaceSingle(sanitized, "task_status", filters.taskStatus);
    replaceSingle(sanitized, "priority", filters.taskPriority);
    replaceSingle(sanitized, "category", filters.taskCategory);
    replaceSingle(sanitized, "assignee", filters.taskAssignee);
    replaceSingle(sanitized, "sprint_status", filters.sprintStatus);
    replaceSingle(sanitized, "project_status", filters.projectStatus);
    replaceSingle(sanitized, "project_priority", filters.projectPriority);
    if (sanitized.toString() !== searchParams.toString()) {
      setSearchParams(sanitized, { replace: true });
    }
  }, [collections, filters, searchParams, setSearchParams]);

  const update = useCallback(
    (change: (params: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams);
      change(next);
      setSearchParams(next);
    },
    [searchParams, setSearchParams],
  );

  const setProjectIds = useCallback(
    (values: readonly string[]) => {
      const nextProjects = uniqueValid(
        values,
        new Set(availableCollections.projects.map((project) => project.id)),
      );
      const scope = new Set(nextProjects);
      const allowedSprints = new Set([
        ...availableCollections.sprints
          .filter(
            (sprint) =>
              nextProjects.length === 0 || scope.has(sprint.project_id),
          )
          .map((sprint) => sprint.id),
        NO_SPRINT_FILTER,
      ]);
      const allowedMilestones = new Set(
        availableCollections.milestones
          .filter(
            (milestone) =>
              nextProjects.length === 0 || scope.has(milestone.project_id),
          )
          .map((milestone) => milestone.id),
      );
      update((next) => {
        replaceValues(next, "project", nextProjects);
        replaceValues(
          next,
          "sprint",
          filters.sprintIds.filter((id) => allowedSprints.has(id)),
        );
        replaceValues(
          next,
          "milestone",
          filters.milestoneIds.filter((id) => allowedMilestones.has(id)),
        );
      });
    },
    [availableCollections, filters.milestoneIds, filters.sprintIds, update],
  );

  const setMulti = useCallback(
    (key: Exclude<MultiFilterKey, "project">, values: readonly string[]) =>
      update((next) => replaceValues(next, key, values)),
    [update],
  );

  const setSingle = useCallback(
    (key: SingleFilterKey, value: string | null) =>
      update((next) => replaceSingle(next, key, value)),
    [update],
  );

  const clear = useCallback(
    (keys: readonly (MultiFilterKey | SingleFilterKey)[]) =>
      update((next) => {
        for (const key of keys) next.delete(key);
      }),
    [update],
  );

  return { filters, setProjectIds, setMulti, setSingle, clear };
}
