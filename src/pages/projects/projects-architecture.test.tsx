import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Project, ProjectRepository } from "@/lib/api/types.ts";
import ArchitectureView from "./_components/ArchitectureView.tsx";
import ProjectsPage from "./page.tsx";
import { project } from "./__tests__/fixtures.ts";

const fetchMock = vi.fn<typeof fetch>();
const projects: Project[] = [
  { ...project },
  { ...project, id: "p2", name: "Project Beta" },
];
let repositoriesByProject: Record<string, ProjectRepository[]>;
let rejectedWriteStatus: number | null;
let repositoryGetCount: number;

function repository(
  id: string,
  projectId: string,
  label: string,
  repositoryUrl: string,
): ProjectRepository {
  return {
    id,
    project_id: projectId,
    label,
    provider: "github",
    repository_url: repositoryUrl,
    created_at: "2026-10-04T10:00:00Z",
    updated_at: "2026-10-04T10:00:00Z",
  };
}

function canonicalGithubUrl(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\.git\/?$/, "")
    .replace(/\/$/, "");
}

function setup(
  children: React.ReactNode,
  initialEntry = "/projects?tab=architecture&project=p1",
) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
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

function projectRepositoryCalls(method?: string) {
  return fetchMock.mock.calls.filter(([url, init]) => {
    const path = new URL(String(url)).pathname;
    const requestMethod = init?.method ?? "GET";
    return (
      path.startsWith("/api/v1/projects/repositories") &&
      (!method || requestMethod === method)
    );
  });
}

