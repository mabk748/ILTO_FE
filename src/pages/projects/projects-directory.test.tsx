import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  Project,
  ProjectRepository,
  Sprint,
  Task,
  Milestone,
} from "@/lib/api/types.ts";
import ProjectsPage from "./page.tsx";
import { milestone, project, sprint, task } from "./__tests__/fixtures.ts";

const fetchMock = vi.fn<typeof fetch>();
let projects: Project[];
let sprints: Sprint[];
let tasks: Task[];
let milestones: Milestone[];
let repositories: Record<string, ProjectRepository[]>;
let activeFocus: boolean;
let failProjects: boolean;

function LocationProbe() {
  const location = useLocation();
  return (
    <output aria-label="Current location">
      {location.pathname}
      {location.search}
    </output>
  );
}

function setup(initialEntry = "/projects") {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 30_000 },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <LocationProbe />
        <Routes>
          <Route path="/projects" element={<ProjectsPage />} />
          <Route
            path="/projects/:projectId/*"
            element={<p>Project workspace route</p>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function repository(
  id: string,
  projectId: string,
  label: string,
): ProjectRepository {
  return {
    id,
    project_id: projectId,
    label,
    provider: "github",
    repository_url: `https://github.com/example/${id}`,
    created_at: project.created_at,
    updated_at: project.updated_at,
  };
}

beforeEach(() => {
  localStorage.clear();
  activeFocus = false;
  failProjects = false;
  projects = [
    { ...project, id: "p1", name: "Project Alpha", status: "active" },
    {
      ...project,
      id: "p2",
      name: "Project Beta",
      description: "Archived systems work",
      status: "archived",
      priority: "high",
    },
  ];
  sprints = [
    { ...sprint, project_id: "p1", status: "active" },
    { ...sprint, id: "s2", project_id: "p2", status: "completed" },
  ];
  tasks = [
    { ...task, project_id: "p1", title: "Task Alpha" },
    {
      ...task,
      id: "t2",
      project_id: "p2",
      sprint_id: "s2",
      title: "Task Beta",
      status: "done",
    },
  ];
  milestones = [{ ...milestone, project_id: "p1", title: "Milestone Alpha" }];
  repositories = {
    p1: [repository("r1", "p1", "Frontend")],
    p2: [],
  };
  fetchMock.mockReset();
  vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8001/api/v1");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockImplementation(async (request, init) => {
    const url = new URL(String(request));
    const path = url.pathname.replace("/api/v1/projects", "");
    const method = init?.method ?? "GET";

    if (path === "/focus-sessions/current") {
      return activeFocus
        ? Response.json({
            id: "focus-1",
            task_id: "t1",
            project_id: "p1",
            status: "active",
            started_at: "2026-10-17T10:00:00Z",
            paused_at: null,
            finished_at: null,
            resume_note: null,
            created_at: "2026-10-17T10:00:00Z",
            updated_at: "2026-10-17T10:00:00Z",
          })
        : Response.json(null);
    }
    if (path === "" && method === "POST") {
      const input = JSON.parse(String(init?.body));
      const saved: Project = {
        ...input,
        id: `p${projects.length + 1}`,
        created_at: "2026-10-17T11:00:00Z",
        updated_at: "2026-10-17T11:00:00Z",
      };
      projects.push(saved);
      return Response.json(saved, { status: 201 });
    }
    if (path === "") {
      if (failProjects)
        return Response.json({ detail: "Unavailable" }, { status: 503 });
      return Response.json({
        data: projects,
        total: projects.length,
        page: 1,
        per_page: 100,
        total_pages: projects.length ? 1 : 0,
      });
    }
    if (path === "/sprints") return Response.json(sprints);
    if (path === "/tasks") return Response.json(tasks);
    if (path === "/milestones") return Response.json(milestones);
    if (path === "/repositories") {
      return Response.json(
        repositories[url.searchParams.get("project_id") ?? ""] ?? [],
      );
    }
    throw new Error(`Unexpected mocked request: ${method} ${url}`);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Projects directory with mocked backend", () => {
  it("opens as the default Projects destination and shows real Project context", async () => {
    activeFocus = true;
    setup();

    expect(
      await screen.findByRole("heading", { name: "Projects" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Directory" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("button", { name: "Create project" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Management" })).toHaveAttribute(
      "href",
      "/projects?tab=board",
    );
    expect(
      await screen.findByRole("link", {
        name: "Open project: Project Alpha",
      }),
    ).toHaveAttribute("href", "/projects/p1");
    const directory = screen.getByRole("region", { name: "Project directory" });
    expect(directory).toHaveClass("grid-cols-1");
    const alphaCard = screen
      .getByRole("link", { name: "Open project: Project Alpha" })
      .closest('[data-slot="card"]');
    expect(alphaCard).not.toBeNull();
    expect(
      within(alphaCard as HTMLElement).getByText("Open Tasks").parentElement,
    ).toHaveTextContent("1");
    expect(
      await screen.findByRole("region", { name: "Current Focus" }),
    ).toHaveTextContent("Task Alpha");
    expect(screen.getByRole("link", { name: /Return to NOW/ })).toHaveAttribute(
      "href",
      "/projects/p1/now?task=t1",
    );
  });

  it("searches and filters without fabricating Project state", async () => {
    setup();
    await screen.findByRole("link", { name: "Open project: Project Alpha" });

    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search projects" }),
      {
        target: { value: "systems" },
      },
    );
    expect(
      screen.getByRole("link", { name: "Open project: Project Beta" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("link", { name: "Open project: Project Alpha" }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Current location")).toHaveTextContent(
      "q=systems",
    );

    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search projects" }),
      {
        target: { value: "" },
      },
    );
    fireEvent.change(
      screen.getByRole("combobox", { name: "Filter projects by status" }),
      {
        target: { value: "active" },
      },
    );
    expect(
      screen.getByRole("link", { name: "Open project: Project Alpha" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("link", { name: "Open project: Project Beta" }),
    ).not.toBeInTheDocument();
  });

  it("reuses the confirmed Create Project flow from the directory header", async () => {
    setup();
    const trigger = await screen.findByRole("button", {
      name: "Create project",
    });
    await waitFor(() => expect(trigger).toBeEnabled());
    fireEvent.click(trigger);
    const dialog = within(screen.getByRole("dialog"));
    fireEvent.change(dialog.getByLabelText("Name"), {
      target: { value: "Created Project" },
    });
    fireEvent.change(dialog.getByLabelText("Start date"), {
      target: { value: "2026-10-17" },
    });
    fireEvent.click(dialog.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByRole("link", {
        name: "Open project: Created Project",
      }),
    ).toBeVisible();
    const createCall = fetchMock.mock.calls.find(([request, init]) => {
      const url = new URL(String(request));
      return url.pathname === "/api/v1/projects" && init?.method === "POST";
    });
    expect(createCall).toBeDefined();
    expect(JSON.parse(String(createCall?.[1]?.body))).toEqual({
      name: "Created Project",
      description: "",
      priority: "medium",
      status: "planning",
      start_date: "2026-10-17",
      end_date: null,
    });
  });

  it("preserves legitimate empty and load-error states", async () => {
    projects = [];
    sprints = [];
    tasks = [];
    milestones = [];
    const empty = setup();
    expect(await screen.findByText("No Projects yet")).toBeVisible();
    expect(
      screen.queryByRole("link", { name: /Open project:/ }),
    ).not.toBeInTheDocument();
    empty.unmount();

    failProjects = true;
    setup();
    expect(
      await screen.findByText("Could not load the Project directory"),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Try again" })).toBeVisible();
  });

  it("renders only confirmed topology with canvas controls and a list alternative", async () => {
    setup("/projects?view=system");

    expect(
      await screen.findByRole("heading", { name: "Project topology" }),
    ).toBeVisible();
    expect(
      screen.getByText(/only persisted Project-to-Repository ownership/),
    ).toBeVisible();
    expect(screen.getByTestId("project-system-canvas")).toHaveClass(
      "overflow-hidden",
    );
    expect(
      screen.getByRole("button", { name: "Select Project: Project Alpha" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Select repository: Frontend" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByText("90%")).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: "Select Project: Project Alpha" }),
    );
    const details = screen.getByRole("complementary", {
      name: "Selected system node",
    });
    expect(
      within(details).getByRole("link", { name: "Open Project" }),
    ).toHaveAttribute("href", "/projects/p1");

    fireEvent.click(screen.getByRole("button", { name: "List" }));
    const list = screen.getByLabelText("Accessible Project system list");
    const projectLink = within(list).getAllByRole("link", {
      name: "Open Project",
    })[0];
    projectLink.focus();
    expect(projectLink).toHaveFocus();
    expect(screen.getByText(/does not yet expose Systems/)).toBeVisible();
    expect(
      screen.queryByText(/Project Alpha.*Project Beta/),
    ).not.toBeInTheDocument();

    await waitFor(() => {
      const repositoryReads = fetchMock.mock.calls.filter(([request]) => {
        const url = new URL(String(request));
        return url.pathname === "/api/v1/projects/repositories";
      });
      expect(repositoryReads).toHaveLength(2);
      expect(
        repositoryReads.map(([request]) =>
          new URL(String(request)).searchParams.get("project_id"),
        ),
      ).toEqual(expect.arrayContaining(["p1", "p2"]));
    });
  });
});
