import { describe, expect, it } from "vitest";
import { milestone, project, sprint, task } from "./__tests__/fixtures.ts";
import {
  autoMapImportFields,
  mappingProblem,
  parseProjectImportSource,
  prepareProjectImport,
  projectCsvTemplate,
  projectJsonTemplate,
  type ProjectImportContext,
} from "./project-import.ts";

const context: ProjectImportContext = {
  projects: [project],
  sprints: [sprint],
  tasks: [task],
  milestones: [milestone],
};

describe("Projects import normalization", () => {
  it("parses and auto-maps a single-resource CSV into one exact batch row", () => {
    const source = parseProjectImportSource(
      "tasks.csv",
      [
        "project_ref,sprint_ref,title,description,status,priority,category,story_points,acceptance_criteria,assignee",
        '"Project Alpha","Sprint Alpha","Restore ILTO","Clean restore",todo,critical,backup,5,"Restore succeeds.\nSmoke tests pass.",Owner',
      ].join("\n"),
    );
    expect(source.kind).toBe("single");
    if (source.kind !== "single") throw new Error("Expected single source");
    const mapping = autoMapImportFields(source.fields, "tasks");
    const prepared = prepareProjectImport(source, context, "tasks", mapping);

    expect(prepared).toMatchObject({ valid: 1, warnings: 0, invalid: 0 });
    expect(prepared.request).toEqual({
      duplicate_policy: "reject",
      resources: {
        projects: [],
        sprints: [],
        tasks: [
          {
            project_ref: { kind: "id", value: "p1" },
            sprint_ref: { kind: "id", value: "s1" },
            title: "Restore ILTO",
            description: "Clean restore",
            status: "todo",
            priority: "critical",
            category: "backup",
            story_points: 5,
            acceptance_criteria: "Restore succeeds.\nSmoke tests pass.",
            assignee: "Owner",
          },
        ],
        milestones: [],
      },
    });
  });

  it("supports manual field mapping and an explicitly ignored source field", () => {
    const source = parseProjectImportSource(
      "work.csv",
      "project,task_name,state,importance,type,points,private_note\nProject Alpha,Add API,todo,high,backend,3,ignore me",
    );
    if (source.kind !== "single") throw new Error("Expected single source");
    const mapping = {
      project: "project_ref",
      task_name: "title",
      state: "status",
      importance: "priority",
      type: "category",
      points: "story_points",
      private_note: null,
    };
    expect(mappingProblem(mapping, "tasks")).toBeNull();
    const prepared = prepareProjectImport(source, context, "tasks", mapping);
    expect(prepared.request.resources.tasks[0]).toMatchObject({
      title: "Add API",
      description: "",
      category: "backend",
      acceptance_criteria: null,
    });
    expect(JSON.stringify(prepared.request)).not.toContain("private_note");
  });

  it("reports missing required mappings and invalid enums without dropping rows", () => {
    expect(mappingProblem({ title: "title", extra: null }, "tasks")).toMatch(
      /Project.*Status.*Priority.*Category.*Story points/,
    );

    const source = parseProjectImportSource(
      "tasks.json",
      JSON.stringify([
        {
          project_ref: "Project Alpha",
          title: "Bad category",
          status: "todo",
          priority: "high",
          category: "operations",
          story_points: 2,
        },
      ]),
    );
    if (source.kind !== "single") throw new Error("Expected single source");
    const prepared = prepareProjectImport(
      source,
      context,
      "tasks",
      autoMapImportFields(source.fields, "tasks"),
    );
    expect(prepared.invalid).toBe(1);
    expect(prepared.rows[0].issues.join(" ")).toMatch(
      /category must be one of/,
    );
    expect(prepared.request.resources.tasks).toEqual([]);
  });

  it("parses a Project Phoenix JSON package and preserves package-local references", () => {
    const source = parseProjectImportSource(
      "phoenix.json",
      projectJsonTemplate("package"),
    );
    expect(source.kind).toBe("package");
    const prepared = prepareProjectImport(source, context);
    expect(prepared.invalid).toBe(0);
    expect(prepared.request.resources.projects[0].import_key).toBe("phoenix");
    expect(prepared.request.resources.sprints[0]).toMatchObject({
      import_key: "s01",
      project_ref: { kind: "import_key", value: "phoenix" },
    });
    expect(prepared.request.resources.tasks[0]).toMatchObject({
      project_ref: { kind: "import_key", value: "phoenix" },
      sprint_ref: { kind: "import_key", value: "s01" },
      category: "test",
    });
    expect(
      prepared.rows.find((row) => row.resource === "tasks")?.relationship,
    ).toContain("phoenix");
  });

  it("invalidates duplicate package keys and cross-project sprint references", () => {
    const duplicateSource = parseProjectImportSource(
      "duplicate.json",
      JSON.stringify({
        projects: [
          {
            ...JSON.parse(projectJsonTemplate("projects"))[0],
            import_key: "same",
          },
          {
            ...JSON.parse(projectJsonTemplate("projects"))[0],
            import_key: "same",
            name: "Another",
          },
        ],
      }),
    );
    const duplicate = prepareProjectImport(duplicateSource, context);
    expect(duplicate.invalid).toBe(2);
    expect(duplicate.rows[0].issues.join(" ")).toMatch(/duplicated/);

    const relationshipSource = parseProjectImportSource(
      "relationship.json",
      JSON.stringify({
        projects: [
          {
            ...JSON.parse(projectJsonTemplate("projects"))[0],
            import_key: "one",
          },
          {
            ...JSON.parse(projectJsonTemplate("projects"))[0],
            import_key: "two",
            name: "Project Two",
          },
        ],
        sprints: [
          {
            ...JSON.parse(projectJsonTemplate("sprints"))[0],
            import_key: "sprint-one",
            project_ref: "one",
          },
        ],
        tasks: [
          {
            ...JSON.parse(projectJsonTemplate("tasks"))[0],
            project_ref: "two",
            sprint_ref: "sprint-one",
          },
        ],
      }),
    );
    const relationship = prepareProjectImport(relationshipSource, context);
    const taskRow = relationship.rows.find((row) => row.resource === "tasks");
    expect(taskRow?.status).toBe("invalid");
    expect(taskRow?.issues.join(" ")).toMatch(/does not belong/);
  });

  it("generates templates from writable contract fields only", () => {
    const csv = projectCsvTemplate("tasks");
    expect(csv).toContain("category");
    expect(csv).toContain("acceptance_criteria");
    expect(csv).not.toContain("created_at");
    expect(csv).not.toContain("user_id");

    const array = JSON.parse(projectJsonTemplate("milestones"));
    expect(array).toHaveLength(1);
    expect(array[0]).not.toHaveProperty("id");
    expect(array[0]).not.toHaveProperty("created_at");
  });
});
