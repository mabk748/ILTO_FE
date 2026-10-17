import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LearningImportDialog from "./_components/LearningImportDialog.tsx";

const fetchMock = vi.fn<typeof fetch>();

const validPackage = {
  goals: [
    {
      import_key: "aws-saa",
      title: "AWS Solutions Architect Associate",
      provider: "AWS",
      type: "certification",
      status: "active",
      start_date: "2026-10-05",
      target_date: null,
      exam_date: null,
      phase: "Phase 1",
      description: "Prepare for the certification exam.",
      priority: "high",
      linked_project_id: null,
    },
  ],
  schedules: [
    {
      goal_ref: "aws-saa",
      weekday: 4,
      session_type: "study",
      planned_minutes: 90,
      topic: "Deep study",
      start_date: "2026-10-05",
      active: false,
    },
  ],
  milestones: [
    {
      goal_ref: "aws-saa",
      title: "Complete VPC section",
      target_date: "2026-11-02",
    },
  ],
};

function setup() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
      mutations: { retry: false },
    },
  });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  render(
    <QueryClientProvider client={client}>
      <LearningImportDialog
        goals={[]}
        schedules={[]}
        milestones={[]}
        projects={[]}
      />
    </QueryClientProvider>,
  );
  return { client, invalidate };
}

async function choosePackage(value: unknown = validPackage) {
  fireEvent.click(screen.getByRole("button", { name: "Import plan" }));
  fireEvent.change(screen.getByLabelText("JSON file"), {
    target: {
      files: [
        new File([JSON.stringify(value)], "learning-plan.json", {
          type: "application/json",
        }),
      ],
    },
  });
  expect(await screen.findByText("File: learning-plan.json")).toBeVisible();
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("unrelated-setting", "keep");
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(
    Response.json(
      {
        status: "completed",
        created: { goals: 1, schedules: 1, milestones: 1 },
        skipped: 0,
        failed: 0,
        warnings: [],
      },
      { status: 201 },
    ),
  );
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8001/api/v1");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Learning import dialog", () => {
  it("previews and submits one exact atomic request, refreshes Learning, and retains the result until acknowledgement", async () => {
    const { invalidate } = setup();
    await choosePackage();
    fireEvent.click(screen.getByRole("button", { name: "Build preview" }));

    expect(await screen.findByText(/Validation: 3 valid/)).toBeVisible();
    expect(screen.getByText(/Duplicate policy: Reject/)).toBeVisible();
    expect(screen.getByText(/import is atomic/i)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Import 3 records" }));

    expect(await screen.findByText("Import completed")).toBeVisible();
    expect(
      screen.getByText("Skipped: 0 · Failed: 0 · Warnings: 0"),
    ).toBeVisible();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8001/api/v1/learning/import");
    expect(init?.method).toBe("POST");
    expect(init?.credentials).toBe("include");
    expect(JSON.parse(String(init?.body))).toEqual({
      duplicate_policy: "reject",
      resources: {
        goals: validPackage.goals,
        schedules: [
          {
            goal_ref: { kind: "import_key", value: "aws-saa" },
            weekday: 4,
            session_type: "study",
            planned_minutes: 90,
            topic: "Deep study",
            start_date: "2026-10-05",
            active: false,
          },
        ],
        milestones: [
          {
            goal_ref: { kind: "import_key", value: "aws-saa" },
            title: "Complete VPC section",
            target_date: "2026-11-02",
          },
        ],
      },
    });
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["learning"] }),
    );
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ["projects"] });
    expect(localStorage.getItem("unrelated-setting")).toBe("keep");

    fireEvent.click(screen.getByRole("button", { name: "View Learning" }));
    expect(screen.queryByText("Import completed")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Import plan" }));
    expect(
      screen.queryByText("File: learning-plan.json"),
    ).not.toBeInTheDocument();
  });

  it("requires root-array resource selection and blocks confirmation for invalid rows", async () => {
    setup();
    await choosePackage([
      {
        title: "Missing required Goal fields",
        id: "server-owned",
      },
    ]);
    expect(screen.getByLabelText("Learning import resource")).toBeRequired();
    fireEvent.change(screen.getByLabelText("Learning import resource"), {
      target: { value: "goals" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Build preview" }));

    expect(await screen.findByText(/1 invalid/)).toBeVisible();
    expect(
      screen.getByText(/Invalid rows are never silently discarded/),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Import 0 records" }),
    ).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps a structured server error to its row and keeps the preview open", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json(
        {
          detail: {
            resource: "schedules",
            row: 1,
            field: "goal_ref",
            code: "reference_unavailable",
            message: "Referenced learning goal is unavailable",
          },
        },
        { status: 422 },
      ),
    );
    setup();
    await choosePackage();
    fireEvent.click(screen.getByRole("button", { name: "Build preview" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Import 3 records" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Weekly schedules row 1, goal_ref",
    );
    expect(screen.getByText("server error")).toBeVisible();
    expect(
      screen.getAllByText(/Referenced learning goal is unavailable/).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/Validation: 3 valid/)).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Import completed")).not.toBeInTheDocument();
  });

  it.each([
    [409, "duplicate or conflicting"],
    [413, "2 MB or 2,000-row"],
  ])(
    "shows HTTP %s honestly without closing or retrying",
    async (status, expected) => {
      fetchMock.mockResolvedValueOnce(
        Response.json({ detail: "Rejected" }, { status }),
      );
      setup();
      await choosePackage();
      fireEvent.click(screen.getByRole("button", { name: "Build preview" }));
      fireEvent.click(
        await screen.findByRole("button", { name: "Import 3 records" }),
      );

      expect(await screen.findByRole("alert")).toHaveTextContent(expected);
      expect(screen.getByText(/Validation: 3 valid/)).toBeVisible();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(screen.queryByText("Import completed")).not.toBeInTheDocument();
    },
  );

  it("shows malformed JSON locally and sends no request", async () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Import plan" }));
    fireEvent.change(screen.getByLabelText("JSON file"), {
      target: {
        files: [
          new File(["{bad"], "learning.json", {
            type: "application/json",
          }),
        ],
      },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "JSON file is malformed",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
