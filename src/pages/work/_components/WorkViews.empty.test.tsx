import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import CareerRoadmap from "./CareerRoadmap.tsx";
import DeadlineQueue from "./DeadlineQueue.tsx";
import ComplianceChecklist from "./ComplianceChecklist.tsx";

function setup(children: React.ReactNode) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      {children}
    </QueryClientProvider>,
  );
}

describe("Work views", () => {
  it("shows every required empty state", () => {
    setup(
      <>
        <CareerRoadmap milestones={[]} certs={[]} />
        <DeadlineQueue deadlines={[]} />
        <ComplianceChecklist items={[]} />
      </>,
    );
    expect(screen.getByText("No career milestones yet.")).toBeInTheDocument();
    expect(screen.getByText("No certifications yet.")).toBeInTheDocument();
    expect(screen.getByText("No deadlines yet.")).toBeInTheDocument();
    expect(screen.getByText("No compliance items yet.")).toBeInTheDocument();
  });

  it("clamps the certification progress bar but retains actual study values", () => {
    setup(
      <CareerRoadmap
        milestones={[]}
        certs={[
          {
            id: "cert-1",
            name: "Certification",
            provider: "Provider",
            status: "in_progress",
            exam_date: null,
            expiry_date: null,
            study_hours_logged: 150,
            study_hours_target: 100,
          },
        ]}
      />,
    );
    expect(screen.getByText("Study hours: 150h / 100h")).toBeInTheDocument();
    expect(screen.getByText("150%")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Certification study progress" }),
    ).toHaveAttribute("aria-valuenow", "100");
  });

  it("does not label a completed past deadline overdue", () => {
    setup(
      <DeadlineQueue
        deadlines={[
          {
            id: "deadline-1",
            title: "Completed past deadline",
            project_or_context: "Frontend",
            due_date: "2020-01-01T00:00:00.000Z",
            priority: "high",
            status: "completed",
            notes: "",
          },
        ]}
      />,
    );
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.queryByText(/overdue/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Reopen deadline: Completed past deadline",
      }),
    ).toBeInTheDocument();
  });
});
