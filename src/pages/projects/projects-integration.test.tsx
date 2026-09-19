import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import KanbanBoard from "./_components/KanbanBoard.tsx";
import SprintList from "./_components/SprintList.tsx";
import MilestoneList from "./_components/MilestoneList.tsx";
import GanttChart from "./_components/GanttChart.tsx";
import ProjectList from "./_components/ProjectList.tsx";
import ResourceControls from "./_components/ResourceControls.tsx";
import { summarizeProjects, useProjectsData } from "./projects-data.ts";
import { project, sprint, task, milestone } from "./__tests__/fixtures.ts";
import type { EditorTarget } from "./project-editor.ts";

// Only replace the chart rendering: prove its props still come from backend velocity.
vi.mock("./_components/VelocityChart.tsx", () => ({
  default: ({ sprints }: { sprints: { velocity: number }[] }) => (
    <p>Backend velocity: {sprints.map((s) => s.velocity).join(",")}</p>
  ),
}));
const fetchMock = vi.fn<typeof fetch>();
let data: {
  projects: (typeof project)[];
  sprints: (typeof sprint)[];
  tasks: (typeof task)[];
  milestones: (typeof milestone)[];
};
let rejectWrites = false;

function Summary() {
  const { data } = useProjectsData();
  return data ? <p>Open tasks: {summarizeProjects(data).openTasks}</p> : null;
}
function setup(children: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 30_000 },
      mutations: { retry: false },
    },
  });
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>{children}</QueryClientProvider>,
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
    expect(fetchMock).toHaveBeenCalledTimes(4); // Shared reads, not one request set per view.
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
  it.each(["project", "sprint", "task", "milestone"] as const)(
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
          kind === "project" || kind === "sprint" ? "Name" : "Title",
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
      ).toHaveLength(8);
      if (kind === "task")
        expect(JSON.parse(String(writes()[0][1]?.body))).toMatchObject({
          sprint_id: null,
          assignee: null,
        });
    },
  );
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
    data = { projects: [], sprints: [], tasks: [], milestones: [] };
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
