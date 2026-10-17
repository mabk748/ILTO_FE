import { parseCalendarDate } from "@/lib/calendar-date.ts";
import {
  MAX_IMPORT_ROWS,
  parseImportFile,
  type ImportFileFormat,
  type ImportSourceRow,
} from "@/lib/import/file-parser.ts";
import type {
  ProjectImportMilestone,
  ProjectImportProject,
  ProjectImportRequest,
  ProjectImportResource,
  ProjectImportSprint,
  ProjectImportTask,
  ProjectImportReference,
} from "@/lib/api/projects.ts";
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
import { priorities, statuses } from "./project-editor.ts";
import { TASK_CATEGORIES } from "./task-model.ts";

export const PROJECT_IMPORT_RESOURCES = [
  "projects",
  "sprints",
  "tasks",
  "milestones",
] as const satisfies readonly ProjectImportResource[];

export interface ProjectImportContext {
  projects: Project[];
  sprints: Sprint[];
  tasks: Task[];
  milestones: Milestone[];
}

export type ProjectImportSource =
  | {
      kind: "single";
      format: ImportFileFormat;
      fields: string[];
      rows: ImportSourceRow[];
    }
  | {
      kind: "package";
      format: "json";
      resources: Record<ProjectImportResource, ImportSourceRow[]>;
    };

export interface ImportFieldDefinition {
  key: string;
  label: string;
  required: boolean;
}

export type ProjectImportMapping = Record<string, string | null>;
export type PreviewStatus = "valid" | "warning" | "invalid";

export interface ProjectImportPreviewRow {
  resource: ProjectImportResource;
  row: number;
  label: string;
  relationship: string;
  status: PreviewStatus;
  issues: string[];
  category: string;
  priority: string;
  taskStatus: string;
}

export interface PreparedProjectImport {
  request: ProjectImportRequest;
  rows: ProjectImportPreviewRow[];
  valid: number;
  warnings: number;
  invalid: number;
}

const RESOURCE_FIELDS: Record<
  ProjectImportResource,
  readonly ImportFieldDefinition[]
> = {
  projects: [
    { key: "import_key", label: "Import key", required: false },
    { key: "name", label: "Name", required: true },
    { key: "description", label: "Description", required: false },
    { key: "status", label: "Status", required: true },
    { key: "priority", label: "Priority", required: true },
    { key: "start_date", label: "Start date", required: true },
    { key: "end_date", label: "End date", required: false },
  ],
  sprints: [
    { key: "import_key", label: "Import key", required: false },
    { key: "project_ref", label: "Project", required: true },
    { key: "name", label: "Name", required: true },
    { key: "goal", label: "Goal", required: false },
    { key: "status", label: "Status", required: true },
    { key: "start_date", label: "Start date", required: true },
    { key: "end_date", label: "End date", required: true },
  ],
  tasks: [
    { key: "project_ref", label: "Project", required: true },
    { key: "sprint_ref", label: "Sprint", required: false },
    { key: "title", label: "Title", required: true },
    { key: "description", label: "Description", required: false },
    { key: "status", label: "Status", required: true },
    { key: "priority", label: "Priority", required: true },
    { key: "category", label: "Category", required: true },
    { key: "story_points", label: "Story points", required: true },
    {
      key: "acceptance_criteria",
      label: "Acceptance criteria",
      required: false,
    },
    { key: "assignee", label: "Assignee", required: false },
  ],
  milestones: [
    { key: "project_ref", label: "Project", required: true },
    { key: "title", label: "Title", required: true },
    { key: "description", label: "Description", required: false },
    { key: "due_date", label: "Due date", required: true },
    { key: "completed_at", label: "Completed at", required: false },
  ],
};

const FIELD_ALIASES: Record<string, string> = {
  project_id: "project_ref",
  sprint_id: "sprint_ref",
};

function objectRow(value: unknown, label: string): ImportSourceRow {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${label} must be a JSON object.`);
  return value as ImportSourceRow;
}

function jsonRows(value: unknown, label: string): ImportSourceRow[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be a JSON array.`);
  return value.map((row, index) => objectRow(row, `${label} row ${index + 1}`));
}

