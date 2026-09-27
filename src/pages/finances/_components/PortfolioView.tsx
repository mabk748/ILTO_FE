import type {
  NetWorthSnapshot,
  TradeEntry,
  AssetClass,
  FinanceCurrency,
} from "@/lib/api/types.ts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
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
import { useFinancePreferences } from "@/components/providers/finance-preferences-context.ts";
import { useTimeZone } from "@/components/providers/settings-context.ts";
import {
  financeCurrency,
  FINANCIAL_VALUE_MASK,
  formatCompactMoney,
  formatMoney,
} from "@/lib/finance.ts";
import { formatInstant } from "@/lib/time-zone.ts";

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

function CurrencyPortfolio({
  currency,
  netWorth,
  trades,
  masked,
  timeZone,
}: Props & {
  currency: FinanceCurrency;
  masked: boolean;
  timeZone: string;
}) {
  const orderedNetWorth = netWorth
    .filter((snapshot) => financeCurrency(snapshot.currency) === currency)
    .sort(
      (left, right) =>
        new Date(left.date).getTime() - new Date(right.date).getTime(),
    );
  const activeTrades = trades.filter(
    (trade) => financeCurrency(trade.currency) === currency,
  );
  const chartData = orderedNetWorth.map((snapshot) => ({
    timestamp: new Date(snapshot.date).getTime(),
    assets: snapshot.total_assets,
    liabilities: snapshot.total_liabilities,
    net: snapshot.net_worth,
  }));
  const latest = orderedNetWorth.at(-1);
  const grossBuyValue = activeTrades
    .filter((trade) => trade.action === "buy")
    .reduce((total, trade) => total + trade.quantity * trade.price, 0);

  return (
    <section className="space-y-4" aria-labelledby={`portfolio-${currency}`}>
      <h2 id={`portfolio-${currency}`} className="text-sm font-semibold">
        {currency} portfolio records
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pb-3 pt-4">
            <p className="text-xs text-muted-foreground">Net Worth</p>
            <p className="text-xl font-bold text-primary">
              {latest ? formatMoney(latest.net_worth, currency, masked) : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pb-3 pt-4">
            <p className="text-xs text-muted-foreground">Total Assets</p>
            <p className="text-xl font-bold">
              {latest
                ? formatMoney(latest.total_assets, currency, masked)
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pb-3 pt-4">
            <p className="text-xs text-muted-foreground">
              Gross buy value (before sells)
            </p>
            <p className="text-xl font-bold">
              {formatMoney(grossBuyValue, currency, masked)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Net Worth Timeline ({currency})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {masked ? (
            <p className="py-20 text-center text-sm text-muted-foreground">
              Financial chart hidden.
            </p>
          ) : chartData.length === 0 ? (
            <p className="py-20 text-center text-sm text-muted-foreground">
              No net-worth snapshots available for {currency}.
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
                    formatInstant(value, timeZone, { month: "short" })
                  }
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) =>
                    formatCompactMoney(value as number, currency)
                  }
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  labelFormatter={(value) =>
                    formatInstant(Number(value), timeZone, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  }
                  formatter={(value: unknown) => [
                    typeof value === "number"
                      ? formatMoney(value, currency)
                      : String(value ?? ""),
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Trade Log ({currency})</CardTitle>
        </CardHeader>
        <CardContent>
          {activeTrades.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No trades available for {currency}.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="pb-2 text-left font-medium">Ticker</th>
                    <th className="pb-2 text-left font-medium">Class</th>
                    <th className="pb-2 text-left font-medium">Action</th>
                    <th className="pb-2 text-right font-medium">Qty</th>
                    <th className="pb-2 text-right font-medium">Price</th>
                    <th className="pb-2 text-right font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTrades.map((trade) => (
                    <tr
                      key={trade.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="py-2 font-semibold">{trade.ticker}</td>
                      <td className="py-2">
                        <span
                          className={cn(
                            "rounded-full border px-1.5 py-0.5 text-[10px]",
                            ASSET_CLASS_STYLES[trade.asset_class],
                          )}
                        >
                          {trade.asset_class}
                        </span>
                      </td>
                      <td
                        className={cn(
                          "py-2 text-xs font-medium",
                          trade.action === "buy"
                            ? "text-green-400"
                            : "text-red-400",
                        )}
                      >
                        {trade.action.toUpperCase()}
                      </td>
                      <td className="py-2 text-right">
                        {masked ? FINANCIAL_VALUE_MASK : trade.quantity}
                      </td>
                      <td className="py-2 text-right">
                        {formatMoney(trade.price, currency, masked)}
                      </td>
                      <td className="py-2 text-right text-xs text-muted-foreground">
                        {formatInstant(trade.date, timeZone, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

export default function PortfolioView({ netWorth, trades }: Props) {
  const { selectedCurrencies, masked } = useFinancePreferences();
  const timeZone = useTimeZone();

  if (selectedCurrencies.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Select at least one finance currency to display portfolio records.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {selectedCurrencies.map((currency) => (
        <CurrencyPortfolio
          key={currency}
          currency={currency}
          netWorth={netWorth}
          trades={trades}
          masked={masked}
          timeZone={timeZone}
        />
      ))}
    </div>
  );
}
