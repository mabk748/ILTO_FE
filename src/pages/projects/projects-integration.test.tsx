import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import KanbanBoard from "./_components/KanbanBoard.tsx";
import SprintList from "./_components/SprintList.tsx";
import MilestoneList from "./_components/MilestoneList.tsx";
import GanttChart from "./_components/GanttChart.tsx";
import ProjectList from "./_components/ProjectList.tsx";
import ResourceControls from "./_components/ResourceControls.tsx";
import { summarizeProjects, useProjectsData } from "./projects-data.ts";
import {
  project,
  sprint,
  task,
  milestone,
  workstream,
} from "./__tests__/fixtures.ts";
import type { EditorTarget } from "./project-editor.ts";
import type { Workstream } from "@/lib/api/types.ts";
import ProjectsPage from "./page.tsx";

// Only replace the chart rendering: prove its props still come from backend velocity.
vi.mock("./_components/VelocityChart.tsx", () => ({
  default: ({ sprints }: { sprints: { velocity: number }[] }) => (
    <p>Backend velocity: {sprints.map((s) => s.velocity).join(",")}</p>
  ),
}));
const fetchMock = vi.fn<typeof fetch>();
let data: {
  projects: (typeof project)[];
  workstreams: Workstream[];
  sprints: (typeof sprint)[];
  tasks: (typeof task)[];
  milestones: (typeof milestone)[];
};
let rejectWrites = false;

function Summary() {
  const { data } = useProjectsData();
  return data ? <p>Open tasks: {summarizeProjects(data).openTasks}</p> : null;
}
function LocationProbe() {
  const location = useLocation();
  return (
    <output aria-label="Current location">
      {location.pathname}
      {location.search}
    </output>
  );
}
function BackButton() {
  const navigate = useNavigate();
  return <button onClick={() => void navigate(-1)}>Back in history</button>;
}
function setup(children: React.ReactNode, initialEntry = "/projects") {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 30_000 },
      mutations: { retry: false },
    },
  });
  return {
    client,
    ...render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </MemoryRouter>,
    ),
  };
}
function writes() {
  return fetchMock.mock.calls.filter(([, init]) => init?.method !== "GET");
}

