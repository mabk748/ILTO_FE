import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/errors.ts";
import type {
  LearningGoal,
  LearningMilestone,
  Project,
  StudySchedule,
} from "@/lib/api/types.ts";
import {
  learningImportProblem,
  learningJsonTemplate,
  parseLearningImportSource,
  prepareLearningImport,
  type LearningImportContext,
} from "./learning-import.ts";

const existingGoal: LearningGoal = {
  id: "goal-1",
  title: "German",
  provider: "Self study",
  type: "language",
  status: "active",
  start_date: "2026-09-01",
  target_date: null,
  exam_date: null,
  phase: null,
  description: "Improve professional German.",
  priority: "medium",
  linked_project_id: null,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};

const project: Project = {
  id: "project-1",
  name: "ILTO Infrastructure Upgrade",
  description: "Infrastructure work",
  status: "active",
  priority: "high",
  start_date: "2026-09-01",
  end_date: null,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};

const existingSchedule: StudySchedule = {
  id: "schedule-1",
  learning_goal_id: existingGoal.id,
  weekday: 1,
  session_type: "language",
  planned_minutes: 45,
  topic: "German conversation",
  notes: "Existing notes are not part of duplicate identity.",
  start_date: "2026-09-01",
  end_date: null,
  active: false,
  linked_project_id: null,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};

const existingMilestone: LearningMilestone = {
  id: "milestone-1",
  learning_goal_id: existingGoal.id,
  title: "Complete A2 review",
  target_date: "2026-11-01",
  completed_at: null,
  status: "planned",
  created_at: "2026-09-01T00:00:00Z",
};

const context: LearningImportContext = {
  goals: [existingGoal],
  projects: [project],
  schedules: [existingSchedule],
  milestones: [existingMilestone],
};

const goal = {
  import_key: "aws-saa",
  title: "AWS Solutions Architect Associate",
  provider: "AWS",
  type: "certification",
  status: "active",
  start_date: "2026-10-05",
  target_date: "2026-12-28",
  exam_date: null,
  phase: "Phase 1",
  description: "Prepare for the certification exam.",
  priority: "high",
  linked_project_id: "ILTO Infrastructure Upgrade",
};

function packageJson(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    goals: [goal],
    schedules: [
      {
        goal_ref: "aws-saa",
        weekday: 4,
        session_type: "study",
        planned_minutes: 90,
        topic: "Deep certification study",
        notes: "",
        start_date: "2026-10-05",
        end_date: null,
        active: true,
        linked_project_id: "project-1",
      },
    ],
    milestones: [
      {
        goal_ref: "aws-saa",
        title: "Complete VPC section",
        target_date: "2026-11-02",
        status: "planned",
      },
    ],
    ...overrides,
  });
}

describe("Learning planning import parsing", () => {
  it("parses a full package and transforms friendly references into one exact request", () => {
    const source = parseLearningImportSource(
      "learning-plan.json",
      packageJson(),
    );
    const prepared = prepareLearningImport(source, context);

    expect(prepared).toMatchObject({
      counts: { goals: 1, schedules: 1, milestones: 1 },
      valid: 3,
      warnings: 0,
      invalid: 0,
    });
    expect(prepared.request).toEqual({
      duplicate_policy: "reject",
      resources: {
        goals: [
          {
            ...goal,
            linked_project_id: "project-1",
          },
        ],
        schedules: [
          {
            goal_ref: { kind: "import_key", value: "aws-saa" },
            weekday: 4,
            session_type: "study",
            planned_minutes: 90,
            topic: "Deep certification study",
            notes: "",
            start_date: "2026-10-05",
            end_date: null,
            active: true,
            linked_project_id: "project-1",
          },
        ],
        milestones: [
          {
            goal_ref: { kind: "import_key", value: "aws-saa" },
            title: "Complete VPC section",
            target_date: "2026-11-02",
            status: "planned",
          },
        ],
      },
    });
  });

  it("supports a selected single-resource JSON array", () => {
    const source = parseLearningImportSource(
      "goals.json",
      JSON.stringify([{ ...goal, import_key: undefined }]),
    );
    const prepared = prepareLearningImport(source, context, "goals");

    expect(prepared.counts).toEqual({
      goals: 1,
      schedules: 0,
      milestones: 0,
    });
    expect(prepared.request.resources.goals[0]).not.toHaveProperty(
      "import_key",
    );
  });

  it("rejects malformed JSON, unsupported package keys, and empty packages", () => {
    expect(() => parseLearningImportSource("plan.json", "{bad")).toThrow(
      "JSON file is malformed",
    );
    expect(() =>
      parseLearningImportSource(
        "plan.json",
        JSON.stringify({ goals: [], sessions: [] }),
      ),
    ).toThrow("Unsupported package resource");
    expect(() =>
      parseLearningImportSource(
        "plan.json",
        JSON.stringify({ goals: [], schedules: [], milestones: [] }),
      ),
    ).toThrow("at least one");
  });

  it("rejects CSV, oversized files, and packages over 2,000 rows", () => {
    expect(() => parseLearningImportSource("goals.csv", "title\nAWS")).toThrow(
      "JSON files only",
    );
    expect(() =>
      parseLearningImportSource("large.json", `"${"x".repeat(2_097_153)}"`),
    ).toThrow("2 MB");
    expect(() =>
      parseLearningImportSource(
        "rows.json",
        JSON.stringify({ goals: Array.from({ length: 2_001 }, () => ({})) }),
      ),
    ).toThrow("2,000");
  });
});