function sourceFields(rows: ImportSourceRow[]): string[] {
  return Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
}

export function parseProjectImportSource(
  fileName: string,
  text: string,
): ProjectImportSource {
  const parsed = parseImportFile(fileName, text);
  if (parsed.format === "csv")
    return {
      kind: "single",
      format: "csv",
      fields: parsed.headers,
      rows: parsed.rows,
    };
  if (Array.isArray(parsed.value)) {
    const rows = jsonRows(parsed.value, "JSON root");
    if (rows.length === 0) throw new Error("The JSON array has no rows.");
    if (rows.length > MAX_IMPORT_ROWS)
      throw new Error(`JSON imports are limited to ${MAX_IMPORT_ROWS} rows.`);
    return {
      kind: "single",
      format: "json",
      fields: sourceFields(rows),
      rows,
    };
  }
  const root = objectRow(parsed.value, "JSON root");
  const unknown = Object.keys(root).filter(
    (key) => !PROJECT_IMPORT_RESOURCES.includes(key as ProjectImportResource),
  );
  if (unknown.length)
    throw new Error(
      `Unsupported package field${unknown.length > 1 ? "s" : ""}: ${unknown.join(", ")}.`,
    );
  const resources = Object.fromEntries(
    PROJECT_IMPORT_RESOURCES.map((resource) => [
      resource,
      root[resource] === undefined ? [] : jsonRows(root[resource], resource),
    ]),
  ) as Record<ProjectImportResource, ImportSourceRow[]>;
  const count = Object.values(resources).reduce(
    (total, rows) => total + rows.length,
    0,
  );
  if (count === 0) throw new Error("The project package contains no rows.");
  if (count > MAX_IMPORT_ROWS)
    throw new Error(`Project packages are limited to ${MAX_IMPORT_ROWS} rows.`);
  return { kind: "package", format: "json", resources };
}

export function importFields(
  resource: ProjectImportResource,
): readonly ImportFieldDefinition[] {
  return RESOURCE_FIELDS[resource];
}

export function autoMapImportFields(
  fields: readonly string[],
  resource: ProjectImportResource,
): ProjectImportMapping {
  const targets = new Set(RESOURCE_FIELDS[resource].map((field) => field.key));
  return Object.fromEntries(
    fields.map((field) => {
      const exact = FIELD_ALIASES[field] ?? field;
      return [field, targets.has(exact) ? exact : null];
    }),
  );
}

function applyMapping(
  row: ImportSourceRow,
  mapping: ProjectImportMapping,
): ImportSourceRow {
  const result: ImportSourceRow = {};
  for (const [source, target] of Object.entries(mapping)) {
    if (target) result[target] = row[source];
  }
  return result;
}

export function mappingProblem(
  mapping: ProjectImportMapping,
  resource: ProjectImportResource,
): string | null {
  const targets = Object.values(mapping).filter(
    (target): target is string => target !== null,
  );
  if (new Set(targets).size !== targets.length)
    return "Each ILTO field can be mapped only once.";
  const missing = RESOURCE_FIELDS[resource]
    .filter((field) => field.required && !targets.includes(field.key))
    .map((field) => field.label);
  return missing.length
    ? `Map the required field${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}.`
    : null;
}

function text(
  row: ImportSourceRow,
  field: string,
  issues: string[],
  options: { required?: boolean; max?: number; nullable?: boolean } = {},
): string | null {
  const raw = row[field];
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    if (options.required) issues.push(`${field} is required.`);
    return options.nullable ? null : "";
  }
  if (typeof raw !== "string" && typeof raw !== "number") {
    issues.push(`${field} must be text.`);
    return options.nullable ? null : "";
  }
  const value = String(raw).trim();
  if (options.max && value.length > options.max)
    issues.push(`${field} must be at most ${options.max} characters.`);
  return value;
}

