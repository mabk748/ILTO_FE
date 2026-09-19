import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  changedFields,
  initialDraft,
  projectWriteError,
  removeResource,
  saveResource,
  type EditorTarget,
} from "./project-editor.ts";
import { ApiError } from "@/lib/api/errors.ts";
import { project, sprint, task, milestone } from "./__tests__/fixtures.ts";
import { summarizeProjects } from "./projects-data.ts";

const fetchMock = vi.fn<typeof fetch>();
const targets: [EditorTarget, string][] = [
  [{ kind: "project", record: project }, "/projects"],
  [{ kind: "sprint", record: sprint }, "/projects/sprints"],
  [{ kind: "task", record: task }, "/projects/tasks"],
  [{ kind: "milestone", record: milestone }, "/projects/milestones"],
];
beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () =>
    Response.json({ id: "saved" }, { status: 201 }),
  );
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8001/api/v1");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Projects editor payloads (mocked HTTP)", () => {
  it.each(targets)(
    "creates $kind using writable snake_case fields at %s",
    async (target, path) => {
      await saveResource({ kind: target.kind }, initialDraft(target), [sprint]);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(`http://localhost:8001/api/v1${path}`);
      expect(init?.method).toBe("POST");
      const payload = JSON.parse(String(init?.body));
      const expected: Record<string, unknown> = { ...target.record! };
      for (const key of ["id", "created_at", "updated_at", "velocity"])
        delete expected[key];
      expect(payload).toEqual(expected);
      for (const key of ["id", "created_at", "updated_at", "velocity"])
        expect(payload).not.toHaveProperty(key);
    },
  );
  it.each(targets)("PATCHes only changed fields for $kind", async (target) => {
    const draft = initialDraft(target);
    const key = target.kind === "sprint" ? "goal" : "description";
    draft[key] = "Edited";
    await saveResource(target, draft, [sprint]);
    expect(fetchMock.mock.calls[0][1]?.method).toBe("PATCH");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      [key]: "Edited",
    });
  });
  it.each(targets)(
    "deletes $kind without cascading or a request body",
    async (target, path) => {
      fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
      await removeResource(target);
      expect(fetchMock.mock.calls[0][0]).toBe(
        `http://localhost:8001/api/v1${path}/${target.record!.id}`,
      );
      expect(fetchMock.mock.calls[0][1]?.method).toBe("DELETE");
      expect(fetchMock.mock.calls[0][1]?.body).toBeUndefined();
    },
  );
  it("sends explicit null to clear nullable fields and retains omitted fields", async () => {
    await saveResource(
      { kind: "project", record: project },
      { ...initialDraft(targets[0][0]), end_date: "" },
      [],
    );
    await saveResource(
      { kind: "task", record: task },
      { ...initialDraft(targets[2][0]), sprint_id: "", assignee: "" },
      [],
    );
    const completed = {
      ...milestone,
      completed_at: "2026-09-10T09:30:00+01:00",
    };
    await saveResource(
      { kind: "milestone", record: completed },
      {
        ...initialDraft({ kind: "milestone", record: completed }),
        completed: "false",
      },
      [],
    );
    expect(
      fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body))),
    ).toEqual([
      { end_date: null },
      { sprint_id: null, assignee: null },
      { completed_at: null },
    ]);
    expect(changedFields({ end_date: null }, { end_date: null })).toEqual({});
  });
  it("creates nullable fields explicitly and records completion with a timezone", async () => {
    await saveResource(
      { kind: "task" },
      { ...initialDraft(targets[2][0]), sprint_id: "", assignee: "" },
      [],
    );
    await saveResource(
      { kind: "milestone" },
      { ...initialDraft(targets[3][0]), completed: "true" },
      [],
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
      sprint_id: null,
      assignee: null,
    });
    expect(
      JSON.parse(String(fetchMock.mock.calls[1][1]?.body)).completed_at,
    ).toMatch(/T.*Z$/);
  });
  it("does not change an existing completion timestamp when other fields change", async () => {
    const record = { ...milestone, completed_at: "2026-09-10T09:30:00+01:00" };
    const target = { kind: "milestone", record } as const;
    await saveResource(
      target,
      { ...initialDraft(target), title: "Renamed" },
      [],
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      title: "Renamed",
    });
  });
  it("preserves a legitimate empty-string assignee when editing another field", async () => {
    const target = { kind: "task", record: { ...task, assignee: "" } } as const;
    await saveResource(target, { ...initialDraft(target), title: "Renamed" }, [
      sprint,
    ]);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      title: "Renamed",
    });
  });
  it("rejects cross-project sprint assignment before sending", async () => {
    await expect(
      saveResource(
        targets[2][0],
        { ...initialDraft(targets[2][0]), project_id: "p2" },
        [sprint],
      ),
    ).rejects.toThrow(/belonging/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each(["-1", "Infinity", "NaN", "1000000000", ""])(
    "rejects invalid points %s",
    async (story_points) => {
      await expect(
        saveResource(
          targets[2][0],
          { ...initialDraft(targets[2][0]), story_points },
          [sprint],
        ),
      ).rejects.toThrow(/Story points/);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
  it("rejects reversed dates and whitespace-only names", async () => {
    await expect(
      saveResource(
        targets[0][0],
        { ...initialDraft(targets[0][0]), end_date: "2026-08-01" },
        [],
      ),
    ).rejects.toThrow(/precede/);
    await expect(
      saveResource(
        targets[0][0],
        { ...initialDraft(targets[0][0]), name: "  " },
        [],
      ),
    ).rejects.toThrow(/spaces/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("explains 409 without triggering extra deletes", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ detail: "Dependents exist" }, { status: 409 }),
    );
    await expect(removeResource(targets[0][0])).rejects.toMatchObject({
      status: 409,
    });
    expect(
      projectWriteError(new ApiError("Conflict", "http", { status: 409 })),
    ).toContain("Nothing was cascade-deleted");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("aggregates points across all active sprints and excludes unassigned tasks", () => {
    expect(
      summarizeProjects({
        projects: [project],
        sprints: [sprint, { ...sprint, id: "s2" }],
        tasks: [
          task,
          { ...task, id: "t2", sprint_id: "s2", story_points: 5 },
          { ...task, sprint_id: null, story_points: 100 },
        ],
        milestones: [],
      }),
    ).toMatchObject({ activeSprints: 2, sprintPoints: 8.5 });
  });
});