beforeEach(() => {
  localStorage.clear();
  rejectWrites = false;
  fetchMock.mockReset();
  data = {
    projects: [{ ...project }],
    workstreams: [],
    sprints: [{ ...sprint }],
    tasks: [{ ...task }],
    milestones: [{ ...milestone }],
  };
  vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8001/api/v1");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockImplementation(async (url, init) => {
    const path = new URL(String(url)).pathname.replace("/api/v1/projects", "");
    if (init?.method !== "GET") {
      if (rejectWrites)
        return Response.json({ detail: "Dependents exist" }, { status: 409 });
      const input = init?.body ? JSON.parse(String(init.body)) : {};
      const collection = path.startsWith("/tasks")
        ? data.tasks
        : path.startsWith("/workstreams")
          ? data.workstreams
          : path.startsWith("/sprints")
            ? data.sprints
            : path.startsWith("/milestones")
              ? data.milestones
              : data.projects;
      if (init?.method === "PATCH") {
        Object.assign(collection[0], input);
        data.sprints[0].velocity = data.tasks
          .filter((t) => t.status === "done" && t.sprint_id === "s1")
          .reduce((sum, t) => sum + t.story_points, 0);
        return Response.json(collection[0]);
      }
      if (init?.method === "DELETE") {
        collection.splice(0, 1);
        return new Response(null, { status: 204 });
      }
      const record = {
        ...input,
        id: "new-record",
        created_at: "2026-09-13T10:00:00Z",
        updated_at: "2026-09-13T10:00:00Z",
        ...(path === "/sprints" ? { velocity: 0 } : {}),
      };
      collection.push(record);
      return Response.json(record, { status: 201 });
    }
    if (path === "")
      return Response.json({
        data: data.projects,
        total: data.projects.length,
        page: 1,
        per_page: 100,
        total_pages: data.projects.length ? 1 : 0,
      });
    if (path === "/tasks") return Response.json(data.tasks);
    if (path === "/workstreams") return Response.json(data.workstreams);
    if (path === "/sprints") return Response.json(data.sprints);
    if (path === "/milestones") return Response.json(data.milestones);
    throw new Error(`Unexpected mocked request: ${url}`);
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Projects UI with a mocked backend", () => {
  it("assigns a Task to a Workstream without clearing FocusSession state", async () => {
    data.workstreams = [{ ...workstream }];
    const { client } = setup(
      <ResourceControls target={{ kind: "task", record: data.tasks[0] }} />,
    );
    const focusKey = ["projects", "focus", project.id] as const;
    client.setQueryData(focusKey, { marker: "authoritative focus" });

    const edit = await screen.findByRole("button", {
      name: "Edit task: Task Alpha",
    });
    await waitFor(() => expect(edit).toBeEnabled());
    fireEvent.click(edit);
    fireEvent.change(
      await screen.findByRole("combobox", { name: "Workstream (optional)" }),
      { target: { value: workstream.id } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(data.tasks[0].workstream_id).toBe(workstream.id),
    );
    const request = writes().at(-1)?.[1];
    expect(JSON.parse(String(request?.body))).toEqual({
      workstream_id: workstream.id,
    });
    expect(client.getQueryData(focusKey)).toEqual({
      marker: "authoritative focus",
    });
  });

  it("keeps an archived Workstream visible only for its existing assignment", async () => {
    data.workstreams = [{ ...workstream, status: "archived" }];
    data.tasks[0].workstream_id = workstream.id;
    setup(
      <ResourceControls target={{ kind: "task", record: data.tasks[0] }} />,
    );

    const edit = await screen.findByRole("button", {
      name: "Edit task: Task Alpha",
    });
    await waitFor(() => expect(edit).toBeEnabled());
    fireEvent.click(edit);
    expect(
      await screen.findByRole("option", {
        name: "Frontend (archived — current)",
      }),
    ).toBeVisible();
  });

  it("labels task cards by project and filters by any project or all projects", async () => {
    data.projects.push({ ...project, id: "p2", name: "Project Beta" });
    data.tasks.push({
      ...task,
      id: "t2",
      project_id: "p2",
      title: "Task Beta",
    });
    setup(<KanbanBoard />);

    expect(await screen.findByText("Project: Project Alpha")).toBeVisible();
    expect(screen.getByText("Project: Project Beta")).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: "Filter tasks by project" }),
    );

    const allProjects = screen.getByRole("checkbox", {
      name: "All projects",
    });
    const projectAlpha = screen.getByRole("checkbox", {
      name: "Project Alpha",
    });
    const projectBeta = screen.getByRole("checkbox", {
      name: "Project Beta",
    });
    expect(allProjects).toBeChecked();
    expect(projectAlpha).not.toBeChecked();
    expect(projectBeta).not.toBeChecked();

    fireEvent.click(projectAlpha);
    expect(allProjects).not.toBeChecked();
    expect(screen.getByText("Task Alpha")).toBeVisible();
    expect(screen.queryByText("Task Beta")).not.toBeInTheDocument();

    fireEvent.click(projectBeta);
    expect(screen.getByText("Task Alpha")).toBeVisible();
    expect(screen.getByText("Task Beta")).toBeVisible();

    fireEvent.click(projectAlpha);
    expect(screen.queryByText("Task Alpha")).not.toBeInTheDocument();
    expect(screen.getByText("Task Beta")).toBeVisible();

    fireEvent.click(allProjects);
    expect(allProjects).toBeChecked();
    expect(screen.getByText("Task Alpha")).toBeVisible();
    expect(screen.getByText("Task Beta")).toBeVisible();
  });

  it("labels task cards by sprint and combines sprint and project filters", async () => {
    data.projects.push({ ...project, id: "p2", name: "Project Beta" });
    data.sprints.push({
      ...sprint,
      id: "s2",
      project_id: "p2",
      name: "Sprint Beta",
    });
    data.tasks.push(
      {
        ...task,
        id: "t2",
        project_id: "p2",
        sprint_id: "s2",
        title: "Task Beta",
      },
      {
        ...task,
        id: "t3",
        sprint_id: null,
        title: "Unassigned task",
      },
    );
    setup(
      <>
        <KanbanBoard />
        <LocationProbe />
      </>,
    );

    expect(await screen.findByText("Sprint: Sprint Alpha")).toBeVisible();
    expect(screen.getByText("Sprint: Sprint Beta")).toBeVisible();
    expect(screen.getByText("Sprint: No sprint")).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: "Filter tasks by sprint" }),
    );

    const allAssignments = screen.getByRole("checkbox", {
      name: "All sprints",
    });
    const sprintAlpha = screen.getByRole("checkbox", {
      name: "Sprint Alpha (Project Alpha)",
    });
    const noSprint = screen.getByRole("checkbox", { name: "No sprint" });
    expect(allAssignments).toBeChecked();
    expect(sprintAlpha).not.toBeChecked();
    expect(noSprint).not.toBeChecked();

    fireEvent.click(sprintAlpha);
    expect(allAssignments).not.toBeChecked();
    expect(screen.getByText("Task Alpha")).toBeVisible();
    expect(screen.queryByText("Task Beta")).not.toBeInTheDocument();
    expect(screen.queryByText("Unassigned task")).not.toBeInTheDocument();

    fireEvent.click(noSprint);
    expect(screen.getByText("Task Alpha")).toBeVisible();
    expect(screen.getByText("Unassigned task")).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: "Filter tasks by project" }),
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Project Beta" }));
    expect(screen.queryByText("Task Beta")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox", {
        name: "Sprint Alpha (Project Alpha)",
      }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Current location")).not.toHaveTextContent(
      "sprint=s1",
    );

    fireEvent.click(allAssignments);
    expect(allAssignments).toBeChecked();
    expect(screen.getByText("Task Beta")).toBeVisible();
    expect(screen.queryByText("Task Alpha")).not.toBeInTheDocument();
  });

  it("shows an honest project fallback for an unresolved task project", async () => {
    data.tasks[0] = { ...task, project_id: "missing-project" };
    setup(<KanbanBoard />);

    expect(
      await screen.findByText("Project: Project unavailable"),
    ).toBeVisible();
  });

  it("shows an honest fallback for an unresolved task sprint", async () => {
    data.tasks[0] = { ...task, sprint_id: "missing-sprint" };
    setup(<KanbanBoard />);

    expect(await screen.findByText("Sprint: Sprint unavailable")).toBeVisible();
  });

  it("renders task categories and criteria indicators and composes task filters", async () => {
    data.tasks = [
      {
        ...task,
        id: "backup-task",
        title: "Restore database",
        priority: "critical",
        category: "backup",
        acceptance_criteria: "Restore succeeds on a clean database.",
      },
      {
        ...task,
        id: "security-task",
        title: "Audit ports",
        status: "done",
        priority: "critical",
        category: "security",
        assignee: null,
      },
      {
        ...task,
        id: "backend-task",
        title: "Add endpoint",
        priority: "high",
        category: "backend",
        assignee: "Engineer",
      },
    ];
    setup(<KanbanBoard />);

    expect((await screen.findAllByText("Backup"))[1]).toBeVisible();
    expect(screen.getByLabelText("Acceptance criteria defined")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Filter tasks by status"), {
      target: { value: "not_done" },
    });
    fireEvent.change(screen.getByLabelText("Filter tasks by priority"), {
      target: { value: "critical" },
    });
    fireEvent.change(screen.getByLabelText("Filter tasks by category"), {
      target: { value: "backup" },
    });
    fireEvent.change(screen.getByLabelText("Filter tasks by assignee"), {
      target: { value: "Owner" },
    });

    expect(screen.getByText("Restore database")).toBeVisible();
    expect(screen.queryByText("Audit ports")).not.toBeInTheDocument();
    expect(screen.queryByText("Add endpoint")).not.toBeInTheDocument();
  });

  it("initializes task filters from the URL, clears one or all, and fails safely for invalid values", async () => {
    const initialEntry =
      "/projects?tab=board&project=p1&sprint=s1&task_status=todo&priority=medium&category=other&assignee=Owner";
    const firstRender = setup(
      <>
        <KanbanBoard />
        <LocationProbe />
      </>,
      initialEntry,
    );

    expect(await screen.findByText("Task Alpha")).toBeVisible();
    expect(screen.getByLabelText("Filter tasks by status")).toHaveValue("todo");
    expect(screen.getByLabelText("Filter tasks by priority")).toHaveValue(
      "medium",
    );
    expect(screen.getByLabelText("Current location")).toHaveTextContent(
      "project=p1",
    );

    fireEvent.change(screen.getByLabelText("Filter tasks by priority"), {
      target: { value: "high" },
    });
    expect(
      screen.getByText("No tasks match the current filters."),
    ).toBeVisible();
    expect(screen.getByLabelText("Current location")).toHaveTextContent(
      "priority=high",
    );

    fireEvent.change(screen.getByLabelText("Filter tasks by priority"), {
      target: { value: "" },
    });
    expect(screen.getByText("Task Alpha")).toBeVisible();
    expect(screen.getByLabelText("Current location")).not.toHaveTextContent(
      "priority=",
    );
    expect(screen.getByLabelText("Current location")).toHaveTextContent(
      "task_status=todo",
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByLabelText("Current location")).toHaveTextContent(
      "/projects?tab=board",
    );
    firstRender.unmount();

    setup(
      <>
        <KanbanBoard />
        <LocationProbe />
      </>,
      "/projects?tab=board&project=missing&sprint=missing&priority=impossible",
    );
    expect(await screen.findByText("Task Alpha")).toBeVisible();
    await waitFor(() =>
      expect(screen.getByLabelText("Current location")).toHaveTextContent(
        "/projects?tab=board",
      ),
    );
  });

  it("records filter changes in browser history and restores the prior URL state", async () => {
    setup(
      <>
        <KanbanBoard />
        <BackButton />
        <LocationProbe />
      </>,
      "/projects?tab=board",
    );
    await screen.findByText("Task Alpha");

    fireEvent.change(screen.getByLabelText("Filter tasks by status"), {
      target: { value: "todo" },
    });
    fireEvent.change(screen.getByLabelText("Filter tasks by priority"), {
      target: { value: "medium" },
    });
    expect(screen.getByLabelText("Current location")).toHaveTextContent(
      "priority=medium",
    );

    fireEvent.click(screen.getByRole("button", { name: "Back in history" }));
    await waitFor(() =>
      expect(screen.getByLabelText("Filter tasks by priority")).toHaveValue(""),
    );
    expect(screen.getByLabelText("Filter tasks by status")).toHaveValue("todo");
  });

  it("filters Projects by real status and priority fields", async () => {
    data.projects.push({
      ...project,
      id: "p2",
      name: "Archived Beta",
      status: "archived",
      priority: "high",
    });
    setup(<ProjectList />);
    await screen.findByText("Project Alpha");

    fireEvent.change(screen.getByLabelText("Project status"), {
      target: { value: "archived" },
    });
    expect(screen.getByText("Archived Beta")).toBeVisible();
    expect(screen.queryByText("Project Alpha")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Project priority"), {
      target: { value: "medium" },
    });
    expect(
      screen.getByText("No projects match the current filters."),
    ).toBeVisible();
    fireEvent.click(
      within(
        screen.getByText("No projects match the current filters.")
          .parentElement!,
      ).getByRole("button", { name: "Clear filters" }),
    );
    expect(screen.getByText("Project Alpha")).toBeVisible();
    expect(screen.getByText("Archived Beta")).toBeVisible();
  });

  it("filters Sprints by project and status with AND semantics", async () => {
    data.projects.push({ ...project, id: "p2", name: "Project Beta" });
    data.sprints.push({
      ...sprint,
      id: "s2",
      project_id: "p2",
      name: "Sprint Beta",
      status: "planned",
    });
    setup(<SprintList />);
    await screen.findByText("Sprint Alpha");

    fireEvent.click(
      screen.getByRole("button", { name: "Filter sprints by project" }),
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Project Beta" }));
    expect(screen.getByText("Sprint Beta")).toBeVisible();
    expect(screen.queryByText("Sprint Alpha")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Filter sprints by status"), {
      target: { value: "active" },
    });
    expect(
      screen.getByText("No sprints match the current filters."),
    ).toBeVisible();
    fireEvent.click(
      within(
        screen.getByText("No sprints match the current filters.")
          .parentElement!,
      ).getByRole("button", { name: "Clear filters" }),
    );
    expect(screen.getByText("Sprint Alpha")).toBeVisible();
    expect(screen.getByText("Sprint Beta")).toBeVisible();
  });

  it("filters Milestones only through their real Project relationship", async () => {
    data.projects.push(
      { ...project, id: "p2", name: "Project Beta" },
      { ...project, id: "p3", name: "Project Without Milestones" },
    );
    data.milestones.push({
      ...milestone,
      id: "m2",
      project_id: "p2",
      title: "Milestone Beta",
    });
    setup(<MilestoneList />);
    await screen.findByText("Milestone Alpha");

    fireEvent.click(
      screen.getByRole("button", { name: "Filter milestones by project" }),
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Project Beta" }));
    expect(screen.getByText("Milestone Beta")).toBeVisible();
    expect(screen.queryByText("Milestone Alpha")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "All projects" }));
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Project Without Milestones" }),
    );
    expect(
      screen.getByText("No milestones match the current filters."),
    ).toBeVisible();
    fireEvent.click(
      within(
        screen.getByText("No milestones match the current filters.")
          .parentElement!,
      ).getByRole("button", { name: "Clear filters" }),
    );
    expect(screen.getByText("Milestone Alpha")).toBeVisible();
  });

  it("filters Gantt by real parents and item types without inferring Sprint-to-Milestone membership", async () => {
    data.projects.push({ ...project, id: "p2", name: "Project Beta" });
    data.sprints.push({
      ...sprint,
      id: "s2",
      project_id: "p2",
      name: "Sprint Beta",
    });
    data.milestones.push({
      ...milestone,
      id: "m2",
      project_id: "p2",
      title: "Milestone Beta",
      due_date: sprint.end_date,
    });
    setup(<GanttChart />);
    expect(await screen.findByTitle("Sprint Alpha")).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: "Filter timeline by project" }),
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Project Alpha" }));
    expect(screen.getByTitle("Sprint Alpha")).toBeVisible();
    expect(screen.queryByTitle("Sprint Beta")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Filter timeline by sprint" }),
    );
    expect(
      screen.queryByRole("checkbox", {
        name: "Sprint Beta (Project Beta)",
      }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Sprint Alpha (Project Alpha)",
      }),
    );
    expect(screen.getByTitle("Sprint Alpha")).toBeVisible();
    expect(screen.queryByTitle("Milestone Alpha")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Filter timeline by milestone" }),
    );
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Milestone Alpha (Project Alpha)",
      }),
    );
    expect(screen.getByTitle("Milestone Alpha")).toBeVisible();
    expect(screen.queryByTitle("Sprint Alpha")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Filter timeline by item type" }),
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Milestones" }));
    expect(screen.getByTitle("Milestone Alpha")).toBeVisible();
    expect(screen.queryByTitle("Project Alpha")).not.toBeInTheDocument();
  });

  it("makes Gantt items keyboard-focusable links into the matching Project workspace", async () => {
    setup(
      <>
        <LocationProbe />
        <GanttChart />
      </>,
      "/projects?tab=gantt",
    );
    const sprintLink = await screen.findByRole("link", {
      name: "Open sprint Sprint Alpha",
    });
    sprintLink.focus();
    expect(sprintLink).toHaveFocus();
    expect(sprintLink).toHaveAttribute(
      "href",
      "/projects/p1/explore?view=sprints&sprint_status=active",
    );
    fireEvent.click(sprintLink);
    expect(screen.getByLabelText("Current location")).toHaveTextContent(
      "/projects/p1/explore?view=sprints&sprint_status=active",
    );
  });

  it("keeps Project context across tabs and restores tabs through browser history", async () => {
    setup(
      <>
        <ProjectsPage />
        <BackButton />
        <LocationProbe />
      </>,
      "/projects?tab=board",
    );
    await screen.findByText("Task Alpha");
    fireEvent.click(
      screen.getByRole("button", { name: "Filter tasks by project" }),
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Project Alpha" }));

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Sprints" }), {
      button: 0,
      ctrlKey: false,
    });
    expect(await screen.findByText("Sprint Alpha")).toBeVisible();
    expect(screen.getByLabelText("Current location")).toHaveTextContent(
      "tab=sprints&project=p1",
    );

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Milestones" }), {
      button: 0,
      ctrlKey: false,
    });
    expect(await screen.findByText("Milestone Alpha")).toBeVisible();
    expect(screen.getByLabelText("Current location")).toHaveTextContent(
      "tab=milestones&project=p1",
    );

    fireEvent.click(screen.getByRole("button", { name: "Back in history" }));
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "Sprints" })).toHaveAttribute(
        "aria-selected",
        "true",
      ),
    );
    expect(screen.getByLabelText("Current location")).toHaveTextContent(
      "tab=sprints&project=p1",
    );
  });

  it("refreshes summary, Kanban, sprint progress/velocity, milestones and Gantt after a status PATCH", async () => {
    setup(
      <>
        <Summary />
        <KanbanBoard />
        <SprintList />
        <MilestoneList />
        <GanttChart />
      </>,
    );
    await screen.findByText("Open tasks: 1");
    expect(fetchMock).toHaveBeenCalledTimes(5); // Shared reads, including one Project-scoped Workstream list.
    fireEvent.change(
      screen.getByRole("combobox", { name: "Status for Task Alpha" }),
      { target: { value: "done" } },
    );
    await screen.findByText("Open tasks: 0");
    expect(
      screen.getByRole("combobox", { name: "Status for Task Alpha" }),
    ).toHaveValue("done");
    expect(screen.getByText("3.5/3.5 story points")).toBeInTheDocument();
    expect(screen.getByText("Backend velocity: 3.5")).toBeInTheDocument();
    expect(writes()[0][1]?.method).toBe("PATCH");
    expect(JSON.parse(String(writes()[0][1]?.body))).toEqual({
      status: "done",
    });
    for (const path of [
      "/projects?",
      "/projects/tasks",
      "/projects/sprints",
      "/projects/workstreams?",
      "/projects/milestones",
    ]) {
      expect(
        fetchMock.mock.calls.filter(
          ([url, init]) => String(url).includes(path) && init?.method === "GET",
        ),
      ).toHaveLength(2);
    }
  });
  it("refreshes an already mounted Gantt after editing a project and clearing its end date", async () => {
    setup(
      <>
        <ProjectList />
        <GanttChart />
      </>,
    );
    const trigger = await screen.findByRole("button", {
      name: "Edit project: Project Alpha",
    });
    fireEvent.click(trigger);
    const dialog = within(screen.getByRole("dialog"));
    fireEvent.change(dialog.getByLabelText("Name"), {
      target: { value: "Renamed project" },
    });
    fireEvent.change(dialog.getByLabelText("End date (optional)"), {
      target: { value: "" },
    });
    fireEvent.click(dialog.getByRole("button", { name: "Save" }));
    await screen.findByTitle("Renamed project (no end date)");
    expect(screen.queryByTitle("Project Alpha")).not.toBeInTheDocument();
    expect(JSON.parse(String(writes()[0][1]?.body))).toEqual({
      name: "Renamed project",
      end_date: null,
    });
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: "Edit project: Renamed project" }),
    ).toHaveFocus();
  });
  it.each(["project", "workstream", "sprint", "task", "milestone"] as const)(
    "creates a %s through the accessible form and reloads affected data",
    async (kind) => {
      setup(<ResourceControls target={{ kind }} />);
      const trigger = screen.getByRole("button", { name: `Create ${kind}` });
      await waitFor(() => expect(trigger).toBeEnabled());
      fireEvent.click(trigger);
      const dialog = within(screen.getByRole("dialog"));
      if (kind !== "project")
        fireEvent.change(dialog.getByLabelText("Project"), {
          target: { value: "p1" },
        });
      fireEvent.change(
        dialog.getByLabelText(
          kind === "project" || kind === "sprint" || kind === "workstream"
            ? "Name"
            : "Title",
        ),
        { target: { value: "Created item" } },
      );
      if (kind === "project" || kind === "sprint")
        fireEvent.change(dialog.getByLabelText("Start date"), {
          target: { value: "2026-09-01" },
        });
      if (kind === "sprint")
        fireEvent.change(dialog.getByLabelText("End date"), {
          target: { value: "2026-09-14" },
        });
      if (kind === "milestone")
        fireEvent.change(dialog.getByLabelText("Due date"), {
          target: { value: "2026-09-20" },
        });
      fireEvent.click(dialog.getByRole("button", { name: "Save" }));
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      expect(writes()).toHaveLength(1);
      expect(writes()[0][1]?.method).toBe("POST");
      expect(
        fetchMock.mock.calls.filter(([, init]) => init?.method === "GET"),
      ).toHaveLength(kind === "project" ? 11 : 10);
      if (kind === "task")
        expect(JSON.parse(String(writes()[0][1]?.body))).toMatchObject({
          sprint_id: null,
          assignee: null,
        });
    },
  );
  it("invalidates Horizon projections after a Milestone mutation", async () => {
    const { client } = setup(
      <ResourceControls target={{ kind: "milestone", record: milestone }} />,
    );
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const edit = await screen.findByRole("button", {
      name: "Edit milestone: Milestone Alpha",
    });
    await waitFor(() => expect(edit).toBeEnabled());
    fireEvent.click(edit);
    const dialog = within(screen.getByRole("dialog"));
    fireEvent.change(dialog.getByLabelText("Title"), {
      target: { value: "Milestone refreshes Horizon" },
    });
    fireEvent.click(dialog.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["horizon"] }),
    );
  });
  it.each([
    { kind: "project", record: project },
    { kind: "sprint", record: sprint },
    { kind: "task", record: task },
    { kind: "milestone", record: milestone },
  ] satisfies EditorTarget[])(
    "deletes a $kind only after confirmation",
    async (target) => {
      setup(<ResourceControls target={target} />);
      const trigger = await screen.findByRole("button", {
        name: new RegExp(`Delete ${target.kind}:`),
      });
      fireEvent.click(trigger);
      expect(writes()).toHaveLength(0);
      fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      expect(writes()).toHaveLength(1);
      expect(writes()[0][1]?.method).toBe("DELETE");
    },
  );
  it("shows a 409 conflict in the dialog, keeps the record, and never cascades", async () => {
    rejectWrites = true;
    setup(<ProjectList />);
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Delete project: Project Alpha",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    await screen.findByRole("alert");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Nothing was cascade-deleted",
    );
    expect(data.projects).toHaveLength(1);
    expect(writes()).toHaveLength(1);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
  it("filters task sprint options and clears assignment when changing project", async () => {
    data.projects.push({ ...project, id: "p2", name: "Project Beta" });
    data.sprints.push({
      ...sprint,
      id: "s2",
      project_id: "p2",
      name: "Sprint Beta",
    });
    setup(<ResourceControls target={{ kind: "task", record: task }} />);
    const trigger = screen.getByRole("button", {
      name: "Edit task: Task Alpha",
    });
    await waitFor(() => expect(trigger).toBeEnabled());
    fireEvent.click(trigger);
    const dialog = within(screen.getByRole("dialog"));
    expect(
      dialog.queryByRole("option", { name: "Sprint Beta" }),
    ).not.toBeInTheDocument();
    fireEvent.change(dialog.getByLabelText("Project"), {
      target: { value: "p2" },
    });
    expect(dialog.getByLabelText("Sprint (optional)")).toHaveValue("");
    expect(
      dialog.queryByRole("option", { name: "Sprint Alpha" }),
    ).not.toBeInTheDocument();
    fireEvent.click(dialog.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(JSON.parse(String(writes()[0][1]?.body))).toEqual({
      project_id: "p2",
      sprint_id: null,
    });
  });
  it("preserves genuine empty states with no sample records or writes", async () => {
    data = {
      projects: [],
      workstreams: [],
      sprints: [],
      tasks: [],
      milestones: [],
    };
    setup(
      <>
        <ProjectList />
        <SprintList />
        <MilestoneList />
        <GanttChart />
        <ResourceControls target={{ kind: "task" }} />
      </>,
    );
    await screen.findByText(/No projects yet/);
    expect(screen.getByText("No sprints yet.")).toBeInTheDocument();
    expect(screen.getByText("No milestones yet.")).toBeInTheDocument();
    expect(
      screen.getByText("No project timeline data yet."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create task" })).toBeDisabled();
    expect(writes()).toHaveLength(0);
  });
});
