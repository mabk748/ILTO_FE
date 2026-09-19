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
import { format } from "date-fns";
import { buildChartData, nodeColor } from "./metrics-chart-data.ts";

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
  const data = buildChartData(nodes, metricsMap, metric);

  return (
    <div>
      <p className="text-sm font-semibold mb-3">{title}</p>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground py-20 text-center">
          No metric observations in this window.
        </p>
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
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(0.25 0.04 265)"
            />
            <XAxis
              dataKey="timestamp"
              tick={{ fontSize: 10, fill: "oklch(0.60 0.05 265)" }}
              interval={3}
              tickFormatter={(value: number) =>
                format(new Date(value), "HH:mm")
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
                format(new Date(Number(value)), "PP p")
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
                dot={false}
                activeDot={{ r: 3 }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
