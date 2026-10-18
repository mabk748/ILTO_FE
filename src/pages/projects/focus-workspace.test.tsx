import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProjectWorkspace from "./workspace.tsx";
import { focusServer, session, stamp } from "./__tests__/focus-server.ts";
import { focusKeys } from "./focus-data.ts";
import { AuthProvider } from "@/components/providers/auth.tsx";
import RequireOwner from "@/components/layout/RequireOwner.tsx";
import LoginPage from "@/pages/auth/Login.tsx";

let server: ReturnType<typeof focusServer>;
const transport = vi.fn<typeof fetch>();
const writes = () =>
  transport.mock.calls.filter(([, init]) => init?.method !== "GET");
function setup(entry = "/projects/p1/now") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/projects/:projectId/*" element={<ProjectWorkspace />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return client;
}
async function click(name: string) {
  const button = await screen.findByRole("button", { name });
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.click(button);
}
const area = (name: string) =>
  fireEvent.click(
    within(
      screen.getByRole("navigation", { name: "Project workspace" }),
    ).getByRole("link", { name }),
  );
beforeEach(() => {
  localStorage.clear();
  server = focusServer();
  transport.mockReset();
  transport.mockImplementation((url, init) => server.fetch(url, init));
  vi.stubGlobal("fetch", transport);
  vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8001/api/v1");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("Focus execution (mocked HTTP/jsdom, not a live backend/browser)", () => {
  it("shows a bounded NEXT horizon and resumes an exact paused session", async () => {
    server.sessions.push(
      session({
        status: "paused",
        paused_at: stamp,
        resume_note: "Resume from NEXT",
      }),
    );
    server.data.tasks.push(
      ...Array.from({ length: 7 }, (_, index) => ({
        ...server.data.tasks[1],
        id: `backlog-${index}`,
        title: `Backlog ${index}`,
        status: "backlog" as const,
        priority: "low" as const,
      })),
    );
    setup("/projects/p1/next");
    expect(await screen.findByRole("region", { name: "NEXT" })).toHaveClass(
      "space-y-5",
    );
    expect(await screen.findByText("Resume from NEXT")).toBeVisible();
    expect(screen.getByText("Showing 3 of 8.")).toBeVisible();
    expect(
      screen
        .getByRole("region", { name: "NEXT" })
        .querySelector('[data-layout="execution-queue"]'),
    ).toHaveClass("lg:grid-cols-[minmax(0,1fr)_20rem]");
    await click("Resume Task");
    expect(await screen.findByText("active Focus session")).toBeVisible();
    expect(server.current()?.id).toBe("f1");
  });
  it("rejects a stale paused-session URL without inferring finish or starting another session", async () => {
    setup("/projects/p1/now?task=t1&session=removed");
    await screen.findByText(/selected paused session is no longer available/);
    expect(screen.getByRole("button", { name: "Start Task" })).toBeDisabled();
    expect(writes()).toHaveLength(0);
    await click("Clear stale session selection");
    expect(screen.getByRole("button", { name: "Start Task" })).toBeEnabled();
  });

  it("selects the exact paused session when one Task has several records", async () => {
    server.sessions.push(
      session({
        status: "paused",
        paused_at: stamp,
        resume_note: "First context",
      }),
      session({
        id: "f2",
        status: "paused",
        paused_at: stamp,
        resume_note: "Second context",
      }),
    );
    setup("/projects/p1/now?task=t1&session=f2");
    await screen.findByText("paused Focus session");
    expect(
      within(
        screen.getByRole("region", { name: "Focus session controls" }),
      ).getByLabelText("Resume note"),
    ).toHaveValue("Second context");
    await click("Resume");
    await screen.findByText(/Server confirms the session is active/);
    expect(server.current()?.id).toBe("f2");
    expect(writes().map(([url]) => String(url))).toEqual([
      "http://localhost:8001/api/v1/projects/focus-sessions/f2/resume",
    ]);
  });

  it("reconciles competing starts from two independent tab caches", async () => {
    const tab = () => {
      const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      const view = render(
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={["/projects/p1/now"]}>
            <Routes>
              <Route
                path="/projects/:projectId/*"
                element={<ProjectWorkspace />}
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      );
      return within(view.container);
    };
    const first = tab();
    const second = tab();
    const a = await first.findByRole("button", { name: "Start Task" });
    const b = await second.findByRole("button", { name: "Start Task" });
    await waitFor(() => {
      expect(a).toBeEnabled();
      expect(b).toBeEnabled();
    });
    fireEvent.click(a);
    fireEvent.click(b);
    await first.findByText("active Focus session");
    await second.findByText("active Focus session");
    expect(server.sessions).toHaveLength(1);
    expect(await second.findByRole("alert")).toHaveTextContent(
      /State conflict|Active work changed/,
    );
  });

  it("clears Focus data on authentication expiry and restores the server's paused work after sign-in", async () => {
    server.sessions.push(
      session({
        status: "paused",
        paused_at: stamp,
        resume_note: "Recover my context",
      }),
    );
    let expired = false;
    transport.mockImplementation(async (url, init) => {
      if (String(url).endsWith("/auth/login")) {
        expired = false;
        return Response.json({ username: "owner" });
      }
      if (expired) return Response.json({ detail: "Expired" }, { status: 401 });
      return server.fetch(url, init);
    });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <AuthProvider>
          <MemoryRouter initialEntries={["/projects/p1/now"]}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<RequireOwner />}>
                <Route
                  path="/projects/:projectId/*"
                  element={<ProjectWorkspace />}
                />
              </Route>
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>,
    );
    await screen.findByText("paused Focus session");
    expired = true;
    await click("Resume");
    await screen.findByText(/Your session expired/);
    expect(client.getQueryData(focusKeys.current)).toBeUndefined();
    expect(
      screen.queryByText("Saved stopping context"),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "owner" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "test-only" },
    });
    await click("Sign in");
    await screen.findByText("paused Focus session");
    expect(screen.getAllByText("Recover my context").length).toBeGreaterThan(0);
    expect(server.sessions[0].status).toBe("paused");
    expect(localStorage.length).toBe(0);
  });

  it("checks account identity before sending a Focus write", async () => {
    let owner = "owner";
    transport.mockImplementation((url, init) =>
      String(url).endsWith("/auth/me")
        ? Promise.resolve(Response.json({ username: owner }))
        : server.fetch(url, init),
    );
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <AuthProvider>
          <MemoryRouter initialEntries={["/projects/p1/now"]}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<RequireOwner />}>
                <Route
                  path="/projects/:projectId/*"
                  element={<ProjectWorkspace />}
                />
              </Route>
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>,
    );
    await screen.findByRole("button", { name: "Start Task" });
    owner = "other-owner";
    await click("Start Task");
    await waitFor(() =>
      expect(
        transport.mock.calls.filter(([url]) => String(url).endsWith("/auth/me"))
          .length,
      ).toBeGreaterThanOrEqual(3),
    );
    expect(writes()).toHaveLength(0);
  });
  it("opens recommendation, starts, pauses, leaves, returns, resumes, finishes, manually completes and recommends next", async () => {
    const client = setup();
    client.setQueryData(["dashboard"], "unrelated");
    client.setQueryData(["intelligence"], "unrelated");
    expect(
      await screen.findByText("Active sprint and priority from the server"),
    ).toBeVisible();
    const now = screen.getByRole("region", { name: "NOW" });
    expect(now).toHaveAttribute("data-focus-state", "recommended");
    expect(now.querySelector('[data-layout="focus-cockpit"]')).toHaveClass(
      "lg:grid-cols-[minmax(0,7fr)_minmax(18rem,3fr)]",
    );
    expect(screen.getByText(/Manual condition/)).toBeVisible();
    await click("Start Task");
    expect(await screen.findByText("active Focus session")).toBeVisible();
    expect(now).toHaveAttribute("data-focus-state", "active");
    expect(screen.getByRole("button", { name: "Save Note" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Resume note"), {
      target: { value: "Continue with the parser" },
    });
    expect(
      screen.getByRole("button", { name: "Finish Session" }),
    ).toBeDisabled();
    await click("Pause");
    expect(await screen.findByText("paused Focus session")).toBeVisible();
    expect(now).toHaveAttribute("data-focus-state", "paused");
    area("NEXT");
    area("NOW");
    expect(await screen.findByText("Saved stopping context")).toBeVisible();
    await click("Resume");
    await screen.findByText("active Focus session");
    await click("Finish Session");
    await screen.findByText(
      /Session finished. Task status has not been changed/,
    );
    expect(screen.getByRole("region", { name: "NOW" })).toHaveAttribute(
      "data-focus-state",
      "finished",
    );
    expect(server.data.tasks[0].status).toBe("in_progress");
    expect(
      writes().filter(([, init]) => init?.method === "PATCH"),
    ).toHaveLength(0);
    await click("Verify Task completion");
    expect(
      screen.getByRole("button", { name: "Confirm Task status" }),
    ).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Task outcome"), {
      target: { value: "done" },
    });
    fireEvent.click(screen.getByRole("checkbox"));
    await click("Confirm Task status");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(
      await screen.findByRole("heading", { name: "Next Task" }),
    ).toBeVisible();
    expect(server.data.tasks[0].status).toBe("done");
    expect(server.data.sprints[0].velocity).toBe(3.5);
    expect(client.getQueryState(["dashboard"])?.isInvalidated).toBe(false);
    expect(client.getQueryState(["intelligence"])?.isInvalidated).toBe(false);
    const patch = writes().find(([, init]) => init?.method === "PATCH")!;
    expect(JSON.parse(String(patch[1]?.body))).toEqual({ status: "done" });
    expect(writes().every(([, init]) => init?.credentials === "include")).toBe(
      true,
    );
    area("EXPLORE");
    fireEvent.keyDown(screen.getByRole("tab", { name: "sprints" }), {
      key: "Enter",
    });
    expect(await screen.findByText("3.5/3.5 story points")).toBeVisible();
    expect(client.getQueryData(focusKeys.current)).toBe(null);
  });

  it("saves and clears an active resume note with the server version", async () => {
    server.sessions.push(session());
    setup();
    const input = await screen.findByLabelText("Resume note");
    fireEvent.change(input, { target: { value: "Persist this context" } });
    await click("Save Note");
    await screen.findByText("Resume note saved by the server.");
    expect(server.sessions[0].resume_note).toBe("Persist this context");
    const firstPatch = writes().find(([url]) =>
      String(url).endsWith("/resume-note"),
    );
    expect(JSON.parse(String(firstPatch?.[1]?.body))).toEqual({
      resume_note: "Persist this context",
      expected_updated_at: stamp,
    });
    fireEvent.change(input, { target: { value: "" } });
    await click("Save Note");
    await waitFor(() => expect(server.sessions[0].resume_note).toBe(null));
    const notePatches = writes().filter(([url]) =>
      String(url).endsWith("/resume-note"),
    );
    expect(JSON.parse(String(notePatches[1][1]?.body))).toMatchObject({
      resume_note: null,
    });
  });

  it("pauses without note fields when the saved note is unchanged", async () => {
    server.sessions.push(session({ resume_note: "Persisted context" }));
    setup();
    expect(await screen.findByLabelText("Resume note")).toHaveValue(
      "Persisted context",
    );
    await click("Pause");
    await screen.findByText(/existing resume note was preserved/);
    expect(server.sessions[0].resume_note).toBe("Persisted context");
    expect(JSON.parse(String(writes()[0][1]?.body))).toEqual({});
  });

  it("pauses with an explicit versioned note clear", async () => {
    server.sessions.push(session({ resume_note: "Remove this context" }));
    setup();
    fireEvent.change(await screen.findByLabelText("Resume note"), {
      target: { value: "" },
    });
    await click("Pause");
    await screen.findByText(/Resume note update confirmed/);
    expect(server.sessions[0].resume_note).toBe(null);
    expect(JSON.parse(String(writes()[0][1]?.body))).toEqual({
      resume_note: null,
      expected_updated_at: stamp,
    });
  });

  it("saves a paused note before allowing resume", async () => {
    server.sessions.push(
      session({ status: "paused", paused_at: stamp, resume_note: null }),
    );
    setup("/projects/p1/now?task=t1&session=f1");
    const input = await screen.findByLabelText("Resume note");
    fireEvent.change(input, { target: { value: "Resume with this context" } });
    expect(screen.getByRole("button", { name: "Resume" })).toBeDisabled();
    await click("Save Note");
    expect(
      await screen.findByText("Resume note saved by the server."),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Resume" })).toBeEnabled();
  });

  it("keeps a note draft through a version conflict and only retries after review", async () => {
    server.sessions.push(session());
    setup();
    const input = await screen.findByLabelText("Resume note");
    fireEvent.change(input, { target: { value: "Keep this draft" } });
    server.sessions[0].updated_at = "2026-10-15T10:00:05Z";
    await click("Save Note");
    expect(
      await screen.findByText(/FocusSession changed elsewhere/),
    ).toBeVisible();
    expect(input).toHaveValue("Keep this draft");
    expect(
      screen.getByRole("button", { name: "Retry Save Note" }),
    ).toBeVisible();
    expect(
      writes().filter(([url]) => String(url).endsWith("/resume-note")),
    ).toHaveLength(1);
    await click("Retry Save Note");
    await screen.findByText("Resume note saved by the server.");
    expect(server.sessions[0].resume_note).toBe("Keep this draft");
    expect(
      writes().filter(([url]) => String(url).endsWith("/resume-note")),
    ).toHaveLength(2);
  });

  it("does not overwrite a dirty draft during Focus refetch and protects internal navigation", async () => {
    server.sessions.push(session());
    setup();
    const input = await screen.findByLabelText("Resume note");
    fireEvent.change(input, { target: { value: "Local unsaved draft" } });
    Object.assign(server.sessions[0], {
      resume_note: "Changed in another tab",
      updated_at: "2026-10-15T10:00:05Z",
    });
    await click("Refresh Focus");
    expect(input).toHaveValue("Local unsaved draft");
    area("NEXT");
    expect(await screen.findByRole("dialog")).toHaveTextContent(
      "Unsaved Focus note",
    );
    await click("Stay and continue editing");
    expect(screen.getByRole("heading", { name: "NOW" })).toBeVisible();
    fireEvent.change(screen.getByLabelText("Selected task"), {
      target: { value: "t2" },
    });
    expect(await screen.findByRole("dialog")).toHaveTextContent(
      "would leave the current Focus note draft",
    );
    await click("Stay and continue editing");
    expect(screen.getByLabelText("Resume note")).toHaveValue(
      "Local unsaved draft",
    );
    fireEvent.change(screen.getByLabelText("Selected task"), {
      target: { value: "t2" },
    });
    await click("Discard changes and choose");
    expect(await screen.findByText(/Your URL selects Next Task/)).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("warns before browser exit while a Focus note is dirty", async () => {
    server.sessions.push(session());
    setup();
    const input = await screen.findByLabelText("Resume note");
    fireEvent.change(input, { target: { value: "Do not lose this" } });
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("keeps a draft after a stale-version Pause and requires explicit note recovery", async () => {
    server.sessions.push(session());
    setup();
    const input = await screen.findByLabelText("Resume note");
    fireEvent.change(input, { target: { value: "Keep this draft" } });
    server.sessions[0].updated_at = "2026-10-15T10:00:05Z";
    await click("Pause");
    await screen.findByText(/State conflict:/);
    expect(input).toHaveValue("Keep this draft");
    expect(server.sessions[0].resume_note).toBe(null);
    expect(server.sessions[0].status).toBe("active");
    expect(screen.getByRole("button", { name: "Pause" })).toBeDisabled();
    expect(
      writes().filter(([url]) => String(url).endsWith("/pause")),
    ).toHaveLength(1);
    await click("Retry Save Note");
    await screen.findByText("Resume note saved by the server.");
    await click("Pause");
    await screen.findByText(/existing resume note was preserved/);
    expect(server.sessions[0].resume_note).toBe("Keep this draft");
    const pauseBodies = writes()
      .filter(([url]) => String(url).endsWith("/pause"))
      .map(([, init]) => JSON.parse(String(init?.body)));
    expect(pauseBodies).toEqual([
      {
        resume_note: "Keep this draft",
        expected_updated_at: stamp,
      },
      {},
    ]);
  });

  it.each([true, false])(
    "retries an unknown start with the exact key (committed=%s)",
    async (committed) => {
      if (committed) server.loseResponse = "/focus-sessions";
      else server.loseBeforeCommit = "/focus-sessions";
      setup();
      await click("Start Task");
      await screen.findByText(/original operation is unresolved/);
      expect(screen.queryByText(/Server confirms/)).not.toBeInTheDocument();
      await click("Retry same operation");
      await screen.findByText(/Server confirms the session is active/);
      const calls = writes();
      expect(calls).toHaveLength(2);
      expect(calls[0][1]?.body).toEqual(calls[1][1]?.body);
      expect(server.sessions).toHaveLength(1);
    },
  );

  it("survives backend restart after uncertain finish without inferring success from a null current session", async () => {
    server.sessions.push(session());
    setup();
    server.loseResponse = "/finish";
    server.restartOnWrite = true;
    await click("Finish & Verify");
    await screen.findByText(/original operation is unresolved/);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Retry same operation" }),
    ).toBeDisabled();
    server.failReads = false;
    await click("Refresh Focus");
    await click("Retry same operation");
    expect(await screen.findByRole("dialog")).toHaveTextContent(
      "already finished",
    );
    expect(
      writes().filter(([, init]) => init?.method === "PATCH"),
    ).toHaveLength(0);
  });

  it("keeps confirmed finish separate when Task PATCH fails and retries only the Task update", async () => {
    server.sessions.push(session());
    setup();
    await click("Finish & Verify");
    await screen.findByRole("dialog");
    server.reject = "/tasks/t1";
    fireEvent.click(screen.getByRole("checkbox"));
    await click("Confirm Task status");
    await screen.findByText(/Session finished; Task update not confirmed/);
    expect(server.sessions[0].status).toBe("finished");
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    server.reject = "";
    fireEvent.click(screen.getByRole("checkbox"));
    await click("Confirm Task status");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(
      writes().filter(([url]) => String(url).endsWith("/finish")),
    ).toHaveLength(1);
    expect(server.data.tasks[0].status).toBe("review");
  });

  it("reconciles a lost Task PATCH response using a read without a second PATCH", async () => {
    server.sessions.push(session());
    setup();
    await click("Finish & Verify");
    await screen.findByRole("dialog");
    server.loseResponse = "/tasks/t1";
    fireEvent.click(screen.getByRole("checkbox"));
    await click("Confirm Task status");
    expect(
      await screen.findByText(/Refetch confirms Task status is review/),
    ).toBeVisible();
    expect(
      writes().filter(([, init]) => init?.method === "PATCH"),
    ).toHaveLength(1);
  });

  it("requires acknowledgement again after concurrent Task status/criteria changes", async () => {
    server.sessions.push(session());
    setup();
    await click("Finish & Verify");
    await screen.findByRole("dialog");
    server.data.tasks[0].status = "done";
    server.data.tasks[0].acceptance_criteria = "Revised criteria";
    fireEvent.click(screen.getByRole("checkbox"));
    await click("Confirm Task status");
    expect(
      await screen.findByText(/Task changed since you reviewed it/),
    ).toBeVisible();
    expect(
      within(screen.getByRole("dialog")).getByText("Revised criteria"),
    ).toBeVisible();
    expect(
      writes().filter(([, init]) => init?.method === "PATCH"),
    ).toHaveLength(0);
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("refuses a stale start after another tab starts work and shows cross-project navigation", async () => {
    setup();
    await screen.findByRole("button", { name: "Start Task" });
    server.sessions.push(session({ task_id: "other", project_id: "p2" }));
    await click("Start Task");
    expect(
      await screen.findByText(/Active work changed in another tab/),
    ).toBeVisible();
    expect(
      await screen.findByRole("link", {
        name: "Go to active Project: Project Beta",
      }),
    ).toHaveAttribute("href", "/projects/p2/now?task=other");
    expect(screen.getByRole("region", { name: "NOW" })).toHaveAttribute(
      "data-focus-state",
      "elsewhere",
    );
    expect(writes()).toHaveLength(0);
    expect(
      screen.queryByRole("button", { name: "Start Task" }),
    ).not.toBeInTheDocument();
  });

  it("reconciles another tab's pause on window focus and restores its saved context", async () => {
    server.sessions.push(session());
    setup();
    await screen.findByText("active Focus session");
    Object.assign(server.sessions[0], {
      status: "paused",
      paused_at: stamp,
      resume_note: "Saved in second tab",
    });
    fireEvent.focus(window);
    expect(await screen.findByText("paused Focus session")).toBeVisible();
    expect(screen.getAllByText("Saved in second tab").length).toBeGreaterThan(
      0,
    );
    expect(writes()).toHaveLength(0);
  });

  it("switches explicitly with a note while URL Task selection alone leaves active work unchanged", async () => {
    server.sessions.push(session());
    setup("/projects/p1/now?task=t2");
    expect(
      await screen.findByText(/active session still belongs to Task Alpha/),
    ).toBeVisible();
    expect(writes()).toHaveLength(0);
    fireEvent.change(screen.getByLabelText("Resume note"), {
      target: { value: "Return to Alpha" },
    });
    await click("Switch Task");
    expect(screen.getByLabelText("Task to start")).toHaveValue("t2");
    await click("Confirm switch");
    await screen.findByText(/Server confirms the session is active/);
    expect(server.current()?.task_id).toBe("t2");
    expect(server.sessions[0].resume_note).toBe("Return to Alpha");
    expect(JSON.parse(String(writes()[0][1]?.body))).toEqual({
      task_id: "t2",
      resume_note: "Return to Alpha",
      expected_updated_at: stamp,
      idempotency_key: expect.any(String),
      expected_active_session_id: "f1",
    });
  });

  it("switches without note fields while preserving an unchanged saved note", async () => {
    server.sessions.push(session({ resume_note: "Keep on Task Alpha" }));
    setup("/projects/p1/now?task=t2");
    await screen.findByText(/active session still belongs to Task Alpha/);
    await click("Switch Task");
    await click("Confirm switch");
    await screen.findByText(/Server confirms the session is active/);
    expect(server.sessions[0].resume_note).toBe("Keep on Task Alpha");
    expect(JSON.parse(String(writes()[0][1]?.body))).toEqual({
      task_id: "t2",
      idempotency_key: expect.any(String),
      expected_active_session_id: "f1",
    });
  });

  it("refreshes after a stale switch conflict without retrying and preserves the note draft", async () => {
    server.sessions.push(session());
    setup("/projects/p1/now?task=t2");
    const input = await screen.findByLabelText("Resume note");
    fireEvent.change(input, { target: { value: "Keep this switch context" } });
    await click("Switch Task");
    server.reject = "/switch";
    await click("Confirm switch");
    expect(
      await screen.findByText(
        "The active session or its note changed in another tab. Review the current Focus state before switching.",
      ),
    ).toBeVisible();
    expect(input).toHaveValue("Keep this switch context");
    expect(
      writes().filter(([url]) => String(url).endsWith("/switch")),
    ).toHaveLength(1);
    expect(
      screen.queryByRole("button", { name: "Retry same operation" }),
    ).not.toBeInTheDocument();
  });

  it("keeps a stale Switch draft bound to Session A when refetch reveals Session B", async () => {
    server.sessions.push(session());
    setup("/projects/p1/now?task=t2");
    const input = await screen.findByLabelText("Resume note");
    fireEvent.change(input, {
      target: { value: "Session A draft must stay isolated" },
    });
    await click("Switch Task");
    server.concurrentSwitchTaskId = "t2";
    await click("Confirm switch");
    expect(
      await screen.findByText(
        /unsaved note draft is retained for a previous Focus session/i,
      ),
    ).toBeVisible();
    expect(screen.getByLabelText("Resume note")).toHaveValue("");
    expect(screen.getByLabelText("Resume note")).toBeDisabled();
    expect(server.current()?.task_id).toBe("t2");
    expect(server.sessions[0].resume_note).toBe(null);
    expect(
      writes().filter(([url]) => String(url).endsWith("/switch")),
    ).toHaveLength(1);

    await click("Pause");
    await screen.findByText(/existing resume note was preserved/);
    const pause = writes().find(([url]) => String(url).endsWith("/pause"));
    expect(JSON.parse(String(pause?.[1]?.body))).toEqual({});
    expect(server.sessions[0].resume_note).toBe(null);

    fireEvent.click(
      screen.getByRole("button", { name: server.data.tasks[0].title }),
    );
    expect(await screen.findByLabelText("Resume note")).toHaveValue(
      "Session A draft must stay isolated",
    );
    expect(
      screen.getByRole("button", { name: "Retry Save Note" }),
    ).toBeVisible();
  });

  it("retries an uncertain switch with the exact idempotency key", async () => {
    server.sessions.push(session());
    setup("/projects/p1/now?task=t2");
    await screen.findByText(/active session still belongs to Task Alpha/);
    fireEvent.change(screen.getByLabelText("Resume note"), {
      target: { value: "Stable retry draft" },
    });
    server.loseResponse = "/switch";
    await click("Switch Task");
    await click("Confirm switch");
    await screen.findByText(/original operation is unresolved/);
    await click("Retry same operation");
    await screen.findByText(/Server confirms the session is active/);
    const switches = writes().filter(([url]) =>
      String(url).endsWith("/switch"),
    );
    expect(switches).toHaveLength(2);
    expect(switches[0][1]?.body).toBe(switches[1][1]?.body);
    expect(JSON.parse(String(switches[0][1]?.body))).toMatchObject({
      resume_note: "Stable retry draft",
      expected_updated_at: stamp,
      expected_active_session_id: "f1",
    });
  });

  it("does not enqueue operations offline", async () => {
    setup();
    await screen.findByRole("button", { name: "Start Task" });
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    await click("Start Task");
    await screen.findByText(/You are offline. Nothing was queued/);
    expect(writes()).toHaveLength(0);
    vi.restoreAllMocks();
    fireEvent(window, new Event("online"));
    expect(writes()).toHaveLength(0);
  });

  it.each(["empty", "done", "review", "mixed"])(
    "shows honest %s states",
    async (state) => {
      server.data.tasks =
        state === "empty"
          ? []
          : server.data.tasks
              .filter((item) => item.project_id === "p1")
              .map((item, index) => ({
                ...item,
                status:
                  state === "review" || (state === "mixed" && index === 0)
                    ? "review"
                    : "done",
              }));
      setup();
      expect(
        await screen.findByText(
          state === "empty"
            ? /No tasks yet. Create a task in EXPLORE/
            : state === "done"
              ? /All Tasks are done/
              : state === "review"
                ? /All Tasks are awaiting review/
                : /No eligible Task recommendation/,
        ),
      ).toBeVisible();
      expect(
        screen.queryByRole("button", { name: "Start Task" }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("region", { name: "NOW" })).toHaveAttribute(
        "data-focus-state",
        "empty",
      );
      expect(writes()).toHaveLength(0);
    },
  );

  it("fails closed on loading/read errors, then recovers server state", async () => {
    server.failReads = true;
    setup();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading project workspace",
    );
    await screen.findByText("Could not load project workspace");
    server.failReads = false;
    await click("Try again");
    expect(
      await screen.findByRole("button", { name: "Start Task" }),
    ).toBeVisible();
  });

  it("handles Task deletion and Project deletion on refresh without substituting other work", async () => {
    setup("/projects/p1/now?task=t1");
    await screen.findByRole("heading", { name: "Task Alpha" });
    server.data.tasks = server.data.tasks.filter((item) => item.id !== "t1");
    await click("Refresh Focus");
    expect(await screen.findByText(/Selected task unavailable/)).toBeVisible();
    server.data.projects = server.data.projects.filter(
      (item) => item.id !== "p1",
    );
    await click("Refresh Focus");
    expect(
      await screen.findByRole("heading", { name: "Project unavailable" }),
    ).toBeVisible();
    expect(screen.queryByText("Private Beta Task")).not.toBeInTheDocument();
  });
});
