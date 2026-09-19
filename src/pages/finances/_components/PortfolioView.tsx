import type {
  NetWorthSnapshot,
  TradeEntry,
  AssetClass,
} from "@/lib/api/types.ts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { format } from "date-fns";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils.ts";

interface Props {
  netWorth: NetWorthSnapshot[];
  trades: TradeEntry[];
}

const ASSET_CLASS_STYLES: Record<AssetClass, string> = {
  equity: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  crypto: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  cash: "bg-green-500/15 text-green-400 border-green-500/30",
  bond: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  real_estate: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  other: "bg-muted text-muted-foreground border-border",
};

export default function PortfolioView({ netWorth, trades }: Props) {
  const orderedNetWorth = [...netWorth].sort(
    (left, right) =>
      new Date(left.date).getTime() - new Date(right.date).getTime(),
  );
  const chartData = orderedNetWorth.map((n) => ({
    timestamp: new Date(n.date).getTime(),
    assets: n.total_assets,
    liabilities: n.total_liabilities,
    net: n.net_worth,
  }));

  const latest = orderedNetWorth[orderedNetWorth.length - 1];
  const totalInvested = trades
    .filter((t) => t.action === "buy")
    .reduce((a, t) => a + t.quantity * t.price, 0);

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Net Worth</p>
            <p className="text-xl font-bold text-primary">
              €{latest?.net_worth.toLocaleString() ?? "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total Assets</p>
            <p className="text-xl font-bold">
              €{latest?.total_assets.toLocaleString() ?? "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">
              Gross buy value (before sells)
            </p>
            <p className="text-xl font-bold">
              €{totalInvested.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Net worth chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Net Worth Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-20">
              No net-worth snapshots available.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value: number) =>
                    format(new Date(value), "MMM")
                  }
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) =>
                    `€${((v as number) / 1000).toFixed(0)}k`
                  }
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  formatter={(v: unknown) => [
                    `€${typeof v === "number" ? v.toLocaleString() : v}`,
                    "",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="assets"
                  stroke="#6366f1"
                  fill="#6366f120"
                  strokeWidth={2}
                  stackId="1"
                />
                <Area
                  type="monotone"
                  dataKey="liabilities"
                  stroke="#ef4444"
                  fill="#ef444420"
                  strokeWidth={2}
                  stackId="2"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Trade log */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Trade Log</CardTitle>
        </CardHeader>
        <CardContent>
          {trades.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No trades available.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border">
                    <th className="text-left pb-2 font-medium">Ticker</th>
                    <th className="text-left pb-2 font-medium">Class</th>
                    <th className="text-left pb-2 font-medium">Action</th>
                    <th className="text-right pb-2 font-medium">Qty</th>
                    <th className="text-right pb-2 font-medium">Price</th>
                    <th className="text-right pb-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((t) => (
                    <tr
                      key={t.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="py-2 font-semibold">{t.ticker}</td>
                      <td className="py-2">
                        <span
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full border",
                            ASSET_CLASS_STYLES[t.asset_class],
                          )}
                        >
                          {t.asset_class}
                        </span>
                      </td>
                      <td
                        className={cn(
                          "py-2 font-medium text-xs",
                          t.action === "buy"
                            ? "text-green-400"
                            : "text-red-400",
                        )}
                      >
                        {t.action.toUpperCase()}
                      </td>
                      <td className="py-2 text-right">{t.quantity}</td>
                      <td className="py-2 text-right">
                        €{t.price.toLocaleString()}
                      </td>
                      <td className="py-2 text-right text-muted-foreground text-xs">
                        {format(new Date(t.date), "MMM d, yyyy")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