function enumValue<T extends string>(
  row: ImportSourceRow,
  field: string,
  allowed: readonly T[],
  issues: string[],
): T {
  const value = text(row, field, issues, { required: true }) ?? "";
  if (!allowed.includes(value as T))
    issues.push(`${field} must be one of: ${allowed.join(", ")}.`);
  return value as T;
}

function calendarDate(
  row: ImportSourceRow,
  field: string,
  issues: string[],
  nullable = false,
): string | null {
  const value = text(row, field, issues, {
    required: !nullable,
    nullable,
  });
  if (!value) return null;
  try {
    parseCalendarDate(value);
  } catch {
    issues.push(`${field} must be a real calendar date in YYYY-MM-DD format.`);
  }
  return value;
}

function instant(
  row: ImportSourceRow,
  field: string,
  issues: string[],
): string | null {
  const value = text(row, field, issues, { nullable: true });
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || !/[zZ]|[+-]\d\d:\d\d$/.test(value)) {
    issues.push(`${field} must be an ISO timestamp with a timezone.`);
    return value;
  }
  return date.toISOString();
}

function resolveNamedReference(
  raw: unknown,
  label: string,
  records: { id: string; name: string }[],
  importKeys: Set<string>,
  issues: string[],
): ProjectImportReference {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) {
    issues.push(`${label} is required.`);
    return { kind: "id", value: "" };
  }
  if (importKeys.has(value)) return { kind: "import_key", value };
  const byId = records.find((record) => record.id === value);
  if (byId) return { kind: "id", value: byId.id };
  const byName = records.filter(
    (record) => record.name.toLocaleLowerCase() === value.toLocaleLowerCase(),
  );
  if (byName.length === 1) return { kind: "id", value: byName[0].id };
  issues.push(
    byName.length > 1
      ? `${label} “${value}” is ambiguous; use an ID or package import key.`
      : `${label} “${value}” was not found by ID, unique name, or package import key.`,
  );
  return { kind: "id", value };
}

function duplicateWarning(
  resource: ProjectImportResource,
  row: ImportSourceRow,
  context: ProjectImportContext,
): string | null {
  const name = String(row.name ?? row.title ?? "")
    .trim()
    .toLocaleLowerCase();
  if (!name) return null;
  if (
    resource === "projects" &&
    context.projects.some((record) => record.name.toLocaleLowerCase() === name)
  )
    return "Potential duplicate: an existing project has this name.";
  if (
    resource === "sprints" &&
    context.sprints.some((record) => record.name.toLocaleLowerCase() === name)
  )
    return "Potential duplicate: an existing sprint has this name.";
  if (
    resource === "tasks" &&
    context.tasks.some((record) => record.title.toLocaleLowerCase() === name)
  )
    return "Potential duplicate: an existing task has this title.";
  if (
    resource === "milestones" &&
    context.milestones.some(
      (record) => record.title.toLocaleLowerCase() === name,
    )
  )
    return "Potential duplicate: an existing milestone has this title.";
  return null;
}

function batchDuplicateIdentity(
  resource: ProjectImportResource,
  value:
    | ProjectImportProject
    | ProjectImportSprint
    | ProjectImportTask
    | ProjectImportMilestone,
): string {
  if (resource === "projects")
    return `projects:${(value as ProjectImportProject).name.toLocaleLowerCase()}`;
  const project = (
    value as ProjectImportSprint | ProjectImportTask | ProjectImportMilestone
  ).project_ref;
  const label =
    resource === "sprints"
      ? (value as ProjectImportSprint).name
      : (value as ProjectImportTask | ProjectImportMilestone).title;
  return `${resource}:${project.kind}:${project.value}:${label.toLocaleLowerCase()}`;
}

interface PackageKeys {
  projects: Set<string>;
  sprints: Set<string>;
  sprintProjects: Map<string, string>;
}

