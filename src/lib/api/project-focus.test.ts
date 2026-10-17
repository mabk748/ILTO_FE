import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getCurrentFocusSession,
  getProjectFocus,
  getResumableFocusSessions,
  parseFocusSession,
  parseProjectFocus,
  saveFocusSessionNote,
  startFocusSession,
  switchFocusSession,
  transitionFocusSession,
} from "./project-focus.ts";
import {
  focusServer,
  session,
  stamp,
} from "@/pages/projects/__tests__/focus-server.ts";
import { executeFocusIntent } from "@/pages/projects/focus-actions.ts";
import { refreshFocus } from "@/pages/projects/focus-data.ts";
import { QueryClient } from "@tanstack/react-query";

const transport = vi.fn<typeof fetch>();
beforeEach(() => {
  localStorage.clear();
  transport.mockReset();
  vi.stubGlobal("fetch", transport);
  vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8001/api/v1");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("confirmed Focus adapters (mocked transport)", () => {
  it("uses configured URL, credentials, cancellation, active null and unpaginated resumable arrays", async () => {
    transport
      .mockResolvedValueOnce(Response.json(null))
      .mockResolvedValueOnce(
        Response.json([session({ status: "paused", paused_at: stamp })]),
      );
    const controller = new AbortController();
    expect(await getCurrentFocusSession({ signal: controller.signal })).toBe(
      null,
    );
    expect(await getResumableFocusSessions()).toHaveLength(1);
    expect(String(transport.mock.calls[0][0])).toBe(
      "http://localhost:8001/api/v1/projects/focus-sessions/current",
    );
    expect(transport.mock.calls[0][1]?.credentials).toBe("include");
    expect(transport.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
    expect(new Headers(transport.mock.calls[0][1]?.headers).has("Origin")).toBe(
      false,
    );
  });
  it("omits unchanged lifecycle notes and versions explicit Switch/Pause updates", async () => {
    transport
      .mockResolvedValueOnce(Response.json(session(), { status: 201 }))
      .mockResolvedValueOnce(Response.json(session()))
      .mockResolvedValueOnce(Response.json(session()))
      .mockResolvedValueOnce(
        Response.json(session({ status: "paused", paused_at: stamp })),
      )
      .mockResolvedValueOnce(
        Response.json(session({ status: "paused", paused_at: stamp })),
      )
      .mockResolvedValueOnce(Response.json(session()))
      .mockResolvedValueOnce(
        Response.json(session({ status: "finished", finished_at: stamp })),
      );
    const input = {
      task_id: "t1",
      idempotency_key: "stable-key",
      id: "forbidden",
      created_at: stamp,
    };
    await startFocusSession(input);
    await switchFocusSession({
      ...input,
      expected_active_session_id: "f1",
    });
    await switchFocusSession({
      ...input,
      expected_active_session_id: "f1",
      resume_note: "Context",
      expected_updated_at: stamp,
    });
    await transitionFocusSession("f1", "pause");
    await transitionFocusSession("f1", "pause", {
      resume_note: null,
      expected_updated_at: stamp,
    });
    await transitionFocusSession("f1", "resume");
    await transitionFocusSession("f1", "finish");
    expect(
      transport.mock.calls.map(([, init]) =>
        init?.body ? JSON.parse(String(init.body)) : undefined,
      ),
    ).toEqual([
      { task_id: "t1", idempotency_key: "stable-key" },
      {
        task_id: "t1",
        idempotency_key: "stable-key",
        expected_active_session_id: "f1",
      },
      {
        task_id: "t1",
        idempotency_key: "stable-key",
        expected_active_session_id: "f1",
        resume_note: "Context",
        expected_updated_at: stamp,
      },
      {},
      { resume_note: null, expected_updated_at: stamp },
      undefined,
      undefined,
    ]);
    expect(
      transport.mock.calls.every(
        ([, init]) => init?.method === "POST" && init.credentials === "include",
      ),
    ).toBe(true);
  });
  it("saves and clears a resume note with the authoritative session version", async () => {
    transport.mockResolvedValueOnce(
      Response.json(
        session({
          resume_note: "Saved context",
          updated_at: "2026-10-15T10:00:01Z",
        }),
      ),
    );
    const result = await saveFocusSessionNote({
      id: "f1",
      resume_note: "Saved context",
      expected_updated_at: stamp,
    });
    expect(result.resume_note).toBe("Saved context");
    expect(JSON.parse(String(transport.mock.calls[0][1]?.body))).toEqual({
      resume_note: "Saved context",
      expected_updated_at: stamp,
    });
    expect(transport.mock.calls[0][1]?.method).toBe("PATCH");
    expect(transport.mock.calls[0][1]?.credentials).toBe("include");
  });
  it.each([401, 404, 409, 422, 503])(
    "preserves HTTP %s and never auto-retries",
    async (status) => {
      transport.mockResolvedValue(
        Response.json({ detail: "Not accepted" }, { status }),
      );
      await expect(
        startFocusSession({ task_id: "t1", idempotency_key: "key" }),
      ).rejects.toMatchObject({ status, code: "http" });
      expect(transport).toHaveBeenCalledTimes(1);
    },
  );
  it("rejects malformed, naive timestamp and wrong-project responses", async () => {
    const server = focusServer();
    expect(() =>
      parseFocusSession({ ...session(), started_at: "2026-10-15T10:00:00" }),
    ).toThrow(/Invalid Focus/);
    expect(() =>
      parseFocusSession({ ...session(), status: "paused", paused_at: null }),
    ).toThrow(/Invalid Focus/);
    expect(() =>
      parseFocusSession({ ...session(), finished_at: stamp }),
    ).toThrow(/Invalid Focus/);
    expect(() => parseProjectFocus(server.focus("p1"), "p2")).toThrow(
      /Invalid Focus/,
    );
    transport.mockResolvedValue(
      Response.json({
        ...server.focus("p1"),
        active_session: {
          session: session(),
          project: server.data.projects[1],
          task: server.data.tasks[0],
        },
      }),
    );
    await expect(getProjectFocus("p1")).rejects.toMatchObject({
      code: "invalid_response",
    });
  });
  it("does not claim a transition succeeded on a mismatching response", async () => {
    transport.mockImplementation(async () => Response.json(session()));
    await expect(transitionFocusSession("f1", "finish")).rejects.toMatchObject({
      code: "invalid_response",
    });
    await expect(
      startFocusSession({ task_id: "t2", idempotency_key: "key" }),
    ).rejects.toMatchObject({ code: "invalid_response" });
  });
  it("refuses a switch if another tab replaced its expected outgoing session", async () => {
    transport.mockResolvedValue(
      Response.json(session({ id: "another-session" })),
    );
    await expect(
      executeFocusIntent({
        action: "switch",
        taskId: "t2",
        key: "key",
        expectedActiveId: "f1",
        noteUpdate: {
          sessionId: "f1",
          note: "Draft",
          expectedUpdatedAt: stamp,
        },
      }),
    ).rejects.toThrow(/active session changed/);
    expect(
      transport.mock.calls.every(([, init]) => init?.method === "GET"),
    ).toBe(true);
  });
  it("uses the normal Start flow when there is no active session", async () => {
    transport
      .mockResolvedValueOnce(Response.json(null))
      .mockResolvedValueOnce(Response.json(session({ task_id: "t2" })));
    await executeFocusIntent({
      action: "start",
      taskId: "t2",
      key: "start-key",
      expectedActiveId: null,
    });
    expect(String(transport.mock.calls[1][0])).toContain(
      "/projects/focus-sessions",
    );
    expect(JSON.parse(String(transport.mock.calls[1][1]?.body))).toEqual({
      task_id: "t2",
      idempotency_key: "start-key",
    });
  });
  it("invalidates Focus and the shared Projects snapshot, not unrelated modules or repositories", async () => {
    const client = new QueryClient();
    const keys = [
      ["projects", "focus", "current"],
      ["projects", "focus", "project", "p1"],
      ["projects", "focus", "tasks", "p1"],
      ["projects", "data"],
      ["dashboard"],
      ["intelligence"],
      ["projects", "repositories", "p1"],
    ];
    keys.forEach((key) => client.setQueryData(key, {}));
    await refreshFocus(client);
    expect(keys.map((key) => client.getQueryState(key)?.isInvalidated)).toEqual(
      [true, true, true, true, false, false, false],
    );
  });
});
