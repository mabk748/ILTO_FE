import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import MetricsCharts from "./MetricsCharts.tsx";
import { buildMetricChartData } from "./metrics-chart-data.ts";
import SessionList from "./SessionList.tsx";
import TrainingPlanList from "./TrainingPlanList.tsx";

describe("Health empty states", () => {
  it("sorts metric instants chronologically while preserving null gaps", () => {
    expect(
      buildMetricChartData([
        {
          id: "later",
          date: "2026-09-15T10:00:00Z",
          weight_kg: null,
          sleep_hours: 8,
          resting_hr: null,
          hrv: null,
          steps: null,
          calories_consumed: null,
        },
        {
          id: "earlier",
          date: "2026-09-15T08:00:00+02:00",
          weight_kg: 70,
          sleep_hours: null,
          resting_hr: null,
          hrv: null,
          steps: null,
          calories_consumed: null,
        },
      ]),
    ).toEqual([
      expect.objectContaining({
        timestamp: "2026-09-15T08:00:00+02:00",
        weight: 70,
        sleep: null,
      }),
      expect.objectContaining({
        timestamp: "2026-09-15T10:00:00Z",
        weight: null,
        sleep: 8,
      }),
    ]);
  });

  it("shows explicit empty overview, plan, and session states", () => {
    render(
      <>
        <MetricsCharts metrics={[]} />
        <TrainingPlanList plans={[]} />
        <SessionList sessions={[]} />
      </>,
    );
    expect(
      screen.getByText("No health measurements in the selected window."),
    ).toBeInTheDocument();
    expect(screen.getByText("No training plans yet.")).toBeInTheDocument();
    expect(
      screen.getByText("No workout sessions in the selected window."),
    ).toBeInTheDocument();
  });

  it("opens the selected Sessions workflow for Dashboard Log workout", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SessionList sessions={[]} autoCreate />
      </QueryClientProvider>,
    );
    expect(
      screen.getByRole("heading", { name: "Create workout" }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Completed date and time"),
    ).toBeInTheDocument();
  });
});
