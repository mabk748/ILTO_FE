import type { HealthMetric } from "@/lib/api/types.ts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import HealthResourceControls from "./HealthResourceControls.tsx";
import { buildMetricChartData } from "./metrics-chart-data.ts";

interface Props {
  metrics: HealthMetric[];
}

export default function MetricsCharts({ metrics }: Props) {
  const orderedMetrics = [...metrics].sort(
    (left, right) => Date.parse(left.date) - Date.parse(right.date),
  );
  const data = buildMetricChartData(metrics);

  // Today's snapshot
  const latest = orderedMetrics[orderedMetrics.length - 1];
  const latestInstant = latest ? Date.parse(latest.date) : null;
  const week7 = orderedMetrics.filter(
    (metric) =>
      latestInstant !== null &&
      Date.parse(metric.date) >= latestInstant - 7 * 24 * 60 * 60 * 1000,
  );
  const avg = (key: keyof HealthMetric) => {
    const vals = week7
      .map((m) => m[key] as number | null)
      .filter((v): v is number => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  const delta = (val: number | null, avg7: number | null) => {
    if (val == null || avg7 == null) return null;
    return +(val - avg7).toFixed(1);
  };

  const snapshots = [
    {
      label: "Weight",
      value: latest?.weight_kg?.toFixed(1) ?? "—",
      unit: "kg",
      d: delta(latest?.weight_kg ?? null, avg("weight_kg")),
    },
    {
      label: "Sleep",
      value: latest?.sleep_hours?.toFixed(1) ?? "—",
      unit: "h",
      d: delta(latest?.sleep_hours ?? null, avg("sleep_hours")),
    },
    {
      label: "Resting HR",
      value: latest?.resting_hr?.toString() ?? "—",
      unit: "bpm",
      d: delta(latest?.resting_hr ?? null, avg("resting_hr")),
    },
    {
      label: "HRV",
      value: latest?.hrv?.toString() ?? "—",
      unit: "ms",
      d: delta(latest?.hrv ?? null, avg("hrv")),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Health metrics</h2>
          <p className="text-xs text-muted-foreground">
            Measurements are shown in chronological order; unavailable fields
            remain unavailable.
          </p>
        </div>
        <HealthResourceControls target={{ kind: "metric" }} />
      </div>
      {metrics.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No health measurements in the selected window.
          </CardContent>
        </Card>
      )}
      {metrics.length > 0 && (
        <>
          {/* Today's snapshot */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {snapshots.map((s) => (
              <Card key={s.label}>
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold text-foreground">
                    {s.value}
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      {s.unit}
                    </span>
                  </p>
                  {s.d != null && (
                    <p className="text-xs mt-0.5 text-muted-foreground">
                      {s.d > 0 ? "+" : ""}
                      {s.d} vs 7d avg
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts 2x2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Weight (kg)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={data}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      interval={6}
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      domain={["auto", "auto"]}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Sleep (hours)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={data}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      interval={6}
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 10]}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                    />
                    <Bar
                      dataKey="sleep"
                      fill="var(--primary)"
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Resting HR (bpm)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={data}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      interval={6}
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      domain={["auto", "auto"]}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="hr"
                      stroke="#f97316"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">HRV (ms)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={data}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      interval={6}
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      domain={["auto", "auto"]}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="hrv"
                      stroke="#8b5cf6"
                      fill="#8b5cf620"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
      {orderedMetrics.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Stored measurements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {orderedMetrics.map((metric) => (
              <div
                key={metric.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">
                    {new Date(metric.date).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[
                      metric.weight_kg != null && `${metric.weight_kg} kg`,
                      metric.sleep_hours != null &&
                        `${metric.sleep_hours} h sleep`,
                      metric.resting_hr != null && `${metric.resting_hr} bpm`,
                      metric.hrv != null && `${metric.hrv} ms HRV`,
                      metric.steps != null && `${metric.steps} steps`,
                      metric.calories_consumed != null &&
                        `${metric.calories_consumed} kcal`,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "No measurements available"}
                  </p>
                </div>
                <HealthResourceControls
                  target={{ kind: "metric", record: metric }}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
