import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProjectList from "./_components/ProjectList.tsx";
import { project, sprint, task, milestone } from "./__tests__/fixtures.ts";
import type {
  ProjectDeleteImpact,
  ProjectDeleteResult,
} from "@/lib/api/projects.ts";

const fetchMock = vi.fn<typeof fetch>();
let impact: ProjectDeleteImpact;
let result: ProjectDeleteResult;
let previewResponse: () => Promise<Response>;
let postResponse: () => Promise<Response>;
let exists: boolean;

function Location() {
  const location = useLocation();
  return (
    <output aria-label="Location">
      {location.pathname}
      {location.search}
    </output>
  );
}
function setup(entry = "/projects?tab=projects") {
  const client = new QueryClient({
    defaultOptions: {
      queries: { staleTime: Infinity, retry: false },
      mutations: { retry: 3 },
    },
  });
  client.setQueryData(["projects", "data"], {
    projects: [project],
    sprints: [sprint],
    tasks: [task],
    milestones: [milestone],
  });
  const keys = [
    ["projects", "repositories", project.id],
    ["learning", "goals"],
    ["learning", "study-schedules"],
    ["learning", "study-sessions"],
    ["learning", "goals", "g1", "progress"],
    ["dashboard"],
    ["intelligence", "comparisons"],
    ["horizon", "entries", "from", "to"],
    ["finances"],
    ["health"],
  ];
  for (const key of keys) client.setQueryData(key, { cached: true });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const rendered = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>
        <ProjectList />
        <Location />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { client, invalidate, ...rendered };
}
function posts() {
  return fetchMock.mock.calls.filter(([, init]) => init?.method === "POST");
}
function previews() {
  return fetchMock.mock.calls.filter(([url]) =>
    String(url).endsWith("/delete-impact"),
  );
}
function dialog() {
  return within(screen.getByRole("dialog"));
}
async function open() {
  fireEvent.click(
    screen.getByRole("button", {
      name: `Delete project and contents: ${project.name}`,
    }),
  );
  await screen.findByRole("region", { name: "Will be permanently deleted" });
}
function confirm(name = impact.project.name) {
  fireEvent.change(dialog().getByRole("textbox"), { target: { value: name } });
  fireEvent.click(
    dialog().getByRole("button", { name: "Delete project and contents" }),
  );
}

