import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteProject,
  deleteProjectWithContents,
  getProjectDeleteImpact,
} from "./projects.ts";
import { onUnauthorized } from "./session-requests.ts";

const fetchMock = vi.fn<typeof fetch>();
const identity = { id: "project/1", name: " ILTO V1 " };
const deleted = {
  tasks: 2,
  sprints: 1,
  milestones: 1,
  repositories: 1,
  focus_sessions: 2,
};
const unlinked = { learning_goals: 1, study_schedules: 0, study_sessions: 3 };
const focusSessions = {
  total: 2,
  active: 0,
  paused: 0,
  finished: 2,
  has_unfinished_sessions: false,
};
const confirmationToken = "a".repeat(64);
const preview = {
  project: identity,
  will_delete: deleted,
  will_unlink: unlinked,
  focus_sessions: focusSessions,
  blocking_dependencies: [],
  confirmation_token: confirmationToken,
};

beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8001/api/v1");
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Project destructive deletion HTTP contract (mocked)", () => {
  it("GETs encoded impact without a body, using credentialed requests", async () => {
    fetchMock.mockResolvedValue(Response.json(preview));
    await expect(getProjectDeleteImpact(identity.id)).resolves.toEqual(preview);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "http://localhost:8001/api/v1/projects/project%2F1/delete-impact",
    );
    expect(init).toMatchObject({ method: "GET", credentials: "include" });
    expect(init?.body).toBeUndefined();
    expect(new Headers(init?.headers).has("Origin")).toBe(false);
  });
  it("POSTs the untouched confirmation string and reviewed token", async () => {
    const result = {
      status: "deleted",
      project: identity,
      deleted: { ...deleted, tasks: 9 },
      unlinked,
    };
    fetchMock.mockResolvedValue(Response.json(result));
    await expect(
      deleteProjectWithContents(identity.id, identity.name, confirmationToken),
    ).resolves.toEqual(result);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "http://localhost:8001/api/v1/projects/project%2F1/delete-with-contents",
    );
    expect(init).toMatchObject({ method: "POST", credentials: "include" });
    expect(JSON.parse(String(init?.body))).toEqual({
      confirm_name: " ILTO V1 ",
      confirmation_token: confirmationToken,
    });
  });
  it("preserves restrictive normal DELETE as a separate call", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await deleteProject(identity.id);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "http://localhost:8001/api/v1/projects/project%2F1",
    );
    expect(fetchMock.mock.calls[0][1]?.method).toBe("DELETE");
    expect(fetchMock.mock.calls[0][1]?.body).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("accepts opaque blocking dependencies with null counts without resolving them", async () => {
    const blocked = {
      ...preview,
      blocking_dependencies: [
        {
          resource: "unavailable_dependency",
          count: null,
          reason: "A related record cannot be safely handled.",
        },
      ],
    };
    fetchMock.mockResolvedValue(Response.json(blocked));
    await expect(getProjectDeleteImpact(identity.id)).resolves.toEqual(blocked);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it.each([
    null,
    { ...preview, project: { id: "wrong", name: "Other" } },
    { ...preview, will_delete: undefined },
    { ...preview, will_delete: { ...deleted, tasks: -1 } },
    { ...preview, confirmation_token: "not-a-token" },
    {
      ...preview,
      focus_sessions: { ...focusSessions, finished: 1 },
    },
    { ...preview, will_unlink: { ...unlinked, study_sessions: null } },
    { ...preview, blocking_dependencies: undefined },
    { ...preview, blocking_dependencies: [null] },
    {
      ...preview,
      blocking_dependencies: [{ resource: "unknown", count: null }],
    },
  ])("fails closed on malformed preview %#", async (payload) => {
    fetchMock.mockResolvedValue(Response.json(payload));
    await expect(getProjectDeleteImpact(identity.id)).rejects.toMatchObject({
      code: "invalid_response",
    });
  });
  it.each([undefined, {}, { status: "deleted", project: identity, deleted }])(
    "never fabricates success counts for malformed result %#",
    async (payload) => {
      fetchMock.mockResolvedValue(
        payload === undefined
          ? new Response(null, { status: 204 })
          : Response.json(payload),
      );
      await expect(
        deleteProjectWithContents(
          identity.id,
          identity.name,
          confirmationToken,
        ),
      ).rejects.toMatchObject({ code: "invalid_response" });
    },
  );
  it.each([401, 403, 404, 409, 422, 503])(
    "preserves HTTP %s and never retries POST",
    async (status) => {
      fetchMock.mockResolvedValue(
        Response.json({ detail: "Safe backend detail" }, { status }),
      );
      await expect(
        deleteProjectWithContents(
          identity.id,
          identity.name,
          confirmationToken,
        ),
      ).rejects.toMatchObject({
        status,
        details: { detail: "Safe backend detail" },
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );
  it("preserves a backend validation failure for a missing or invalid token", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        {
          detail: [
            {
              loc: ["body", "confirmation_token"],
              msg: "Invalid value",
            },
          ],
        },
        { status: 422 },
      ),
    );
    await expect(
      deleteProjectWithContents(identity.id, identity.name, "invalid-token"),
    ).rejects.toMatchObject({ status: 422 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("passes 401 through global session-loss handling", async () => {
    const listener = vi.fn();
    const unsubscribe = onUnauthorized(listener);
    try {
      fetchMock.mockResolvedValue(
        Response.json({ detail: "Authentication required" }, { status: 401 }),
      );
      await expect(getProjectDeleteImpact(identity.id)).rejects.toMatchObject({
        status: 401,
      });
      expect(listener).toHaveBeenCalledTimes(1);
    } finally {
      unsubscribe();
    }
  });
});
