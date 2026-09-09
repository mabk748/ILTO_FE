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

const NODE_COLORS: Record<string, string> = {
  n1: "#6366f1",
  n2: "#22d3ee",
  n3: "#f59e0b",
  n4: "#10b981",
};

type ChartPoint = {
  time: string;
  [key: string]: string | number;
};

interface Props {
  nodes: InfraNode[];
  metricsMap: Record<string, SystemMetric[]>;
  metric: "cpu_percent" | "ram_percent";
  title: string;
}

function buildChartData(
  nodes: InfraNode[],
  metricsMap: Record<string, SystemMetric[]>,
  field: "cpu_percent" | "ram_percent",
): ChartPoint[] {
  if (nodes.length === 0) return [];

  // Use first node's timestamps as reference
  const firstNodeMetrics = metricsMap[nodes[0].id] ?? [];
  return firstNodeMetrics.map((m, i) => {
    const point: ChartPoint = {
      time: format(new Date(m.timestamp), "HH:mm"),
    };
    for (const node of nodes) {
      const nodeMetrics = metricsMap[node.id] ?? [];
      point[node.id] = nodeMetrics[i]?.[field] ?? 0;
    }
    return point;
  });
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
                  stopColor={NODE_COLORS[node.id] ?? "#6366f1"}
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={NODE_COLORS[node.id] ?? "#6366f1"}
                  stopOpacity={0}
                />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.04 265)" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: "oklch(0.60 0.05 265)" }}
            interval={3}
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
              stroke={NODE_COLORS[node.id] ?? "#6366f1"}
              fill={`url(#grad-${metric}-${node.id})`}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
