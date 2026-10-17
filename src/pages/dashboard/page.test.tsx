import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { DomainHealthCard } from "./page.tsx";
import { summarizeActiveSprints } from "./project-summary.ts";
import { sprint, task } from "@/pages/projects/__tests__/fixtures.ts";

function TestIcon() {
  return <span aria-hidden="true" />;
}

describe("Dashboard domain score presentation", () => {
  it("aggregates Tasks across multiple active Sprints", () => {
    const summary = summarizeActiveSprints(
      [
        sprint,
        { ...sprint, id: "s2" },
        { ...sprint, id: "old", status: "completed" },
      ],
      [
        { ...task, status: "done" },
        { ...task, id: "t2", sprint_id: "s2", status: "todo" },
        { ...task, id: "t3", sprint_id: "old", status: "done" },
      ],
    );
    expect(summary.activeSprints.map((item) => item.id)).toEqual(["s1", "s2"]);
    expect(summary.sprintTasks.map((item) => item.id)).toEqual(["t1", "t2"]);
    expect(summary.doneTasks).toBe(1);
  });
  it("renders a missing score as neutral No data instead of Critical", () => {
    render(
      <MemoryRouter>
        <DomainHealthCard
          domain="finances"
          label="Finances"
          icon={TestIcon}
          path="/finances"
          score={null}
          color="text-emerald-400"
          bg="bg-emerald-500/10"
          metrics={[]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("No data")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByText("Critical")).not.toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });
});
