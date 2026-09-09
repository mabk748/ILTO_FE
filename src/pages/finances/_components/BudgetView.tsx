import type { BudgetCategory, Transaction } from "@/lib/api/types.ts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { format } from "date-fns";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Props {
  categories: BudgetCategory[];
  transactions: Transaction[];
}

export default function BudgetView({ categories, transactions }: Props) {
  const totalSpent = categories.reduce((a, c) => a + c.spent_this_month, 0);
  const totalLimit = categories.reduce((a, c) => a + c.monthly_limit, 0);
  const pct = Math.round((totalSpent / totalLimit) * 100);

  const pieData = categories
    .filter((c) => c.spent_this_month > 0)
    .map((c) => ({ name: c.name, value: c.spent_this_month, color: c.color }));

  return (
    <div className="space-y-4">
      {/* Header summary */}
      <Card>
        <CardContent className="pt-4 pb-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Total spent this month
            </span>
            <span className="font-semibold">
              €{totalSpent.toFixed(0)} / €{totalLimit.toFixed(0)}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pct > 90 ? "bg-red-500" : pct > 70 ? "bg-yellow-500" : "bg-primary"}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {pct}% of monthly budget
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category rows */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {categories.map((c) => {
              const p = Math.round(
                (c.spent_this_month / c.monthly_limit) * 100,
              );
              return (
                <div key={c.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: c.color }}
                      />
                      <span className="text-foreground">{c.name}</span>
                    </div>
                    <span className="text-muted-foreground">
                      €{c.spent_this_month} / €{c.monthly_limit}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${p > 90 ? "bg-red-500" : p > 70 ? "bg-yellow-500" : "bg-primary"}`}
                      style={{
                        width: `${Math.min(p, 100)}%`,
                        background: p <= 70 ? c.color : undefined,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Donut chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Spending Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  formatter={(v: unknown) => [`€${v}`, ""]}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent transactions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {transactions.slice(0, 10).map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between gap-2 py-1 border-b border-border last:border-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-muted-foreground shrink-0">
                  {format(new Date(tx.date), "MMM d")}
                </span>
                <span className="text-sm truncate">{tx.description}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                  {tx.tags[0] ?? ""}
                </span>
              </div>
              <span
                className={`text-sm font-medium shrink-0 ${tx.type === "income" ? "text-green-400" : "text-red-400"}`}
              >
                {tx.type === "income" ? "+" : "-"}€{tx.amount}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
