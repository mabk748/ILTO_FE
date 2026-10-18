import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { SystemMetric, InfraNode } from "@/lib/api/types.ts";
import { buildChartData, nodeColor } from "./metrics-chart-data.ts";
import { useTimeZone } from "@/components/providers/settings-context.ts";
import { formatInstant } from "@/lib/time-zone.ts";

interface Props {
  nodes: InfraNode[];
  metricsMap: Record<string, SystemMetric[]>;
  metric: "cpu_percent" | "ram_percent";
  title: string;
}

export default function MetricsChart({
  nodes,
  metricsMap,
  metric,
  title,
}: Props) {
  const timeZone = useTimeZone();
  const data = buildChartData(nodes, metricsMap, metric);
  const observationCount = data.reduce(
    (total, point) =>
      total + nodes.filter((node) => typeof point[node.id] === "number").length,
    0,
  );

  return (
    <div>
      <p className="text-sm font-semibold mb-3">{title}</p>
      {observationCount === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
          No metric observations in this window.
        </p>
      ) : data.length === 1 ? (
        <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
          <p className="text-xs text-muted-foreground">
            One timestamp is stored; another is needed to establish a trend.
          </p>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            {nodes.map((node) => (
              <div key={node.id} className="flex justify-between gap-3 text-sm">
                <dt className="truncate text-muted-foreground">{node.name}</dt>
                <dd className="font-mono font-semibold tabular-nums">
                  {typeof data[0][node.id] === "number"
                    ? `${Number(data[0][node.id]).toFixed(1)}%`
                    : "Unavailable"}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart
            data={data}
            margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
          >
            <defs>
              {nodes.map((node) => (
                <linearGradient
                  key={node.id}
                  id={`grad-${metric}-${node.id}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={nodeColor(node.id)}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor={nodeColor(node.id)}
                    stopOpacity={0}
                  />
                </linearGradient>
              ))}
            </defs>
            {data.length > 2 && (
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="oklch(0.25 0.04 265)"
              />
            )}
            <XAxis
              dataKey="timestamp"
              tick={{ fontSize: 10, fill: "oklch(0.60 0.05 265)" }}
              interval={3}
              tickFormatter={(value: number) =>
                formatInstant(value, timeZone, {
                  hour: "2-digit",
                  minute: "2-digit",
                  hourCycle: "h23",
                })
              }
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: "oklch(0.60 0.05 265)" }}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                fontSize: 11,
              }}
              formatter={(value) => {
                if (typeof value === "number")
                  return [`${value.toFixed(1)}%`] as [string];
                if (typeof value === "string") return [`${value}`] as [string];
                return [""] as [string];
              }}
              labelFormatter={(value) =>
                formatInstant(Number(value), timeZone, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              }
            />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              formatter={(value: string) => {
                const node = nodes.find((n) => n.id === value);
                return node?.name ?? value;
              }}
            />
            {nodes.map((node) => (
              <Area
                key={node.id}
                type="monotone"
                dataKey={node.id}
                stroke={nodeColor(node.id)}
                fill={`url(#grad-${metric}-${node.id})`}
                strokeWidth={1.5}
                dot={data.length <= 2 ? { r: 3 } : false}
                activeDot={{ r: 3 }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
