// In-memory HTTP fixture ONLY. No application imports, backend writes or seed data.
import type { FocusSession, ProjectFocus } from "@/lib/api/project-focus.ts";
import { project, sprint, task, milestone } from "./fixtures.ts";
import type { ProjectsData } from "../projects-data.ts";

export const stamp = "2026-10-15T10:00:00Z";
export function session(overrides: Partial<FocusSession> = {}): FocusSession {
  return {
    id: "f1",
    task_id: "t1",
    project_id: "p1",
    status: "active",
    started_at: stamp,
    paused_at: null,
    finished_at: null,
    resume_note: null,
    created_at: stamp,
    updated_at: stamp,
    ...overrides,
  };
}
export function focusServer() {
  const data: ProjectsData = {
    projects: [{ ...project }, { ...project, id: "p2", name: "Project Beta" }],
    tasks: [
      { ...task, acceptance_criteria: "Manual condition\nAnother condition" },
      { ...task, id: "t2", title: "Next Task", sprint_id: null },
      { ...task, id: "other", project_id: "p2", title: "Private Beta Task" },
    ],
    sprints: [{ ...sprint }],
    milestones: [{ ...milestone }],
  };
  const sessions: FocusSession[] = [];
  const keys = new Map<string, FocusSession>();
  const server = {
    data,
    sessions,
    failReads: false,
    reject: "",
    loseResponse: "",
    loseBeforeCommit: "",
    restartOnWrite: false,
    concurrentSwitchTaskId: "",
    current: () => sessions.find((item) => item.status === "active") ?? null,
    focus(id: string): ProjectFocus {
      const context = (item: FocusSession) => ({
        session: item,
        task: data.tasks.find((t) => t.id === item.task_id)!,
        project: data.projects.find((p) => p.id === item.project_id)!,
      });
      const active = server.current();
      const paused = sessions.filter(
        (item) => item.project_id === id && item.status === "paused",
      );
      const tasks = data.tasks.filter((item) => item.project_id === id);
      const recommended =
        !active && !paused.length
          ? (tasks.find((item) =>
              ["backlog", "todo", "in_progress"].includes(item.status),
            ) ?? null)
          : null;
      return {
        project: data.projects.find((item) => item.id === id)!,
        active_session: active?.project_id === id ? context(active) : null,
        active_session_elsewhere:
          active && active.project_id !== id ? context(active) : null,
        paused_sessions: paused.map(context),
        recommended_task: recommended,
        recommendation_reason: recommended
          ? "Active sprint and priority from the server"
          : null,
        alternative_tasks: [],
        active_sprints: data.sprints,
        milestones: data.milestones,
        empty_state: !tasks.length
          ? "empty_project"
          : recommended || active || paused.length
            ? "none"
            : "no_eligible_tasks",
      };
    },
    async fetch(url: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const parsed = new URL(String(url));
      const path = parsed.pathname.replace("/api/v1", "");
      const method = init?.method ?? "GET";
      if (path === "/auth/me") return Response.json({ username: "owner" });
      if (method === "GET") {
        if (server.failReads)
          return Response.json({ detail: "Restarting" }, { status: 503 });
        if (path === "/projects")
          return Response.json({
            data: data.projects,
            total: data.projects.length,
            page: 1,
            per_page: 100,
            total_pages: 1,
          });
        if (path === "/projects/tasks")
          return Response.json(
            data.tasks.filter(
              (item) =>
                !parsed.searchParams.has("project_id") ||
                item.project_id === parsed.searchParams.get("project_id"),
            ),
          );
        if (path === "/projects/sprints") return Response.json(data.sprints);
        if (path === "/projects/milestones")
          return Response.json(data.milestones);
        if (path === "/projects/repositories") return Response.json([]);
        if (path === "/projects/focus-sessions/current")
          return Response.json(server.current());
        if (path === "/projects/focus-sessions/resumable")
          return Response.json(
            sessions.filter((item) => item.status === "paused"),
          );
        if (/^\/projects\/[^/]+\/focus$/.test(path)) {
          const id = path.split("/")[2];
          return data.projects.some((item) => item.id === id)
            ? Response.json(server.focus(id))
            : Response.json({ detail: "Project not found" }, { status: 404 });
        }
      } else {
        if (server.reject && path.endsWith(server.reject))
          return Response.json(
            { detail: "Concurrent state conflict" },
            { status: 409 },
          );
        if (server.loseBeforeCommit && path.endsWith(server.loseBeforeCommit)) {
          server.loseBeforeCommit = "";
          throw new TypeError("Network lost before commit");
        }
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        let result: unknown;
        if (
          method === "PATCH" &&
          path.startsWith("/projects/focus-sessions/") &&
          path.endsWith("/resume-note")
        ) {
          const target = sessions.find(
            (item) => item.id === path.split("/").at(-2),
          );
          if (!target)
            return Response.json({ detail: "Not found" }, { status: 404 });
          if (
            target.status === "finished" ||
            body.expected_updated_at !== target.updated_at
          )
            return Response.json(
              { detail: "Focus session changed elsewhere" },
              { status: 409 },
            );
          Object.assign(target, {
            resume_note: body.resume_note === "" ? null : body.resume_note,
            updated_at: new Date(
              Date.parse(target.updated_at) + 1000,
            ).toISOString(),
          });
          result = target;
        } else if (method === "PATCH" && path.startsWith("/projects/tasks/")) {
          const target = data.tasks.find(
            (item) => item.id === path.split("/").at(-1),
          )!;
          if (
            sessions.some(
              (item) =>
                item.task_id === target.id && item.status !== "finished",
            )
          )
            return Response.json(
              { detail: "Unfinished sessions" },
              { status: 409 },
            );
          Object.assign(target, body);
          data.sprints[0].velocity = data.tasks
            .filter((item) => item.sprint_id === "s1" && item.status === "done")
            .reduce((sum, item) => sum + item.story_points, 0);
          result = target;
        } else if (
          path === "/projects/focus-sessions" ||
          path.endsWith("/switch")
        ) {
          if (keys.has(body.idempotency_key))
            return Response.json(keys.get(body.idempotency_key));
          if (path.endsWith("/switch") && server.concurrentSwitchTaskId) {
            const outgoing = server.current();
            if (outgoing)
              Object.assign(outgoing, {
                status: "paused",
                paused_at: stamp,
                updated_at: new Date(
                  Date.parse(outgoing.updated_at) + 1000,
                ).toISOString(),
              });
            sessions.push(
              session({
                id: `external-${sessions.length + 1}`,
                task_id: server.concurrentSwitchTaskId,
              }),
            );
            server.concurrentSwitchTaskId = "";
          }
          const active = server.current();
          if (active && !path.endsWith("/switch"))
            return Response.json({ detail: "Already active" }, { status: 409 });
          if (
            path.endsWith("/switch") &&
            (!active || body.expected_active_session_id !== active.id)
          )
            return Response.json(
              { detail: "The active session changed elsewhere" },
              { status: 409 },
            );
          const noteSupplied = Object.prototype.hasOwnProperty.call(
            body,
            "resume_note",
          );
          if (path.endsWith("/switch") && noteSupplied) {
            if (!body.expected_updated_at)
              return Response.json(
                {
                  detail:
                    "expected_updated_at is required when resume_note is supplied",
                },
                { status: 422 },
              );
            if (body.expected_updated_at !== active?.updated_at)
              return Response.json(
                { detail: "The focus session changed elsewhere" },
                { status: 409 },
              );
          }
          if (active) {
            Object.assign(active, {
              status: "paused",
              paused_at: stamp,
              updated_at: new Date(
                Date.parse(active.updated_at) + 1000,
              ).toISOString(),
            });
            if (noteSupplied)
              active.resume_note =
                body.resume_note === "" ? null : body.resume_note;
          }
          const target = data.tasks.find((item) => item.id === body.task_id)!;
          target.status = "in_progress";
          const created = session({
            id: `f${sessions.length + 1}`,
            task_id: target.id,
            project_id: target.project_id,
          });
          sessions.push(created);
          keys.set(body.idempotency_key, created);
          result = created;
        } else {
          const action = path.split("/").at(-1);
          const target = sessions.find(
            (item) => item.id === path.split("/").at(-2),
          );
          if (!target)
            return Response.json({ detail: "Not found" }, { status: 404 });
          if (action === "pause" && target.status === "active") {
            const noteSupplied = Object.prototype.hasOwnProperty.call(
              body,
              "resume_note",
            );
            if (noteSupplied && !body.expected_updated_at)
              return Response.json(
                {
                  detail:
                    "expected_updated_at is required when resume_note is supplied",
                },
                { status: 422 },
              );
            if (noteSupplied && body.expected_updated_at !== target.updated_at)
              return Response.json(
                { detail: "The focus session changed elsewhere" },
                { status: 409 },
              );
            Object.assign(target, {
              status: "paused",
              paused_at: stamp,
              updated_at: new Date(
                Date.parse(target.updated_at) + 1000,
              ).toISOString(),
            });
            if (noteSupplied)
              target.resume_note =
                body.resume_note === "" ? null : body.resume_note;
          }
          if (action === "resume")
            Object.assign(target, { status: "active", paused_at: null });
          if (action === "finish")
            Object.assign(target, { status: "finished", finished_at: stamp });
          result = target;
        }
        if (server.loseResponse && path.endsWith(server.loseResponse)) {
          server.loseResponse = "";
          if (server.restartOnWrite) server.failReads = true;
          throw new TypeError("Committed, but response lost");
        }
        return Response.json(result, {
          status:
            path === "/projects/focus-sessions" || path.endsWith("/switch")
              ? 201
              : 200,
        });
      }
      throw new Error(`Unexpected mocked request: ${method} ${path}`);
    },
  };
  return server;
}
