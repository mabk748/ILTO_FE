import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card.tsx";
import {
  getSleepVsCommits,
  getBudgetVsVelocity,
  getHrvVsRpe,
  getNetWorthTrend,
} from "@/lib/api/intelligence.ts";
import type { CorrelationPoint } from "@/lib/api/intelligence.ts";
import LoadError from "@/components/LoadError.tsx";

type ChartSpec = {
  title: string;
  description: string;
  lines: {
    key: string;
    label: string;
    color: string;
    yAxisId: string;
    type?: "area";
  }[];
  leftLabel: string;
  rightLabel: string;
};

const CHARTS: ChartSpec[] = [
  {
    title: "Sleep vs Commits",
    description:
      "Health × Infrastructure — does sleep quality correlate with dev output?",
    lines: [
      { key: "sleep", label: "Sleep (h)", color: "#a78bfa", yAxisId: "left" },
      { key: "commits", label: "Commits", color: "#60a5fa", yAxisId: "right" },
    ],
    leftLabel: "Sleep (h)",
    rightLabel: "Commits",
  },
  {
    title: "Budget Spend vs Sprint Velocity",
    description:
      "Finances × Projects — do spending pressure spikes slow down execution?",
    lines: [
      {
        key: "budget_pct",
        label: "Budget spent (%)",
        color: "#f87171",
        yAxisId: "left",
      },
      {
        key: "velocity",
        label: "Velocity (pts)",
        color: "#34d399",
        yAxisId: "right",
      },
    ],
    leftLabel: "Budget %",
    rightLabel: "Velocity",
  },
  {
    title: "HRV vs Training Intensity (RPE)",
    description:
      "Health internal — does hard training suppress HRV the next day?",
    lines: [
      { key: "hrv", label: "HRV (ms)", color: "#f472b6", yAxisId: "left" },
      { key: "rpe", label: "RPE (0–10)", color: "#fb923c", yAxisId: "right" },
    ],
    leftLabel: "HRV (ms)",
    rightLabel: "RPE",
  },
];

type AllData = {
  sleepVsCommits: CorrelationPoint[];
  budgetVsVelocity: CorrelationPoint[];
  hrvVsRpe: CorrelationPoint[];
  netWorth: CorrelationPoint[];
};

export default function CorrelationCharts() {
  const {
    data,
    error,
    isPending: loading,
    refetch,
  } = useQuery({
    queryKey: ["intelligence", "comparisons"],
    queryFn: async (): Promise<AllData> => {
      const [sleepVsCommits, budgetVsVelocity, hrvVsRpe, netWorth] =
        await Promise.all([
          getSleepVsCommits(),
          getBudgetVsVelocity(),
          getHrvVsRpe(),
          getNetWorthTrend(),
        ]);
      return { sleepVsCommits, budgetVsVelocity, hrvVsRpe, netWorth };
    },
  });

  const chartData = [
    data?.sleepVsCommits ?? [],
    data?.budgetVsVelocity ?? [],
    data?.hrvVsRpe ?? [],
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return <LoadError error={error} onRetry={() => void refetch()} />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {CHARTS.map((spec, i) => (
          <Card key={spec.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                {spec.title}
              </CardTitle>
              <CardDescription className="text-[11px]">
                {spec.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart
                  data={chartData[i]}
                  margin={{ top: 4, right: 16, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(0.25 0.04 265)"
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "oklch(0.60 0.05 265)" }}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 10, fill: "oklch(0.60 0.05 265)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 10, fill: "oklch(0.60 0.05 265)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.14 0.025 265)",
                      border: "1px solid oklch(0.25 0.04 265)",
                      borderRadius: "6px",
                      fontSize: "11px",
                    }}
                    labelStyle={{ color: "oklch(0.95 0.01 270)" }}
                  />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                  {spec.lines.map((l) => (
                    <Line
                      key={l.key}
                      type="monotone"
                      dataKey={l.key}
                      name={l.label}
                      stroke={l.color}
                      yAxisId={l.yAxisId}
                      dot={false}
                      strokeWidth={1.5}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ))}

        {/* Net worth area chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Net Worth Trend
            </CardTitle>
            <CardDescription className="text-[11px]">
              Finances — assets, liabilities & net worth over 12 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart
                data={data?.netWorth ?? []}
                margin={{ top: 4, right: 16, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colAssets" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colNetWorth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.25 0.04 265)"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "oklch(0.60 0.05 265)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "oklch(0.60 0.05 265)" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `€${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.14 0.025 265)",
                    border: "1px solid oklch(0.25 0.04 265)",
                    borderRadius: "6px",
                    fontSize: "11px",
                  }}
                  formatter={(value: unknown) => [
                    typeof value === "number"
                      ? `€${value.toFixed(0)}`
                      : String(value ?? ""),
                    "",
                  ]}
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                <Area
                  type="monotone"
                  dataKey="assets"
                  name="Assets"
                  stroke="#34d399"
                  fill="url(#colAssets)"
                  strokeWidth={1.5}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="net_worth"
                  name="Net Worth"
                  stroke="#a78bfa"
                  fill="url(#colNetWorth)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="liabilities"
                  name="Liabilities"
                  stroke="#f87171"
                  strokeWidth={1}
                  strokeDasharray="4 2"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