beforeEach(() => {
  localStorage.clear();
  rejectedWriteStatus = null;
  repositoryGetCount = 0;
  repositoriesByProject = { p1: [], p2: [] };
  fetchMock.mockReset();
  vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8001/api/v1");
  vi.stubGlobal("fetch", fetchMock);

  fetchMock.mockImplementation(async (request, init) => {
    const url = new URL(String(request));
    const path = url.pathname;
    const method = init?.method ?? "GET";

    if (path === "/api/v1/projects") {
      return Response.json({
        data: projects,
        total: projects.length,
        page: 1,
        per_page: 100,
        total_pages: 1,
      });
    }
    if (path === "/api/v1/projects/sprints") return Response.json([]);
    if (path === "/api/v1/projects/tasks") return Response.json([]);
    if (path === "/api/v1/projects/milestones") return Response.json([]);

    if (path === "/api/v1/projects/repositories" && method === "GET") {
      repositoryGetCount += 1;
      return Response.json(
        repositoriesByProject[url.searchParams.get("project_id") ?? ""] ?? [],
      );
    }

    if (path.startsWith("/api/v1/projects/repositories")) {
      if (rejectedWriteStatus) {
        return Response.json(
          { detail: "Rejected repository values" },
          { status: rejectedWriteStatus },
        );
      }
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      if (method === "POST") {
        const saved = repository(
          `r${Object.values(repositoriesByProject).flat().length + 1}`,
          body.project_id,
          body.label,
          canonicalGithubUrl(body.repository_url),
        );
        repositoriesByProject[body.project_id].push(saved);
        return Response.json(saved, { status: 201 });
      }

      const id = decodeURIComponent(path.split("/").at(-1) ?? "");
      const collection = Object.values(repositoriesByProject).find((items) =>
        items.some((item) => item.id === id),
      );
      const index = collection?.findIndex((item) => item.id === id) ?? -1;
      if (!collection || index < 0)
        return Response.json({ detail: "Not found" }, { status: 404 });

      if (method === "PATCH") {
        collection[index] = {
          ...collection[index],
          ...body,
          ...(body.repository_url
            ? { repository_url: canonicalGithubUrl(body.repository_url) }
            : {}),
          updated_at: "2026-10-04T11:00:00Z",
        };
        return Response.json(collection[index]);
      }
      if (method === "DELETE") {
        collection.splice(index, 1);
        return new Response(null, { status: 204 });
      }
    }

    throw new Error(`Unexpected mocked request: ${method} ${url}`);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Projects Architecture with a mocked backend", () => {
  it("is available through the URL-controlled Projects tab and shows the zero-repository state", async () => {
    setup(<ProjectsPage />);

    expect(
      await screen.findByRole("heading", { name: "Architecture" }),
    ).toBeVisible();
    expect(screen.getByRole("tab", { name: "Architecture" })).toHaveAttribute(
      "data-state",
      "active",
    );
    expect(
      await screen.findByText("No repositories linked yet."),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Add a repository to open its source code or architecture diagram.",
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Add repository" }),
    ).toBeEnabled();
  });

  it("lists multiple repositories with canonical safe GitHub and GitDiagram links", async () => {
    repositoriesByProject.p1 = [
      repository("r1", "p1", "Frontend", "https://github.com/example/ilto-fe"),
      repository("r2", "p1", "Backend", "https://github.com/example/ilto-be"),
    ];
    setup(<ArchitectureView />);

    expect(await screen.findByText("example/ilto-fe")).toBeVisible();
    expect(screen.getByText("example/ilto-be")).toBeVisible();
    expect(screen.getByText("2 linked repositories")).toBeVisible();

    const github = screen.getByRole("link", {
      name: "Open Frontend on GitHub",
    });
    expect(github).toHaveAttribute(
      "href",
      "https://github.com/example/ilto-fe",
    );
    expect(github).toHaveAttribute("target", "_blank");
    expect(github).toHaveAttribute("rel", "noopener noreferrer");

    const diagram = screen.getByRole("link", {
      name: "Open Frontend in GitDiagram",
    });
    expect(diagram).toHaveAttribute(
      "href",
      "https://gitdiagram.com/example/ilto-fe",
    );
    expect(diagram).toHaveAttribute("target", "_blank");
    expect(diagram).toHaveAttribute("rel", "noopener noreferrer");
    expect(
      screen.getByText(/Private repositories may require authentication/),
    ).toBeVisible();
  });

  it("adds a repository with the exact body and uses the backend canonical response", async () => {
    setup(<ArchitectureView />);
    await screen.findByText("No repositories linked yet.");
    const getCountBeforeWrite = repositoryGetCount;

    fireEvent.click(screen.getByRole("button", { name: "Add repository" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Label"), {
      target: { value: "Frontend" },
    });
    fireEvent.change(within(dialog).getByLabelText("GitHub repository URL"), {
      target: { value: "https://github.com/Example/ILTO-FE.git/" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(projectRepositoryCalls("POST")).toHaveLength(1);
    });
    expect(
      JSON.parse(String(projectRepositoryCalls("POST")[0][1]?.body)),
    ).toEqual({
      project_id: "p1",
      label: "Frontend",
      provider: "github",
      repository_url: "https://github.com/Example/ILTO-FE.git/",
    });
    expect(await screen.findByText("example/ilto-fe")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Open Frontend in GitDiagram" }),
    ).toHaveAttribute("href", "https://gitdiagram.com/example/ilto-fe");
    expect(repositoryGetCount).toBeGreaterThan(getCountBeforeWrite);
  });

  it("PATCHes only changed writable fields and refetches after confirmation", async () => {
    repositoriesByProject.p1 = [
      repository("r1", "p1", "Frontend", "https://github.com/example/ilto-fe"),
    ];
    setup(<ArchitectureView />);
    await screen.findByText("example/ilto-fe");
    const getCountBeforeWrite = repositoryGetCount;

    fireEvent.click(
      screen.getByRole("button", { name: "Edit repository: Frontend" }),
    );
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Label"), {
      target: { value: "Web application" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(projectRepositoryCalls("PATCH")).toHaveLength(1);
    });
    expect(
      JSON.parse(String(projectRepositoryCalls("PATCH")[0][1]?.body)),
    ).toEqual({ label: "Web application" });
    expect(await screen.findByText("Web application")).toBeVisible();
    expect(repositoryGetCount).toBeGreaterThan(getCountBeforeWrite);
  });

  it("deletes only after confirmation and then displays the empty state", async () => {
    repositoriesByProject.p1 = [
      repository("r1", "p1", "Frontend", "https://github.com/example/ilto-fe"),
    ];
    setup(<ArchitectureView />);
    await screen.findByText("example/ilto-fe");
    const getCountBeforeWrite = repositoryGetCount;

    fireEvent.click(
      screen.getByRole("button", { name: "Delete repository: Frontend" }),
    );
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/This cannot be undone/)).toBeVisible();
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Confirm delete" }),
    );

    await waitFor(() => {
      expect(projectRepositoryCalls("DELETE")).toHaveLength(1);
    });
    expect(
      new URL(String(projectRepositoryCalls("DELETE")[0][0])).pathname,
    ).toBe("/api/v1/projects/repositories/r1");
    expect(
      await screen.findByText("No repositories linked yet."),
    ).toBeVisible();
    expect(repositoryGetCount).toBeGreaterThan(getCountBeforeWrite);
  });

  it("keeps the form and input visible when backend validation rejects a write", async () => {
    rejectedWriteStatus = 422;
    setup(<ArchitectureView />);
    await screen.findByText("No repositories linked yet.");

    fireEvent.click(screen.getByRole("button", { name: "Add repository" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Label"), {
      target: { value: "Rejected repository" },
    });
    fireEvent.change(within(dialog).getByLabelText("GitHub repository URL"), {
      target: { value: "https://github.com/example/rejected" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "backend rejected",
    );
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(within(dialog).getByLabelText("Label")).toHaveValue(
      "Rejected repository",
    );
    expect(projectRepositoryCalls("POST")).toHaveLength(1);
  });

  it("scopes requests by Project and removes the previous Project's cards while switching", async () => {
    repositoriesByProject.p1 = [
      repository("r1", "p1", "Frontend", "https://github.com/example/ilto-fe"),
    ];
    repositoriesByProject.p2 = [
      repository("r2", "p2", "Backend", "https://github.com/example/ilto-be"),
    ];
    setup(<ArchitectureView />);

    expect(await screen.findByText("example/ilto-fe")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Architecture project"), {
      target: { value: "p2" },
    });

    expect(screen.queryByText("example/ilto-fe")).not.toBeInTheDocument();
    expect(await screen.findByText("example/ilto-be")).toBeVisible();
    const requestedProjects = projectRepositoryCalls("GET").map(([url]) =>
      new URL(String(url)).searchParams.get("project_id"),
    );
    expect(requestedProjects).toContain("p1");
    expect(requestedProjects).toContain("p2");
  });

  it("does not expose external links for a non-canonical server URL", async () => {
    repositoriesByProject.p1 = [
      repository("r1", "p1", "Unsafe", "javascript:alert(1)"),
    ];
    setup(<ArchitectureView />);

    expect(
      await screen.findByText(
        "Stored repository URL does not match the GitHub contract.",
      ),
    ).toBeVisible();
    expect(
      screen.queryByRole("link", { name: /Open Unsafe/ }),
    ).not.toBeInTheDocument();
  });
});
