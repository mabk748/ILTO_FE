import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Link,
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProjectWorkspace from "./workspace.tsx";
import ProjectsPage from "./page.tsx";
import {
  project,
  sprint,
  task,
  milestone,
  workstream,
} from "./__tests__/fixtures.ts";
import type { ProjectsData } from "./projects-data.ts";

// Mock transport only (and chart layout unsupported by jsdom). No real server writes.
vi.mock("./_components/VelocityChart.tsx", () => ({
  default: ({ sprints }: { sprints: { velocity: number }[] }) => (
    <p>Backend velocity: {sprints.map((s) => s.velocity).join(",")}</p>
  ),
}));
const fetchMock = vi.fn<typeof fetch>();
let data: ProjectsData;
let failReads = false;
let rejectWrites = false;

function NavigationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output aria-label="Current location">
        {location.pathname}
        {location.search}
      </output>
      <button onClick={() => void navigate(-1)}>History back</button>
      <button onClick={() => void navigate(1)}>History forward</button>
      <Link to="/projects/p2/now?task=t1">Other Project route</Link>
    </>
  );
}
function setup(entry = "/projects/p1/now") {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 30_000 },
      mutations: { retry: false },
    },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>
        <NavigationProbe />
        <Routes>
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:projectId/*" element={<ProjectWorkspace />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return client;
}
const location = () => screen.getByLabelText("Current location").textContent;
const writes = () =>
  fetchMock.mock.calls.filter(([, init]) => init?.method !== "GET");
const tab = (name: string) =>
  fireEvent.mouseDown(screen.getByRole("tab", { name }), {
    button: 0,
    ctrlKey: false,
  });
const area = (name: string) =>
  fireEvent.click(
    within(
      screen.getByRole("navigation", { name: "Project workspace" }),
    ).getByRole("link", { name }),
  );

beforeEach(() => {
  localStorage.clear();
  failReads = false;
  rejectWrites = false;
  fetchMock.mockReset();
  data = {
    projects: [{ ...project }, { ...project, id: "p2", name: "Project Beta" }],
    workstreams: [],
    sprints: [
      { ...sprint },
      {
        ...sprint,
        id: "s2",
        project_id: "p2",
        name: "Sprint Beta",
        velocity: 99,
      },
    ],
    tasks: [
      { ...task, acceptance_criteria: "First condition\nSecond condition" },
      {
        ...task,
        id: "t2",
        project_id: "p2",
        sprint_id: "s2",
        title: "Task Beta",
      },
    ],
    milestones: [
      { ...milestone },
      { ...milestone, id: "m2", project_id: "p2", title: "Milestone Beta" },
    ],
  };
  vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8001/api/v1");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockImplementation(async (url, init) => {
    const parsed = new URL(String(url));
    const path = parsed.pathname.replace("/api/v1/projects", "");
    const collection = path.startsWith("/tasks")
      ? data.tasks
      : path.startsWith("/workstreams")
        ? data.workstreams
        : path.startsWith("/sprints")
          ? data.sprints
          : path.startsWith("/milestones")
            ? data.milestones
            : data.projects;
    if (init?.method !== "GET") {
      if (rejectWrites)
        return Response.json({ detail: "Dependents exist" }, { status: 409 });
      const input = init?.body ? JSON.parse(String(init.body)) : {};
      const id = path.split("/").at(-1);
      const index = collection.findIndex((item) => item.id === id);
      if (init?.method === "PATCH") {
        Object.assign(collection[index], input);
        data.sprints[0].velocity = data.tasks
          .filter((item) => item.sprint_id === "s1" && item.status === "done")
          .reduce((sum, item) => sum + item.story_points, 0);
        return Response.json(collection[index]);
      }
      if (init?.method === "DELETE") {
        collection.splice(index, 1);
        return new Response(null, { status: 204 });
      }
      const record = {
        ...input,
        id: "new-record",
        created_at: "2026-10-14T10:00:00Z",
        updated_at: "2026-10-14T10:00:00Z",
      };
      collection.push(record);
      return Response.json(record, { status: 201 });
    }
    if (failReads) return Response.json({ detail: "Offline" }, { status: 503 });
    if (path === "/focus-sessions/current") return Response.json(null);
    if (/^\/[^/]+\/focus$/.test(path)) {
      const id = path.split("/")[1];
      const tasks = data.tasks.filter((item) => item.project_id === id);
      return Response.json({
        project: data.projects.find((item) => item.id === id),
        active_session: null,
        active_session_elsewhere: null,
        paused_sessions: [],
        recommended_task:
          tasks.find((item) =>
            ["todo", "backlog", "in_progress"].includes(item.status),
          ) ?? null,
        recommendation_reason: "Recommended by the backend",
        alternative_tasks: [],
        active_sprints: [],
        milestones: [],
        empty_state: tasks.length ? "none" : "empty_project",
      });
    }
    if (path === "")
      return Response.json({
        data: data.projects,
        total: data.projects.length,
        page: 1,
        per_page: 100,
        total_pages: 1,
      });
    if (path === "/repositories")
      return Response.json([
        {
          id: "r1",
          project_id: parsed.searchParams.get("project_id"),
          label: `Repository ${parsed.searchParams.get("project_id")}`,
          provider: "github",
          repository_url: "https://github.com/owner/repo",
          created_at: project.created_at,
          updated_at: project.updated_at,
        },
      ]);
    if (path === "/workstreams")
      return Response.json(
        data.workstreams.filter(
          (item) => item.project_id === parsed.searchParams.get("project_id"),
        ),
      );
    if (["/tasks", "/sprints", "/milestones"].includes(path))
      return Response.json(collection);
    throw new Error(`Unexpected mocked request: ${url}`);
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Project workspace with mocked backend", () => {
  it("manages Workstreams inside EXPLORE without adding an execution-area tab", async () => {
    data.workstreams = [{ ...workstream }];
    data.tasks[0].workstream_id = workstream.id;
    data.sprints[0].workstream_id = workstream.id;
    setup("/projects/p1/explore");

    expect(
      await screen.findByRole("heading", { name: "Workstreams" }),
    ).toBeVisible();
    expect(
      screen.getByText(/Persistent areas of responsibility/),
    ).toBeVisible();
    expect(screen.getByText("1 Task · 1 Sprint")).toBeVisible();
    expect(
      within(
        screen.getByRole("navigation", { name: "Project workspace" }),
      ).queryByRole("link", { name: "Workstreams" }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Archive workstream: Frontend" }),
    );
    expect(
      screen.getByText(/Existing Task and Sprint assignments stay in place/),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Confirm archive" }));
    await waitFor(() => expect(data.workstreams[0].status).toBe("archived"));
    expect(data.tasks[0].workstream_id).toBe(workstream.id);
  });

  it("opens a Workstream-filtered board while preserving Project context and history", async () => {
    data.workstreams = [{ ...workstream }];
    data.tasks[0].workstream_id = workstream.id;
    data.tasks.push({
      ...task,
      id: "unassigned",
      sprint_id: null,
      workstream_id: null,
      title: "Unassigned Task",
    });
    setup("/projects/p1/explore?view=overview");

    fireEvent.click(
      await screen.findByRole("button", { name: "View tasks in Frontend" }),
    );
    await waitFor(() =>
      expect(location()).toContain(
        "/projects/p1/explore?view=board&workstream=w1",
      ),
    );
    expect(await screen.findByText("Task Alpha")).toBeVisible();
    expect(screen.queryByText("Unassigned Task")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Project Alpha" }),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "History back" }));
    await waitFor(() =>
      expect(location()).toBe("/projects/p1/explore?view=overview"),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "View unassigned Tasks" }),
    );
    await waitFor(() =>
      expect(location()).toContain(
        "/projects/p1/explore?view=board&workstream=__no_workstream__",
      ),
    );
    expect(await screen.findByText("Unassigned Task")).toBeVisible();
    expect(screen.queryByText("Task Alpha")).not.toBeInTheDocument();
  });

  it("renders scoped dashboard metrics for multiple active Sprints and drills down with history", async () => {
    data.sprints.push({ ...sprint, id: "s3", name: "Sprint Three" });
    data.tasks = [
      { ...task, id: "done", status: "done", story_points: 3 },
      {
        ...task,
        id: "doing",
        sprint_id: "s3",
        title: "Doing now",
        status: "in_progress",
        story_points: 2,
      },
      {
        ...task,
        id: "beta",
        project_id: "p2",
        sprint_id: "s2",
        title: "Hidden Beta",
      },
    ];
    data.milestones.push({
      ...milestone,
      id: "future",
      title: "Future milestone",
      due_date: "2099-10-20",
    });
    setup("/projects/p1/explore?view=overview");
    const overview = await screen.findByRole("region", {
      name: "Project overview",
    });
    expect(
      within(overview).getByText("Total Tasks").closest("a"),
    ).toHaveTextContent("2");
    expect(
      within(overview).getByText("Tasks completed").closest("a"),
    ).toHaveTextContent("1 / 2");
    expect(
      within(overview)
        .getByText("Active Sprint story points")
        .closest("section"),
    ).toHaveTextContent("3 / 5 points");
    expect(
      screen.getByRole("progressbar", { name: "Tasks completed: 1 of 2" }),
    ).toHaveAttribute("aria-valuenow", "50");
    expect(
      screen.getByRole("progressbar", {
        name: "Active Sprint story points completed: 3 of 5",
      }),
    ).toHaveAttribute("aria-valuenow", "60");
    expect(screen.getByText("Future milestone")).toBeVisible();
    expect(screen.queryByText("Hidden Beta")).not.toBeInTheDocument();
    expect(
      within(overview).getByText("Total Tasks").closest("a")?.parentElement,
    ).toHaveClass("grid-cols-2");
    fireEvent.click(screen.getByRole("link", { name: /Future milestone/ }));
    expect(location()).toBe(
      "/projects/p1/explore?view=milestones&milestone=future",
    );
    expect(await screen.findByText("Future milestone")).toBeVisible();
    expect(screen.queryByText("Milestone Alpha")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "History back" }));
    const restoredOverview = await screen.findByRole("region", {
      name: "Project overview",
    });
    fireEvent.click(
      within(restoredOverview).getByText("In-progress Tasks").closest("a")!,
    );
    expect(location()).toBe(
      "/projects/p1/explore?view=board&task_status=in_progress",
    );
    expect(await screen.findByText("Doing now")).toBeVisible();
    expect(screen.queryByText("Task Alpha")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "History back" }));
    expect(
      await screen.findByRole("region", { name: "Project overview" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: /Start Doing now|Start/ }),
    ).toHaveAttribute(
      "href",
      expect.stringContaining("/projects/p1/now?task="),
    );
  });

  it("does not invent dashboard percentages for zero Tasks, points or Milestones", async () => {
    data.tasks = data.tasks.filter((item) => item.project_id === "p2");
    data.milestones = data.milestones.filter(
      (item) => item.project_id === "p2",
    );
    setup("/projects/p1/explore?view=overview");
    const overview = await screen.findByRole("region", {
      name: "Project overview",
    });
    expect(
      within(overview).getByText("No Tasks in this Project"),
    ).toBeVisible();
    expect(
      within(overview).getByText(
        "1 active Sprint has no assigned story points.",
      ),
    ).toBeVisible();
    expect(
      within(overview).getByText(
        "No Milestones have been added to this Project.",
      ),
    ).toBeVisible();
    expect(within(overview).queryByText("Total Tasks")).not.toBeInTheDocument();
    expect(within(overview).queryByRole("progressbar")).not.toBeInTheDocument();
  });
  it("opens a Project from the existing list and redirects to NOW without selecting a task", async () => {
    setup("/projects?tab=projects");
    fireEvent.click(
      await screen.findByRole("link", { name: "Open project: Project Alpha" }),
    );
    expect(await screen.findByRole("heading", { name: "NOW" })).toBeVisible();
    expect(location()).toBe("/projects/p1/now");
    expect(await screen.findByLabelText("Selected task")).toHaveValue("");
    expect(writes()).toHaveLength(0);
  });

  it("preserves the selected task through the base route redirect and shows real read-only context", async () => {
    setup("/projects/p1?task=t1");
    expect(
      await screen.findByRole("heading", { name: "Task Alpha" }),
    ).toBeVisible();
    expect(location()).toBe("/projects/p1/now?task=t1");
    expect(screen.getByText(/First condition/)).toHaveTextContent(
      "First condition Second condition",
    );
    expect(screen.getByText("Sprint: Sprint Alpha")).toBeVisible();
    expect(screen.getByText("Status: todo · Priority: medium")).toBeVisible();
    expect(screen.getByRole("button", { name: "Start Task" })).toBeVisible();
    expect(writes()).toHaveLength(0);
  });

  it.each(["missing", "deleted"])(
    "rejects an unavailable Project route: %s",
    async (id) => {
      setup(`/projects/${id}/explore?view=board&project=p1`);
      expect(
        await screen.findByRole("heading", { name: "Project unavailable" }),
      ).toBeVisible();
      expect(screen.queryByText("Task Alpha")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("navigation", { name: "Project workspace" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Back to Projects" }),
      ).toBeVisible();
    },
  );

  it.each(["t2", "missing", ""])(
    "rejects cross-project or unknown task selection without fallback: %s",
    async (id) => {
      setup(`/projects/p1/now?task=${id}`);
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Selected task unavailable",
      );
      expect(
        screen.queryByRole("heading", { name: /Task Alpha|Task Beta/ }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("option", { name: "Task Beta" }),
      ).not.toBeInTheDocument();
      expect(location()).toContain(`task=${id}`);
    },
  );

  it("keeps selected task and view in URL history through NOW/NEXT/EXPLORE", async () => {
    setup();
    fireEvent.change(await screen.findByLabelText("Selected task"), {
      target: { value: "t1" },
    });
    expect(location()).toBe("/projects/p1/now?task=t1");
    area("NEXT");
    expect(screen.getByRole("heading", { name: "NEXT" })).toBeVisible();
    fireEvent.click(
      screen.getByRole("link", {
        name: "Select and open in NOW",
      }),
    );
    expect(screen.getByRole("heading", { name: "Task Alpha" })).toBeVisible();
    fireEvent.click(screen.getByRole("link", { name: "Manage selected task" }));
    expect(screen.getByRole("tab", { name: "board" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    tab("sprints");
    expect(location()).toContain("view=sprints");
    fireEvent.click(screen.getByRole("button", { name: "History back" }));
    expect(location()).toContain("view=board");
    fireEvent.click(screen.getByRole("button", { name: "History forward" }));
    expect(location()).toContain("view=sprints");
    area("NOW");
    expect(screen.getByRole("heading", { name: "Task Alpha" })).toBeVisible();
    expect(
      screen.getByRole("navigation", { name: "Project workspace" }),
    ).toHaveClass("grid-cols-3");
    expect(screen.getByRole("link", { name: "NOW" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("revalidates selection on Project route changes instead of carrying another Project's task", async () => {
    setup("/projects/p1/now?task=t1");
    await screen.findByRole("heading", { name: "Task Alpha" });
    fireEvent.click(screen.getByRole("link", { name: "Other Project route" }));
    expect(
      await screen.findByRole("heading", { name: "Project Beta" }),
    ).toBeVisible();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Selected task unavailable",
    );
    expect(
      screen.queryByRole("option", { name: "Task Alpha" }),
    ).not.toBeInTheDocument();
  });

  it("restores manual task selection with Back/Forward and supports clearing it", async () => {
    data.tasks.push({
      ...task,
      id: "t3",
      title: "Another Alpha task",
      sprint_id: null,
    });
    setup();
    const select = await screen.findByLabelText("Selected task");
    fireEvent.change(select, { target: { value: "t1" } });
    fireEvent.change(select, { target: { value: "t3" } });
    expect(
      screen.getByRole("heading", { name: "Another Alpha task" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "History back" }));
    expect(screen.getByRole("heading", { name: "Task Alpha" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "History forward" }));
    expect(
      screen.getByRole("heading", { name: "Another Alpha task" }),
    ).toBeVisible();
    fireEvent.change(select, { target: { value: "" } });
    expect(location()).toBe("/projects/p1/now");
    expect(screen.getByText("Recommended by the backend")).toBeVisible();
    expect(writes()).toHaveLength(0);
  });

  it("uses keyboard-operable Explore tabs and focuses the project context on area navigation", async () => {
    setup("/projects/p1/explore");
    await screen.findByRole("heading", { name: "EXPLORE" });
    expect(
      screen.getByRole("heading", { name: "Project Alpha" }),
    ).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("tab", { name: "board" }), {
      key: "Enter",
    });
    expect(screen.getByRole("tab", { name: "board" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(location()).toBe("/projects/p1/explore?view=board");
    expect(screen.getByRole("tabpanel")).toBeVisible();
    area("NEXT");
    expect(
      screen.getByRole("heading", { name: "Project Alpha" }),
    ).toHaveFocus();
  });

  it("does not silently redirect an unknown workspace subroute to another area", async () => {
    setup("/projects/p1/unknown");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Workspace page not found",
    );
    expect(location()).toBe("/projects/p1/unknown");
  });

  it("shows honest empty states and optional Sprint/criteria values", async () => {
    data.tasks[0].sprint_id = null;
    data.tasks[0].acceptance_criteria = null;
    setup("/projects/p1/now?task=t1");
    expect(await screen.findByText("Sprint: No sprint")).toBeVisible();
    expect(screen.getByText("No acceptance criteria provided.")).toBeVisible();
  });

  it("shows an empty NOW and NEXT when only other Projects have tasks", async () => {
    data.tasks = data.tasks.filter((item) => item.project_id === "p2");
    setup();
    expect(
      await screen.findByText(
        "No tasks yet. Create a task in EXPLORE to get started.",
      ),
    ).toBeVisible();
    area("NEXT");
    expect(
      screen.getByText("No Tasks yet. Create one in EXPLORE."),
    ).toBeVisible();
    expect(screen.queryByText("Task Beta")).not.toBeInTheDocument();
  });

  it("bounds NEXT groups and keeps priority work ahead of the active Sprint queue", async () => {
    data.tasks = Array.from({ length: 7 }, (_, i) => ({
      ...task,
      id: `q${i}`,
      title: `Queue ${i}`,
      priority: i === 6 ? "critical" : "low",
    }));
    data.tasks.push({
      ...task,
      id: "done",
      title: "Finished task",
      status: "done",
    });
    setup("/projects/p1/next");
    const priority = await screen.findByRole("region", {
      name: "Highest priority",
    });
    expect(priority).toHaveTextContent("Queue 6");
    const queue = screen.getByRole("region", { name: "Active Sprints" });
    expect(within(queue).getAllByRole("listitem")).toHaveLength(5);
    expect(queue).toHaveTextContent("Showing 5 of 6.");
    expect(
      within(queue).getByRole("link", { name: "Open matching Board view" }),
    ).toHaveAttribute("href", "/projects/p1/explore?view=board&sprint=s1");
    expect(screen.queryByText("Finished task")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Filter queue by priority"), {
      target: { value: "critical" },
    });
    expect(location()).toContain("queue_priority=critical");
    expect(screen.getByText("Queue 6")).toBeVisible();
    expect(screen.queryByText("Queue 0")).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Clear queue filters" }),
    );
    expect(location()).not.toContain("queue_priority");
    expect(screen.getByText("Queue 0")).toBeVisible();
  });

  it.each([
    "overview",
    "board",
    "sprints",
    "milestones",
    "gantt",
    "architecture",
  ])(
    "scopes %s despite conflicting query filters and retains the full shared cache",
    async (view) => {
      const client = setup(
        `/projects/p1/explore?view=${view}&project=p2&sprint=s2&milestone=m2`,
      );
      await screen.findByRole("heading", { name: "EXPLORE" });
      expect(screen.getByRole("tab", { name: view })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      expect(
        screen.queryByText(/Task Beta|Sprint Beta|Milestone Beta/),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Filter .* by project/ }),
      ).not.toBeInTheDocument();
      expect(
        client.getQueryData<ProjectsData>(["projects", "data"])?.projects,
      ).toHaveLength(2);
      if (view === "architecture") {
        expect(await screen.findByText("Repository p1")).toBeVisible();
        expect(
          screen.queryByRole("combobox", { name: "Architecture project" }),
        ).not.toBeInTheDocument();
        const requests = fetchMock.mock.calls.filter(([url]) =>
          String(url).includes("/repositories"),
        );
        expect(requests).toHaveLength(1);
        expect(String(requests[0][0])).toContain("project_id=p1");
      }
    },
  );

  it("clears management filters without expanding beyond the route Project", async () => {
    setup("/projects/p1/explore?view=board&priority=critical");
    await screen.findByText("No tasks match the current filters.");
    fireEvent.click(
      screen.getAllByRole("button", { name: "Clear filters" })[0],
    );
    expect(screen.getByText("Task Alpha")).toBeVisible();
    expect(screen.queryByText("Task Beta")).not.toBeInTheDocument();
    expect(location()).toBe("/projects/p1/explore?view=board");
  });

  it("rejects cross-project selection in full Task management too", async () => {
    setup("/projects/p1/explore?view=board&task=t2");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Selected task unavailable",
    );
    expect(
      screen.queryByRole("button", { name: /Edit task/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show all tasks" }));
    expect(
      await screen.findByRole("button", { name: "Edit task: Task Alpha" }),
    ).toBeVisible();
    expect(screen.queryByText("Task Beta")).not.toBeInTheDocument();
  });

  it("keeps unknown workspace paths/views explicit", async () => {
    setup("/projects/p1/explore?view=unknown");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unknown EXPLORE view",
    );
    tab("overview");
    expect(
      screen.getByRole("heading", { name: "Project overview" }),
    ).toBeVisible();
  });

  it("handles loading and unavailable snapshots, then retries without selecting another Project", async () => {
    failReads = true;
    setup();
    expect(screen.getByText("Loading project workspace…")).toBeVisible();
    expect(
      await screen.findByText("Could not load project workspace"),
    ).toBeVisible();
    expect(screen.queryByText("Project unavailable")).not.toBeInTheDocument();
    failReads = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByLabelText("Selected task")).toBeVisible();
  });

  it("prefills creation with the route Project, restricts choices and refreshes NOW", async () => {
    setup("/projects/p1/explore");
    fireEvent.click(await screen.findByRole("button", { name: "Create task" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText("Project")).toHaveValue("p1");
    expect(
      within(dialog).queryByRole("option", { name: "Project Beta" }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).queryByRole("option", { name: "Sprint Beta" }),
    ).not.toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText("Title"), {
      target: { value: "New scoped task" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(JSON.parse(String(writes()[0][1]?.body))).toMatchObject({
      project_id: "p1",
      title: "New scoped task",
      sprint_id: null,
    });
    area("NOW");
    expect(
      await screen.findByRole("option", { name: "New scoped task" }),
    ).toBeInTheDocument();
  });

  it("reuses PATCH editing and refreshes NOW, NEXT and overview", async () => {
    setup("/projects/p1/now?task=t1");
    fireEvent.click(
      await screen.findByRole("link", { name: "Manage selected task" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Edit task: Task Alpha" }),
    );
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Title"), {
      target: { value: "Renamed task" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(JSON.parse(String(writes()[0][1]?.body))).toEqual({
      title: "Renamed task",
    });
    expect(writes()[0][1]?.credentials).toBe("include");
    area("NOW");
    expect(
      await screen.findByRole("heading", { name: "Renamed task" }),
    ).toBeVisible();
    area("NEXT");
    expect(
      screen.getByRole("link", {
        name: "Select and open in NOW",
      }),
    ).toBeVisible();
  });

  it("refreshes backend velocity, progress and overview after a Kanban status change", async () => {
    setup("/projects/p1/explore?view=board");
    fireEvent.change(await screen.findByLabelText("Status for Task Alpha"), {
      target: { value: "done" },
    });
    await waitFor(() =>
      expect(screen.getByLabelText("Status for Task Alpha")).toHaveValue(
        "done",
      ),
    );
    expect(JSON.parse(String(writes()[0][1]?.body))).toEqual({
      status: "done",
    });
    tab("sprints");
    expect(await screen.findByText("Backend velocity: 3.5")).toBeVisible();
    expect(screen.getByText("3.5/3.5 story points")).toBeVisible();
    tab("overview");
    const overview = screen.getByRole("region", { name: "Project overview" });
    expect(
      within(overview).getByText("Open tasks").closest("a"),
    ).toHaveTextContent("Open tasks0");
    area("NEXT");
    expect(
      await screen.findByText(
        "All Tasks are done. Completed work remains on the Board.",
      ),
    ).toBeVisible();
  });

  it("refreshes Gantt from the same snapshot after editing a milestone", async () => {
    setup("/projects/p1/explore?view=milestones");
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Edit milestone: Milestone Alpha",
      }),
    );
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Title"), {
      target: { value: "Updated milestone" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    tab("gantt");
    expect(await screen.findByText("Updated milestone")).toBeVisible();
    expect(screen.queryByText("Milestone Beta")).not.toBeInTheDocument();
  });

  it("handles a deleted selected Task without choosing a replacement", async () => {
    setup("/projects/p1/explore?view=board&task=t1");
    fireEvent.click(
      await screen.findByRole("button", { name: "Delete task: Task Alpha" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Selected task unavailable",
    );
    area("NOW");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Selected task unavailable",
    );
    expect(location()).toContain("task=t1");
  });

  it("does not cascade when the existing Project delete action returns 409", async () => {
    rejectWrites = true;
    setup("/projects/p1/explore");
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Delete project: Project Alpha",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/dependents/i);
    expect(writes()).toHaveLength(1);
    expect(data.projects).toHaveLength(2);
  });

  it("shows unavailable after Project deletion instead of falling back to All Projects", async () => {
    setup("/projects/p1/explore");
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Delete project: Project Alpha",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    expect(
      await screen.findByRole("heading", { name: "Project unavailable" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Project Beta" }),
    ).not.toBeInTheDocument();
  });

  it("returns to the directory and keeps legacy management accessible", async () => {
    setup("/projects/p1/explore?view=architecture");
    await screen.findByRole("heading", { name: "EXPLORE" });
    fireEvent.click(screen.getByRole("link", { name: "Back to Projects" }));
    expect(
      await screen.findByRole("link", { name: "Open project: Project Beta" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Directory" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    fireEvent.click(screen.getByRole("link", { name: "Management" }));
    expect(
      await screen.findByRole("heading", { name: "Project management" }),
    ).toBeVisible();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Projects" }), {
      button: 0,
      ctrlKey: false,
    });
    expect(screen.getByRole("tab", { name: "Projects" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("button", { name: /Import/ })).toBeVisible();
    expect(
      screen.getByRole("button", {
        name: "Delete project and contents: Project Alpha",
      }),
    ).toBeVisible();
  });
});
