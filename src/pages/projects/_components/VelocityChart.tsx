import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Sprint } from "@/lib/api/types.ts";

interface Props {
  sprints: Sprint[];
}

export default function VelocityChart({ sprints }: Props) {
  const data = sprints.map((s) => ({
    name: s.name.replace("Sprint ", "S"),
    velocity: s.velocity,
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart
        data={data}
        margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.04 265)" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "oklch(0.60 0.05 265)" }}
        />
        <YAxis tick={{ fontSize: 11, fill: "oklch(0.60 0.05 265)" }} />
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
          dataKey="velocity"
          stroke="#6366f1"
          strokeWidth={2}
          dot={{ r: 4, fill: "#6366f1" }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
