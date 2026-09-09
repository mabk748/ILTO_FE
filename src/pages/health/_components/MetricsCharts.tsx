import type { HealthMetric } from "@/lib/api/types.ts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { format } from "date-fns";
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
  Cell,
} from "recharts";

interface Props {
  metrics: HealthMetric[];
}

function fmt(date: string) {
  return format(new Date(date), "MMM d");
}

function sleepColor(h: number): string {
  if (h >= 7) return "#22c55e";
  if (h >= 6) return "#eab308";
  return "#ef4444";
}

export default function MetricsCharts({ metrics }: Props) {
  const data = metrics.map((m) => ({
    date: fmt(m.date),
    weight: m.weight_kg != null ? +m.weight_kg.toFixed(1) : null,
    sleep: m.sleep_hours != null ? +m.sleep_hours.toFixed(1) : null,
    hr: m.resting_hr,
    hrv: m.hrv,
  }));

  // Today's snapshot
  const latest = metrics[metrics.length - 1];
  const week7 = metrics.slice(-7);
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
                <p
                  className={`text-xs mt-0.5 ${s.d > 0 ? "text-green-500" : s.d < 0 ? "text-red-400" : "text-muted-foreground"}`}
                >
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
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
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
                  connectNulls
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
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
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
                <Bar dataKey="sleep" radius={[2, 2, 0, 0]}>
                  {data.map((d, i) => (
                    <Cell
                      key={i}
                      fill={d.sleep != null ? sleepColor(d.sleep) : "#666"}
                    />
                  ))}
                </Bar>
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
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
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
                  connectNulls
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
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
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
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