beforeEach(() => {
  exists = true;
  localStorage.clear();
  fetchMock.mockReset();
  impact = {
    project: { id: project.id, name: project.name },
    will_delete: {
      tasks: 2,
      sprints: 1,
      milestones: 1,
      repositories: 1,
      focus_sessions: 2,
    },
    will_unlink: { learning_goals: 1, study_schedules: 0, study_sessions: 3 },
    focus_sessions: {
      total: 2,
      active: 0,
      paused: 0,
      finished: 2,
      has_unfinished_sessions: false,
    },
    blocking_dependencies: [],
    confirmation_token: "a".repeat(64),
  };
  result = {
    status: "deleted",
    project: impact.project,
    deleted: {
      tasks: 8,
      sprints: 2,
      milestones: 3,
      repositories: 4,
      focus_sessions: 2,
    },
    unlinked: { learning_goals: 5, study_schedules: 6, study_sessions: 7 },
  };
  previewResponse = async () => Response.json(impact);
  postResponse = async () => {
    exists = false;
    return Response.json(result);
  };
  fetchMock.mockImplementation(async (url, init) => {
    const path = new URL(String(url)).pathname;
    if (path.endsWith("/delete-impact")) return previewResponse();
    if (path.endsWith("/delete-with-contents")) return postResponse();
    if (path === "/api/v1/projects")
      return Response.json({
        data: exists ? [project] : [],
        page: 1,
        per_page: 100,
        total: exists ? 1 : 0,
        total_pages: exists ? 1 : 0,
      });
    if (path.endsWith("/sprints")) return Response.json(exists ? [sprint] : []);
    if (path.endsWith("/tasks")) return Response.json(exists ? [task] : []);
    if (path.endsWith("/milestones"))
      return Response.json(exists ? [milestone] : []);
    throw new Error(`Unexpected request: ${init?.method} ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8001/api/v1");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Delete project and contents (mocked backend/jsdom)", () => {
  it("opens with a loading state, no guessed counts, and safe initial focus", async () => {
    let resolve!: (response: Response) => void;
    previewResponse = () =>
      new Promise((done) => {
        resolve = done;
      });
    setup();
    expect(previews()).toHaveLength(0);
    fireEvent.click(
      screen.getByRole("button", {
        name: `Delete project and contents: ${project.name}`,
      }),
    );
    expect(dialog().getByRole("status")).toHaveTextContent(
      "Loading deletion impact",
    );
    expect(
      dialog().getByRole("button", { name: "Delete project and contents" }),
    ).toBeDisabled();
    expect(dialog().queryByText(/Tasks:/)).not.toBeInTheDocument();
    expect(dialog().getByRole("button", { name: "Cancel" })).toHaveFocus();
    await waitFor(() => expect(previews()).toHaveLength(1));
    await act(async () => {
      resolve(Response.json(impact));
    });
    expect(await dialog().findByText("Tasks: 2")).toBeVisible();
    expect(dialog().getByText("Repositories: 1")).toBeVisible();
    expect(dialog().getByText("Total: 2")).toBeVisible();
    expect(dialog().getByText("Active: 0")).toBeVisible();
    expect(dialog().getByText("Paused: 0")).toBeVisible();
    expect(dialog().getByText("Finished: 2")).toBeVisible();
    expect(
      dialog().getByText(
        "Finished FocusSession history will be permanently deleted with this Project.",
      ),
    ).toBeVisible();
    expect(dialog().getByText("Learning goals: 1")).toBeVisible();
    expect(dialog().getByText("Study sessions: 3")).toBeVisible();
    expect(dialog().queryByText(/Study schedules:/)).not.toBeInTheDocument();
  });
  it("does not treat zero related counts as a reason to fabricate rows or block deletion", async () => {
    impact.will_delete = {
      tasks: 0,
      sprints: 0,
      milestones: 0,
      repositories: 0,
      focus_sessions: 0,
    };
    impact.focus_sessions = {
      total: 0,
      active: 0,
      paused: 0,
      finished: 0,
      has_unfinished_sessions: false,
    };
    impact.will_unlink = {
      learning_goals: 0,
      study_schedules: 0,
      study_sessions: 0,
    };
    setup();
    await open();
    expect(dialog().getAllByText("No related records.")).toHaveLength(2);
    expect(dialog().queryByRole("listitem")).not.toBeInTheDocument();
    fireEvent.change(dialog().getByRole("textbox"), {
      target: { value: project.name },
    });
    expect(
      dialog().getByRole("button", { name: "Delete project and contents" }),
    ).toBeEnabled();
  });
  it("blocks explicit deletion when active or paused FocusSessions exist", async () => {
    impact.will_delete.focus_sessions = 2;
    impact.focus_sessions = {
      total: 2,
      active: 1,
      paused: 1,
      finished: 0,
      has_unfinished_sessions: true,
    };
    impact.blocking_dependencies = [
      {
        resource: "unfinished_focus_sessions",
        count: 2,
        reason:
          "Finish all active or paused focus sessions before deleting this Project.",
      },
    ];
    setup();
    await open();
    expect(dialog().getByText("Active: 1")).toBeVisible();
    expect(dialog().getByText("Paused: 1")).toBeVisible();
    expect(dialog().getByText("Finished: 0")).toBeVisible();
    expect(dialog().getByRole("alert")).toHaveTextContent(
      "Finish all active or paused focus sessions before deleting this Project.",
    );
    fireEvent.change(dialog().getByRole("textbox"), {
      target: { value: project.name },
    });
    expect(
      dialog().getByRole("button", { name: "Delete project and contents" }),
    ).toBeDisabled();
    expect(posts()).toHaveLength(0);
  });
  it("keeps preview failures open and disabled with manual retry", async () => {
    previewResponse = async () =>
      Response.json(
        { detail: "Database operation unavailable" },
        { status: 503 },
      );
    setup();
    fireEvent.click(
      screen.getByRole("button", {
        name: `Delete project and contents: ${project.name}`,
      }),
    );
    await screen.findByRole("alert");
    expect(dialog().getByRole("alert")).toHaveTextContent(
      "Database operation unavailable",
    );
    expect(
      dialog().getByRole("button", { name: "Delete project and contents" }),
    ).toBeDisabled();
    expect(previews()).toHaveLength(1);
    previewResponse = async () => Response.json(impact);
    fireEvent.click(dialog().getByRole("button", { name: "Refresh preview" }));
    await screen.findByRole("textbox");
    expect(posts()).toHaveLength(0);
  });
  it("shows only opaque dependency reasons and disables deletion without extra inspection", async () => {
    impact.blocking_dependencies = [
      {
        resource: "unavailable_dependency",
        count: null,
        reason: "A related record cannot be safely handled.",
      },
    ];
    setup();
    await open();
    expect(dialog().getByRole("alert")).toHaveTextContent(
      "This Project cannot currently be deleted safely.",
    );
    expect(dialog().getByRole("alert")).toHaveTextContent(
      impact.blocking_dependencies[0].reason,
    );
    expect(
      dialog().queryByText(/unavailable_dependency/),
    ).not.toBeInTheDocument();
    fireEvent.change(dialog().getByRole("textbox"), {
      target: { value: project.name },
    });
    expect(
      dialog().getByRole("button", { name: "Delete project and contents" }),
    ).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it.each([
    "",
    "project alpha",
    " Project Alpha",
    "Project Alpha ",
    "Project  Alpha",
  ])("requires exact equality, rejecting %j", async (value) => {
    setup();
    await open();
    fireEvent.change(
      dialog().getByLabelText(`Type ${project.name} to confirm`),
      { target: { value } },
    );
    expect(
      dialog().getByRole("button", { name: "Delete project and contents" }),
    ).toBeDisabled();
    expect(posts()).toHaveLength(0);
  });
  it("uses the preview's current name, including its spaces, rather than the list's stale name", async () => {
    impact.project.name = " Renamed Project ";
    setup();
    await open();
    fireEvent.change(dialog().getByRole("textbox"), {
      target: { value: "Renamed Project" },
    });
    expect(
      dialog().getByRole("button", { name: "Delete project and contents" }),
    ).toBeDisabled();
    confirm(" Renamed Project ");
    await screen.findByRole("heading", { name: "Project deleted" });
    expect(JSON.parse(String(posts()[0][1]?.body))).toEqual({
      confirm_name: " Renamed Project ",
      confirmation_token: impact.confirmation_token,
    });
  });
  it("submits the token from the preview the user reviewed, not a later cache value", async () => {
    const { client } = setup();
    await open();
    const previewQuery = client.getQueryCache().findAll({
      queryKey: ["project-delete-impact", project.id],
    })[0];
    expect(previewQuery).toBeDefined();
    client.setQueryData(previewQuery!.queryKey, {
      ...impact,
      confirmation_token: "b".repeat(64),
      will_delete: { ...impact.will_delete, tasks: 99 },
    });
    expect(dialog().queryByText("Tasks: 99")).not.toBeInTheDocument();
    confirm();
    await screen.findByRole("heading", { name: "Project deleted" });
    expect(JSON.parse(String(posts()[0][1]?.body))).toMatchObject({
      confirmation_token: "a".repeat(64),
    });
  });
  it("prevents duplicate submits and dismissal while pending, then shows authoritative POST counts", async () => {
    let resolve!: (response: Response) => void;
    postResponse = () =>
      new Promise((done) => {
        resolve = done;
      });
    const { client, invalidate } = setup("/projects?tab=projects&project=p1");
    await open();
    confirm();
    fireEvent.submit(dialog().getByRole("textbox").closest("form")!);
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(
      dialog().getByRole("button", { name: "Delete project and contents" }),
    ).toBeDisabled();
    expect(dialog().getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(
      dialog().queryByRole("button", { name: "Close" }),
    ).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(client.getQueryData(["projects", "data"])).toMatchObject({
      projects: [project],
    });
    expect(invalidate).not.toHaveBeenCalled();
    exists = false;
    await act(async () => {
      resolve(Response.json(result));
    });
    await screen.findByRole("heading", { name: "Project deleted" });
    expect(dialog().getByText("Tasks: 8")).toBeVisible();
    expect(dialog().getByText("Repositories: 4")).toBeVisible();
    expect(dialog().getByText("Study schedules: 6")).toBeVisible();
    expect(dialog().queryByText("Tasks: 2")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Project deleted" }),
    ).toHaveFocus();
    expect(previews()).toHaveLength(1); // Do not refetch the deleted project's preview.
    for (const domain of [
      "projects",
      "learning",
      "dashboard",
      "intelligence",
      "horizon",
    ]) {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: [domain] });
    }
    expect(invalidate).toHaveBeenCalledTimes(5);
    for (const key of [
      ["learning", "goals"],
      ["learning", "study-schedules"],
      ["learning", "study-sessions"],
      ["projects", "repositories", project.id],
      ["horizon", "entries", "from", "to"],
    ]) {
      expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    }
    expect(client.getQueryState(["finances"])?.isInvalidated).toBe(false);
    expect(client.getQueryState(["health"])?.isInvalidated).toBe(false);
    await waitFor(() =>
      expect(dialog().getByRole("button", { name: "Done" })).toBeEnabled(),
    );
    // There is no Project detail route. The existing list stays alive, cleans up
    // the deleted selection, and keeps the result mounted after the row is gone.
    expect(screen.getByLabelText("Location")).toHaveTextContent(
      "/projects?tab=projects",
    );
    expect(screen.getByLabelText("Location")).not.toHaveTextContent(
      "project=p1",
    );
    fireEvent.click(dialog().getByRole("button", { name: "Done" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("region", { name: "Projects list" })).toHaveFocus();
    expect(posts()).toHaveLength(1);
  });
  it.each([
    [403, { detail: "Request origin is not allowed" }, "origin"],
    [
      422,
      { detail: "confirm_name must exactly match the project name" },
      "confirm_name must exactly match",
    ],
    [
      422,
      {
        detail: [
          {
            loc: ["body", "confirm_name"],
            msg: "Invalid value",
            input: "DO NOT DISPLAY",
          },
        ],
      },
      "backend rejected the confirmation request",
    ],
    [
      503,
      { detail: "Database operation unavailable" },
      "Database operation unavailable",
    ],
  ] as const)(
    "keeps input and dialog after HTTP %s without automatic retries",
    async (status, body, message) => {
      postResponse = async () => Response.json(body, { status });
      setup();
      await open();
      confirm();
      await screen.findByRole("alert");
      expect(dialog().getByRole("alert")).toHaveTextContent(message);
      expect(dialog().getByRole("textbox")).toHaveValue(project.name);
      expect(dialog().queryByText("DO NOT DISPLAY")).not.toBeInTheDocument();
      expect(posts()).toHaveLength(1);
      expect(
        dialog().getByRole("button", { name: "Delete project and contents" }),
      ).toBeEnabled();
      if (status === 503) {
        postResponse = async () => Response.json(result);
        fireEvent.click(
          dialog().getByRole("button", { name: "Delete project and contents" }),
        );
        await screen.findByRole("heading", { name: "Project deleted" });
        expect(posts()).toHaveLength(2);
      }
    },
  );
  it.each([
    "A related record cannot be safely handled.",
    "Operation conflicts with related records or database constraints",
  ])(
    "refetches impact after stale-preview 409 and shows the exact reason: %s",
    async (reason) => {
      postResponse = async () => {
        impact.blocking_dependencies = [
          { resource: "unavailable_dependency", count: null, reason },
        ];
        return Response.json({ detail: reason }, { status: 409 });
      };
      setup();
      await open();
      confirm();
      await waitFor(() => expect(previews()).toHaveLength(2));
      await waitFor(() =>
        expect(dialog().getByRole("button", { name: "Cancel" })).toBeEnabled(),
      );
      expect(dialog().getAllByText(reason).length).toBeGreaterThan(0);
      expect(dialog().getByRole("textbox")).toHaveValue("");
      expect(
        dialog().getByRole("button", { name: "Delete project and contents" }),
      ).toBeDisabled();
      expect(posts()).toHaveLength(1);
    },
  );
  it("refreshes a stale preview without retrying deletion and requires explicit reconfirmation", async () => {
    postResponse = async () =>
      Response.json(
        {
          detail:
            "Project deletion preview is stale. Refresh it before deleting.",
        },
        { status: 409 },
      );
    setup();
    await open();
    confirm();
    await waitFor(() => expect(previews()).toHaveLength(2));
    expect(posts()).toHaveLength(1);
    expect(dialog().getByRole("alert")).toHaveTextContent(
      "This deletion preview is stale",
    );
    expect(dialog().getByRole("textbox")).toHaveValue("");
    expect(
      dialog().getByRole("button", { name: "Delete project and contents" }),
    ).toBeDisabled();
    fireEvent.change(dialog().getByRole("textbox"), {
      target: { value: project.name },
    });
    expect(
      dialog().getByRole("button", { name: "Delete project and contents" }),
    ).toBeEnabled();
    expect(posts()).toHaveLength(1);
  });
  it.each(["preview", "post"] as const)(
    "refreshes Projects and disables deletion on %s 404 without losing the dialog",
    async (phase) => {
      const missing = async () => {
        exists = false;
        return Response.json({ detail: "Record not found" }, { status: 404 });
      };
      if (phase === "preview") previewResponse = missing;
      else postResponse = missing;
      const { invalidate } = setup();
      if (phase === "post") {
        await open();
        confirm();
      } else
        fireEvent.click(
          screen.getByRole("button", {
            name: `Delete project and contents: ${project.name}`,
          }),
        );
      await screen.findByRole("alert");
      expect(dialog().getByRole("alert")).toHaveTextContent(
        "Project is no longer available",
      );
      await waitFor(() =>
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ["projects"] }),
      );
      expect(
        dialog().getByRole("button", { name: "Delete project and contents" }),
      ).toBeDisabled();
      expect(
        screen.queryByRole("heading", { name: "Project deleted" }),
      ).not.toBeInTheDocument();
    },
  );
  it("normal Delete still uses only restrictive DELETE and never opens or calls the destructive flow", async () => {
    const read = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((url, init) =>
      init?.method === "DELETE"
        ? Promise.resolve(
            Response.json({ detail: "Project has contents" }, { status: 409 }),
          )
        : read(url, init),
    );
    setup();
    fireEvent.click(
      screen.getByRole("button", { name: `Delete project: ${project.name}` }),
    );
    fireEvent.click(dialog().getByRole("button", { name: "Confirm delete" }));
    await screen.findByRole("alert");
    expect(previews()).toHaveLength(0);
    expect(posts()).toHaveLength(0);
    expect(fetchMock.mock.calls).toHaveLength(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      `http://localhost:8001/api/v1/projects/${project.id}`,
    );
    expect(dialog().getByRole("alert")).toHaveTextContent(
      "Nothing was cascade-deleted",
    );
  });
  it("fetches fresh impact on reopen with empty confirmation", async () => {
    const { client } = setup();
    await open();
    fireEvent.change(dialog().getByRole("textbox"), {
      target: { value: project.name },
    });
    fireEvent.click(dialog().getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", {
        name: `Delete project and contents: ${project.name}`,
      }),
    ).toHaveFocus();
    await open();
    expect(previews()).toHaveLength(2);
    expect(dialog().getByRole("textbox")).toHaveValue("");
    expect(client.getQueryState(["projects", "data"])?.isInvalidated).toBe(
      false,
    );
  });
  it("cancels an in-flight preview when dismissed without sending a destructive request", async () => {
    previewResponse = () => new Promise(() => {});
    setup();
    fireEvent.click(
      screen.getByRole("button", {
        name: `Delete project and contents: ${project.name}`,
      }),
    );
    await waitFor(() => expect(previews()).toHaveLength(1));
    const signal = previews()[0][1]?.signal;
    fireEvent.click(dialog().getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(signal?.aborted).toBe(true));
    expect(posts()).toHaveLength(0);
  });
  it("keeps a malformed preview disabled without showing invented counts", async () => {
    previewResponse = async () => Response.json({ project: impact.project });
    setup();
    fireEvent.click(
      screen.getByRole("button", {
        name: `Delete project and contents: ${project.name}`,
      }),
    );
    await screen.findByRole("alert");
    expect(dialog().getByRole("alert")).toHaveTextContent(
      "invalid deletion preview",
    );
    expect(dialog().queryByRole("listitem")).not.toBeInTheDocument();
    expect(
      dialog().getByRole("button", { name: "Delete project and contents" }),
    ).toBeDisabled();
  });
  it("requires a fresh name confirmation after a failed 409 refresh", async () => {
    postResponse = async () => {
      previewResponse = async () =>
        Response.json(
          { detail: "Database operation unavailable" },
          { status: 503 },
        );
      return Response.json(
        {
          detail:
            "Operation conflicts with related records or database constraints",
        },
        { status: 409 },
      );
    };
    setup();
    await open();
    confirm();
    await waitFor(() => expect(dialog().getAllByRole("alert")).toHaveLength(2));
    expect(
      dialog().getByRole("button", { name: "Delete project and contents" }),
    ).toBeDisabled();
    impact.will_delete.tasks = 42;
    previewResponse = async () => Response.json(impact);
    fireEvent.click(dialog().getByRole("button", { name: "Refresh preview" }));
    expect(await dialog().findByText("Tasks: 42")).toBeVisible();
    expect(dialog().getByRole("textbox")).toHaveValue("");
    fireEvent.change(dialog().getByRole("textbox"), {
      target: { value: project.name },
    });
    expect(
      dialog().getByRole("button", { name: "Delete project and contents" }),
    ).toBeEnabled();
    expect(posts()).toHaveLength(1);
  });
  it("does not mistake a failed collection refresh for failed deletion or lose the final result", async () => {
    const read = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((url, init) =>
      !exists && String(url).includes("/projects?page=")
        ? Promise.resolve(
            Response.json(
              { detail: "Database operation unavailable" },
              { status: 503 },
            ),
          )
        : read(url, init),
    );
    setup();
    await open();
    confirm();
    await screen.findByRole("heading", { name: "Project deleted" });
    await waitFor(() =>
      expect(dialog().getByRole("button", { name: "Done" })).toBeEnabled(),
    );
    expect(dialog().getByText("Tasks: 8")).toBeVisible();
    expect(posts()).toHaveLength(1);
  });
});