function packageKeys(
  resources: Record<ProjectImportResource, ImportSourceRow[]>,
): PackageKeys {
  const values: PackageKeys = {
    projects: new Set<string>(),
    sprints: new Set<string>(),
    sprintProjects: new Map<string, string>(),
  };
  for (const resource of ["projects", "sprints"] as const) {
    for (const row of resources[resource]) {
      if (typeof row.import_key === "string" && row.import_key.trim()) {
        const key = row.import_key.trim();
        values[resource].add(key);
        if (resource === "sprints") {
          const projectReference = row.project_ref ?? row.project_id;
          if (typeof projectReference === "string" && projectReference.trim())
            values.sprintProjects.set(key, projectReference.trim());
        }
      }
    }
  }
  return values;
}

function packageKeyProblems(
  resources: Record<ProjectImportResource, ImportSourceRow[]>,
): Map<string, string[]> {
  const problems = new Map<string, string[]>();
  for (const resource of ["projects", "sprints"] as const) {
    const rowsByKey = new Map<string, number[]>();
    resources[resource].forEach((row, index) => {
      if (typeof row.import_key !== "string" || !row.import_key.trim()) return;
      const key = row.import_key.trim();
      rowsByKey.set(key, [...(rowsByKey.get(key) ?? []), index]);
    });
    for (const [key, indexes] of rowsByKey) {
      if (indexes.length < 2) continue;
      for (const index of indexes) {
        problems.set(`${resource}:${index}`, [
          `import_key “${key}” is duplicated within ${resource}.`,
        ]);
      }
    }
  }
  return problems;
}

function projectReferenceMatches(
  project: ProjectImportReference,
  rawSprintProject: string,
  context: ProjectImportContext,
): boolean {
  if (project.value === rawSprintProject) return true;
  if (project.kind === "import_key") return false;
  const matches = context.projects.filter(
    (record) =>
      record.id === rawSprintProject ||
      record.name.toLocaleLowerCase() === rawSprintProject.toLocaleLowerCase(),
  );
  return matches.length === 1 && matches[0].id === project.value;
}

