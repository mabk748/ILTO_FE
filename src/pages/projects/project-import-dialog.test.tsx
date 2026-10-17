import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProjectImportDialog from "./_components/ProjectImportDialog.tsx";
import { milestone, project, sprint, task } from "./__tests__/fixtures.ts";

const fetchMock = vi.fn<typeof fetch>();
let rejectImport = false;

function responseForRead(url: string) {
  const path = new URL(url).pathname;
  if (path.endsWith("/projects"))
    return Response.json({
      data: [project],
      total: 1,
      page: 1,
      per_page: 100,
      total_pages: 1,
    });
  if (path.endsWith("/projects/sprints")) return Response.json([sprint]);
  if (path.endsWith("/projects/tasks")) return Response.json([task]);
  if (path.endsWith("/projects/milestones")) return Response.json([milestone]);
  throw new Error(`Unexpected read: ${url}`);
}

function setup() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
      mutations: { retry: false },
    },
  });
  client.setQueryData(["projects", "data"], {
    projects: [project],
    sprints: [sprint],
    tasks: [task],
    milestones: [milestone],
  });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  render(
    <QueryClientProvider client={client}>
      <ProjectImportDialog />
    </QueryClientProvider>,
  );
  return { client, invalidate };
}

async function chooseValidTaskCsv() {
  fireEvent.click(screen.getByRole("button", { name: "Import" }));
  const csv = [
    "project_ref,sprint_ref,title,status,priority,category,story_points,acceptance_criteria,extra",
    "Project Alpha,Sprint Alpha,Imported task,todo,high,backend,3,Done when tested,ignored",
  ].join("\n");
  fireEvent.change(screen.getByLabelText("CSV or JSON file"), {
    target: { files: [new File([csv], "tasks.csv", { type: "text/csv" })] },
  });
  expect(await screen.findByText("Selected: tasks.csv")).toBeVisible();
  expect(screen.getByLabelText("Map extra")).toHaveValue("");
  fireEvent.click(screen.getByRole("button", { name: "Build preview" }));
  expect(await screen.findByText(/1 rows detected/)).toBeVisible();
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("unrelated-setting", "keep");
  rejectImport = false;
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url, init) => {
    if (init?.method === "POST") {
      if (rejectImport)
        return Response.json({ detail: "Duplicate task" }, { status: 409 });
      return Response.json(
        {
          status: "completed",
          created: { projects: 0, sprints: 0, tasks: 1, milestones: 0 },
          skipped: 2,
          failed: 0,
          warnings: [
            {
              resource: "tasks",
              row: 1,
              field: null,
              code: "normalized",
              message: "Imported with normalized whitespace.",
            },
          ],
        },
        { status: 201 },
      );
    }
    return responseForRead(String(url));
  });
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8001/api/v1");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Projects import dialog", () => {
  it("selects CSV, auto-maps and ignores fields, previews, confirms one exact batch, and refreshes consumers", async () => {
    const { invalidate } = setup();
    await chooseValidTaskCsv();

    fireEvent.click(screen.getByRole("button", { name: "Confirm import (1)" }));
    expect(await screen.findByText("Import completed")).toBeVisible();
    expect(
      screen.getByText("Skipped: 2 · Failed: 0 · Warnings: 1"),
    ).toBeVisible();
    expect(
      screen.getByText(/Imported with normalized whitespace/),
    ).toBeVisible();

    const [url, init] = fetchMock.mock.calls.find(
      ([, options]) => options?.method === "POST",
    )!;
    expect(url).toBe("http://localhost:8001/api/v1/projects/import");
    expect(init?.credentials).toBe("include");
    expect(JSON.parse(String(init?.body))).toEqual({
      duplicate_policy: "reject",
      resources: {
        projects: [],
        sprints: [],
        tasks: [
          {
            project_ref: { kind: "id", value: "p1" },
            sprint_ref: { kind: "id", value: "s1" },
            title: "Imported task",
            description: "",
            status: "todo",
            priority: "high",
            category: "backend",
            story_points: 3,
            acceptance_criteria: "Done when tested",
            assignee: null,
          },
        ],
        milestones: [],
      },
    });
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["projects"] });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["dashboard"] });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["intelligence"] });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["horizon"] });
    });
    expect(localStorage).toHaveLength(1);
    expect(localStorage.getItem("unrelated-setting")).toBe("keep");
  });

  it("keeps the preview open and reports a backend conflict without confirming success", async () => {
    rejectImport = true;
    setup();
    await chooseValidTaskCsv();
    fireEvent.click(screen.getByRole("button", { name: "Confirm import (1)" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "duplicate or conflicting",
    );
    expect(screen.queryByText("Import completed")).not.toBeInTheDocument();
    expect(screen.getByText(/1 rows detected/)).toBeVisible();
    expect(localStorage).toHaveLength(1);
  });

  it("shows malformed JSON as a local parse error and sends no request", async () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    fireEvent.change(screen.getByLabelText("CSV or JSON file"), {
      target: {
        files: [
          new File(["{bad"], "projects.json", { type: "application/json" }),
        ],
      },
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "JSON file is malformed",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
