import { format } from "date-fns";
import type { AppearanceSpend } from "@/lib/api/types.ts";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

interface Props {
  spend: AppearanceSpend[];
}

export default function AppearanceSpendView({ spend }: Props) {
  const totalThisYear = spend.reduce((s, e) => s + e.amount, 0);

  // Spend by category
  const byCat: Record<string, number> = {};
  for (const e of spend) {
    byCat[e.category] = (byCat[e.category] ?? 0) + e.amount;
  }
  const catData = Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, total]) => ({
      cat: cat.charAt(0).toUpperCase() + cat.slice(1),
      total: Number(total.toFixed(2)),
    }));

  // Monthly totals (line chart)
  const byMonth: Record<string, number> = {};
  for (const e of spend) {
    const key = format(new Date(e.date), "MMM yy");
    byMonth[key] = (byMonth[key] ?? 0) + e.amount;
  }
  const monthData = Object.entries(byMonth)
    .sort(
      (a, b) =>
        new Date(`01 ${a[0]}`).getTime() - new Date(`01 ${b[0]}`).getTime(),
    )
    .map(([month, total]) => ({ month, total: Number(total.toFixed(2)) }));

  const sorted = [...spend].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return (
    <div className="space-y-5">
      {/* Total card */}
      <div className="bg-card border border-border rounded-lg p-4">
        <p className="text-xs text-muted-foreground">
          Total Appearance Spend (YTD)
        </p>
        <p className="text-2xl font-bold text-foreground mt-1">
          €{totalThisYear.toFixed(2)}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {spend.length} transactions
        </p>
      </div>

      {/* Bar chart: by category */}
      <div className="bg-card border border-border rounded-lg p-4">
        <p className="text-sm font-semibold text-foreground mb-3">
          Spend by Category
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart
            data={catData}
            margin={{ top: 0, right: 0, bottom: 0, left: -20 }}
          >
            <XAxis
              dataKey="cat"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            />
            <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--foreground)" }}
            />
            <Bar dataKey="total" fill="var(--primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Line chart: monthly */}
      {monthData.length > 1 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm font-semibold text-foreground mb-3">
            Monthly Spend Trend
          </p>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart
              data={monthData}
              margin={{ top: 0, right: 0, bottom: 0, left: -20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Transaction list */}
      <div className="bg-card border border-border rounded-lg divide-y divide-border overflow-hidden">
        <p className="text-sm font-semibold text-foreground px-4 py-3">
          Transactions
        </p>
        {sorted.map((e) => (
          <div
            key={e.id}
            className="flex items-center justify-between px-4 py-3 gap-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {e.item_name}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                  {e.category}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(e.date), "MMM d, yyyy")}
                </span>
                {e.notes && (
                  <span className="text-[10px] text-muted-foreground truncate">
                    {e.notes}
                  </span>
                )}
              </div>
            </div>
            <p className="text-sm font-semibold text-foreground shrink-0">
              {e.currency} {e.amount.toFixed(2)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
