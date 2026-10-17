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
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
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
          stroke="var(--foreground)"
          strokeWidth={2}
          dot={{ r: 4, fill: "var(--foreground)" }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
