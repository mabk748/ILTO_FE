import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CorrelationCharts from "./CorrelationCharts.tsx";

vi.mock("recharts", () => {
  const Container = ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  );
  const LineChart = ({
    data,
    children,
  }: {
    data?: unknown;
    children?: React.ReactNode;
  }) => (
    <div data-testid="line-chart" data-points={JSON.stringify(data)}>
      {children}
    </div>
  );
  const AreaChart = LineChart;
  const Line = ({
    dataKey,
    connectNulls,
  }: {
    dataKey?: string;
    connectNulls?: boolean;
  }) => (
    <div
      data-testid={`line-${dataKey}`}
      data-connect-nulls={String(connectNulls)}
    />
  );
  const Area = Line;
  const Null = () => null;
  return {
    ResponsiveContainer: Container,
    LineChart,
    AreaChart,
    Line,
    Area,
    XAxis: Null,
    YAxis: Null,
    CartesianGrid: Null,
    Tooltip: Null,
    Legend: Null,
  };
});

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test/api/v1");
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function setup() {
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <CorrelationCharts />
    </QueryClientProvider>,
  );
}

describe("Intelligence correlation charts", () => {
  it("renders explicit honest empty chart states without inventing sleep/commit data", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(Response.json([])));
    setup();
    expect(
      await screen.findByText(
        "No dated sleep and commit observations are stored yet.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("No stored comparison points yet."),
    ).toHaveLength(2);
    expect(
      screen.getByText("No stored net-worth points yet."),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("line-chart")).not.toBeInTheDocument();
  });

  it("passes null comparison gaps to Recharts without connecting or replacing them", async () => {
    fetchMock
      .mockResolvedValueOnce(
        Response.json([
          {
            date: "2026-09-19T00:00:00.000Z",
            label: "Sep 19",
            sleep: 7.5,
            commits: null,
          },
        ]),
      )
      .mockResolvedValueOnce(Response.json([]))
      .mockResolvedValueOnce(Response.json([]))
      .mockResolvedValueOnce(Response.json([]));
    setup();
    const chart = await screen.findByTestId("line-chart");
    expect(chart).toHaveAttribute(
      "data-points",
      expect.stringContaining('"commits":null'),
    );
    expect(screen.getByTestId("line-commits")).toHaveAttribute(
      "data-connect-nulls",
      "false",
    );
    expect(
      screen.queryByText(
        "No dated sleep and commit observations are stored yet.",
      ),
    ).not.toBeInTheDocument();
  });

  it("shows the failed-read state when an Intelligence request is rejected", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ detail: "Unavailable" }, { status: 503 }),
    );
    setup();
    expect(
      await screen.findByText("Could not load this section"),
    ).toBeInTheDocument();
  });
});