function normalizeRow(
  resource: ProjectImportResource,
  row: ImportSourceRow,
  context: ProjectImportContext,
  keys: PackageKeys,
): {
  value:
    | ProjectImportProject
    | ProjectImportSprint
    | ProjectImportTask
    | ProjectImportMilestone;
  issues: string[];
  warnings: string[];
  relationship: string;
} {
  const issues: string[] = [];
  const warnings: string[] = [];
  const duplicate = duplicateWarning(resource, row, context);
  if (duplicate) warnings.push(duplicate);
  if (resource === "projects") {
    const start_date = calendarDate(row, "start_date", issues) ?? "";
    const end_date = calendarDate(row, "end_date", issues, true);
    if (end_date && end_date < start_date)
      issues.push("end_date cannot precede start_date.");
    const import_key = text(row, "import_key", issues, {
      nullable: true,
      max: 100,
    });
    return {
      value: {
        ...(import_key ? { import_key } : {}),
        name: text(row, "name", issues, { required: true, max: 200 }) ?? "",
        description: text(row, "description", issues) ?? "",
        status: enumValue<ProjectStatus>(
          row,
          "status",
          statuses.project,
          issues,
        ),
        priority: enumValue<Priority>(row, "priority", priorities, issues),
        start_date,
        end_date,
      },
      issues,
      warnings,
      relationship: "Standalone project",
    };
  }
  const project_ref = resolveNamedReference(
    row.project_ref ?? row.project_id,
    "project_ref",
    context.projects,
    keys.projects,
    issues,
  );
  if (resource === "sprints") {
    const start_date = calendarDate(row, "start_date", issues) ?? "";
    const end_date = calendarDate(row, "end_date", issues) ?? "";
    if (end_date && end_date < start_date)
      issues.push("end_date cannot precede start_date.");
    const import_key = text(row, "import_key", issues, {
      nullable: true,
      max: 100,
    });
    return {
      value: {
        ...(import_key ? { import_key } : {}),
        project_ref,
        name: text(row, "name", issues, { required: true, max: 200 }) ?? "",
        goal: text(row, "goal", issues) ?? "",
        status: enumValue<SprintStatus>(row, "status", statuses.sprint, issues),
        start_date,
        end_date,
      },
      issues,
      warnings,
      relationship: `Project: ${project_ref.value}`,
    };
  }
  if (resource === "tasks") {
    const rawSprint = row.sprint_ref ?? row.sprint_id;
    const sprint_ref =
      rawSprint === undefined ||
      rawSprint === null ||
      String(rawSprint).trim() === ""
        ? null
        : resolveNamedReference(
            rawSprint,
            "sprint_ref",
            context.sprints,
            keys.sprints,
            issues,
          );
    if (sprint_ref?.kind === "id" && project_ref.kind === "id") {
      const sprint = context.sprints.find(
        (record) => record.id === sprint_ref.value,
      );
      if (sprint && sprint.project_id !== project_ref.value)
        issues.push("sprint_ref does not belong to project_ref.");
    }
    if (sprint_ref?.kind === "import_key") {
      const sprintProject = keys.sprintProjects.get(sprint_ref.value);
      if (
        sprintProject &&
        !projectReferenceMatches(project_ref, sprintProject, context)
      )
        issues.push(
          "sprint_ref does not belong to project_ref in this package.",
        );
    }
    const rawPoints = row.story_points;
    const story_points =
      typeof rawPoints === "number" || typeof rawPoints === "string"
        ? Number(rawPoints)
        : Number.NaN;
    if (
      !Number.isFinite(story_points) ||
      story_points < 0 ||
      story_points >= 1_000_000_000
    )
      issues.push(
        "story_points must be a finite number from 0 up to 1,000,000,000.",
      );
    const acceptance_criteria = text(row, "acceptance_criteria", issues, {
      nullable: true,
      max: 10_000,
    });
    const assignee = text(row, "assignee", issues, {
      nullable: true,
      max: 200,
    });
    return {
      value: {
        project_ref,
        sprint_ref,
        title: text(row, "title", issues, { required: true, max: 200 }) ?? "",
        description: text(row, "description", issues) ?? "",
        status: enumValue<TaskStatus>(row, "status", statuses.task, issues),
        priority: enumValue<Priority>(row, "priority", priorities, issues),
        category: enumValue<TaskCategory>(
          row,
          "category",
          TASK_CATEGORIES,
          issues,
        ),
        story_points,
        acceptance_criteria,
        assignee,
      },
      issues,
      warnings,
      relationship: `Project: ${project_ref.value}; Sprint: ${sprint_ref?.value ?? "none"}`,
    };
  }
  return {
    value: {
      project_ref,
      title: text(row, "title", issues, { required: true, max: 200 }) ?? "",
      description: text(row, "description", issues) ?? "",
      due_date: calendarDate(row, "due_date", issues) ?? "",
      completed_at: instant(row, "completed_at", issues),
    },
    issues,
    warnings,
    relationship: `Project: ${project_ref.value}`,
  };
}

function emptyRequest(): ProjectImportRequest {
  return {
    duplicate_policy: "reject",
    resources: { projects: [], sprints: [], tasks: [], milestones: [] },
  };
}