describe("Learning planning import validation and references", () => {
  it("resolves existing Goal IDs and unique exact titles to canonical IDs", () => {
    const idSource = parseLearningImportSource(
      "schedules.json",
      JSON.stringify([
        {
          goal_ref: "goal-1",
          weekday: 1,
          session_type: "language",
          planned_minutes: 0,
          topic: "Vocabulary",
          start_date: "2026-10-05",
          active: false,
        },
        {
          goal_ref: " german ",
          weekday: 3,
          session_type: "language",
          planned_minutes: 45,
          topic: "Conversation",
          start_date: "2026-10-05",
        },
      ]),
    );
    const prepared = prepareLearningImport(idSource, context, "schedules");

    expect(prepared.invalid).toBe(0);
    expect(prepared.request.resources.schedules).toEqual([
      {
        goal_ref: { kind: "id", value: "goal-1" },
        weekday: 1,
        session_type: "language",
        planned_minutes: 0,
        topic: "Vocabulary",
        start_date: "2026-10-05",
        active: false,
      },
      {
        goal_ref: { kind: "id", value: "goal-1" },
        weekday: 3,
        session_type: "language",
        planned_minutes: 45,
        topic: "Conversation",
        start_date: "2026-10-05",
      },
    ]);
  });

  it("marks unresolved and ambiguous Goal titles invalid without guessing", () => {
    const duplicateTitle = {
      ...existingGoal,
      id: "goal-2",
      provider: "Another provider",
    };
    const source = parseLearningImportSource(
      "milestones.json",
      JSON.stringify([
        {
          goal_ref: "Missing",
          title: "First milestone",
          target_date: "2026-11-01",
        },
        {
          goal_ref: "German",
          title: "Second milestone",
          target_date: "2026-12-01",
        },
      ]),
    );
    const prepared = prepareLearningImport(
      source,
      { ...context, goals: [existingGoal, duplicateTitle] },
      "milestones",
    );

    expect(prepared.invalid).toBe(2);
    expect(prepared.request.resources.milestones).toEqual([]);
    expect(prepared.rows[0].issues[0].code).toBe("reference_unavailable");
    expect(prepared.rows[1].issues[0].code).toBe("ambiguous_reference");
  });

  it("rejects duplicate import keys and makes child references ambiguous", () => {
    const source = parseLearningImportSource(
      "plan.json",
      packageJson({
        goals: [
          goal,
          {
            ...goal,
            title: "Another certification",
            provider: "Another provider",
          },
        ],
      }),
    );
    const prepared = prepareLearningImport(source, context);

    expect(prepared.invalid).toBe(4);
    expect(
      prepared.rows
        .filter((row) => row.resource === "goals")
        .every((row) =>
          row.issues.some((issue) => issue.code === "duplicate_import_key"),
        ),
    ).toBe(true);
    expect(
      prepared.rows
        .filter((row) => row.resource !== "goals")
        .every((row) =>
          row.issues.some((issue) => issue.code === "ambiguous_reference"),
        ),
    ).toBe(true);
  });

  it("preserves explicit null and zero/false while leaving omitted optionals absent", () => {
    const source = parseLearningImportSource(
      "schedules.json",
      JSON.stringify([
        {
          goal_ref: "goal-1",
          weekday: 0,
          session_type: "study",
          planned_minutes: 0,
          topic: "Short review",
          start_date: "2026-10-05",
          end_date: null,
          active: false,
          linked_project_id: null,
        },
      ]),
    );
    const prepared = prepareLearningImport(source, context, "schedules");
    const saved = prepared.request.resources.schedules[0];

    expect(saved).toMatchObject({
      planned_minutes: 0,
      end_date: null,
      active: false,
      linked_project_id: null,
    });
    expect(saved).not.toHaveProperty("notes");
  });

  it("reports unknown/server-owned fields, invalid enums, ranges, and date ordering", () => {
    const source = parseLearningImportSource(
      "plan.json",
      JSON.stringify({
        goals: [
          {
            ...goal,
            id: "server-owned",
            type: "degree",
            target_date: "2026-01-01",
          },
        ],
        schedules: [
          {
            goal_ref: "aws-saa",
            weekday: 7,
            session_type: "study",
            planned_minutes: -1,
            topic: "",
            start_date: "2026-12-01",
            end_date: "2026-11-01",
          },
        ],
        milestones: [
          {
            goal_ref: "aws-saa",
            title: "Done milestone",
            target_date: "not-a-date",
            status: "completed",
          },
        ],
      }),
    );
    const prepared = prepareLearningImport(source, context);

    expect(prepared.invalid).toBe(3);
    expect(
      prepared.rows.flatMap((row) => row.issues.map((issue) => issue.code)),
    ).toEqual(
      expect.arrayContaining([
        "unknown_field",
        "invalid_enum",
        "invalid_date_order",
        "invalid_integer",
        "blank",
        "invalid_date",
      ]),
    );
  });

  it("warns for duplicates using backend Goal, schedule, and milestone identities", () => {
    const source = parseLearningImportSource(
      "plan.json",
      JSON.stringify({
        goals: [
          {
            ...goal,
            import_key: "german-copy",
            title: " german ",
            provider: "SELF STUDY",
          },
        ],
        schedules: [
          {
            goal_ref: "goal-1",
            weekday: 1,
            session_type: "language",
            planned_minutes: 45,
            topic: " German Conversation ",
            notes: "Different notes are still a duplicate.",
            start_date: "2026-09-01",
            end_date: null,
            active: false,
            linked_project_id: null,
          },
        ],
        milestones: [
          {
            goal_ref: "goal-1",
            title: " complete a2 review ",
            target_date: "2027-01-01",
          },
        ],
      }),
    );
    const prepared = prepareLearningImport(source, context);

    expect(prepared.warnings).toBe(3);
    expect(
      prepared.rows.every((row) =>
        row.issues.some((issue) => issue.code === "duplicate_record"),
      ),
    ).toBe(true);
  });

  it("flags duplicate rows within a package without silently removing them", () => {
    const source = parseLearningImportSource(
      "milestones.json",
      JSON.stringify([
        {
          goal_ref: "goal-1",
          title: "New milestone",
          target_date: "2026-11-01",
        },
        {
          goal_ref: "goal-1",
          title: " new MILESTONE ",
          target_date: "2026-12-01",
        },
      ]),
    );
    const prepared = prepareLearningImport(source, context, "milestones");

    expect(prepared.valid).toBe(1);
    expect(prepared.warnings).toBe(1);
    expect(prepared.request.resources.milestones).toHaveLength(2);
  });
});

describe("Learning import diagnostics and templates", () => {
  it("maps a structured backend problem to its preview coordinates", () => {
    const problem = learningImportProblem(
      new ApiError("Invalid import", "http", {
        status: 422,
        details: {
          detail: {
            resource: "schedules",
            row: 2,
            field: "goal_ref",
            code: "reference_unavailable",
            message: "Referenced learning goal is unavailable",
          },
        },
      }),
    );

    expect(problem).toEqual({
      resource: "schedules",
      row: 2,
      field: "goal_ref",
      code: "reference_unavailable",
      message: "Referenced learning goal is unavailable",
    });
  });

  it("generates canonical templates without server-owned or evidence fields", () => {
    const template = learningJsonTemplate("package");
    const parsed = JSON.parse(template);

    expect(parsed.goals[0]).toHaveProperty("import_key", "aws-saa");
    expect(parsed.schedules[0]).toHaveProperty("goal_ref", "aws-saa");
    expect(parsed.milestones[0]).toHaveProperty("status", "planned");
    expect(template).not.toContain('"id"');
    expect(template).not.toContain('"created_at"');
    expect(template).not.toContain('"sessions"');
    expect(template).not.toContain('"assessments"');
  });
});