export function prepareProjectImport(
  source: ProjectImportSource,
  context: ProjectImportContext,
  resource?: ProjectImportResource,
  mapping?: ProjectImportMapping,
): PreparedProjectImport {
  if (source.kind === "single" && (!resource || !mapping))
    throw new Error("Choose a resource and map its fields before previewing.");
  if (source.kind === "single") {
    const problem = mappingProblem(mapping!, resource!);
    if (problem) throw new Error(problem);
  }
  const resources =
    source.kind === "package"
      ? source.resources
      : ({
          projects: [],
          sprints: [],
          tasks: [],
          milestones: [],
          [resource!]: source.rows.map((row) => applyMapping(row, mapping!)),
        } as Record<ProjectImportResource, ImportSourceRow[]>);
  const keys = packageKeys(resources);
  const keyProblems =
    source.kind === "package" ? packageKeyProblems(resources) : new Map();
  const request = emptyRequest();
  const previewRows: ProjectImportPreviewRow[] = [];
  const batchIdentities = new Set<string>();
  for (const currentResource of PROJECT_IMPORT_RESOURCES) {
    resources[currentResource].forEach((row, index) => {
      const normalized = normalizeRow(currentResource, row, context, keys);
      normalized.issues.push(
        ...(keyProblems.get(`${currentResource}:${index}`) ?? []),
      );
      const identity = batchDuplicateIdentity(
        currentResource,
        normalized.value,
      );
      if (batchIdentities.has(identity))
        normalized.warnings.push(
          "Potential duplicate: another row in this file has the same project-scoped name/title.",
        );
      else batchIdentities.add(identity);
      const status: PreviewStatus = normalized.issues.length
        ? "invalid"
        : normalized.warnings.length
          ? "warning"
          : "valid";
      if (status !== "invalid")
        request.resources[currentResource].push(normalized.value as never);
      previewRows.push({
        resource: currentResource,
        row: index + 1,
        label: String(row.name ?? row.title ?? "Untitled"),
        relationship: normalized.relationship,
        status,
        issues: [...normalized.issues, ...normalized.warnings],
        category: String(row.category ?? ""),
        priority: String(row.priority ?? ""),
        taskStatus: String(row.status ?? ""),
      });
    });
  }
  return {
    request,
    rows: previewRows,
    valid: previewRows.filter((row) => row.status === "valid").length,
    warnings: previewRows.filter((row) => row.status === "warning").length,
    invalid: previewRows.filter((row) => row.status === "invalid").length,
  };
}

const EXAMPLES: Record<ProjectImportResource, ImportSourceRow> = {
  projects: {
    name: "ILTO V1 — Project Phoenix",
    description: "Build and stabilize ILTO V1.",
    status: "active",
    priority: "high",
    start_date: "2026-10-01",
    end_date: "2027-01-15",
  },
  sprints: {
    project_ref: "ILTO V1 — Project Phoenix",
    name: "S01 — Horizon Stabilization",
    goal: "Stabilize the Horizon release.",
    status: "planned",
    start_date: "2026-10-05",
    end_date: "2026-10-18",
  },
  tasks: {
    project_ref: "ILTO V1 — Project Phoenix",
    sprint_ref: "S01 — Horizon Stabilization",
    title: "Verify Horizon user isolation",
    description: "Exercise cross-user access boundaries.",
    status: "todo",
    priority: "critical",
    category: "test",
    story_points: 3,
    acceptance_criteria: "Cross-user IDs return the expected error.",
    assignee: "",
  },
  milestones: {
    project_ref: "ILTO V1 — Project Phoenix",
    title: "V1 release",
    description: "Production-ready V1.",
    due_date: "2027-01-15",
    completed_at: "",
  },
};

function csvCell(value: unknown): string {
  const textValue = String(value ?? "");
  return /[",\r\n]/.test(textValue)
    ? `"${textValue.replaceAll('"', '""')}"`
    : textValue;
}

export function projectCsvTemplate(resource: ProjectImportResource): string {
  const fields = RESOURCE_FIELDS[resource]
    .map((field) => field.key)
    .filter((field) => field !== "import_key");
  return `${fields.join(",")}\n${fields.map((field) => csvCell(EXAMPLES[resource][field])).join(",")}\n`;
}

export function projectJsonTemplate(
  resource: ProjectImportResource | "package",
): string {
  if (resource !== "package")
    return JSON.stringify([EXAMPLES[resource]], null, 2);
  return JSON.stringify(
    {
      projects: [{ ...EXAMPLES.projects, import_key: "phoenix" }],
      sprints: [
        {
          ...EXAMPLES.sprints,
          import_key: "s01",
          project_ref: "phoenix",
        },
      ],
      tasks: [
        {
          ...EXAMPLES.tasks,
          project_ref: "phoenix",
          sprint_ref: "s01",
        },
      ],
      milestones: [{ ...EXAMPLES.milestones, project_ref: "phoenix" }],
    },
    null,
    2,
  );
}
