import { useState } from "react";
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
  const currencies = Array.from(new Set(spend.map((entry) => entry.currency)))
    .filter(Boolean)
    .sort();
  const [selectedCurrency, setSelectedCurrency] = useState(
    () => currencies[0] ?? "",
  );
  const activeCurrency = currencies.includes(selectedCurrency)
    ? selectedCurrency
    : (currencies[0] ?? "");

  if (spend.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg py-8 text-center text-sm text-muted-foreground">
        No imported appearance spending records.
      </div>
    );
  }

  const selectedSpend = spend.filter(
    (entry) => entry.currency === activeCurrency,
  );
  const totalsByCurrency = currencies.map((currency) => ({
    currency,
    total: spend
      .filter((entry) => entry.currency === currency)
      .reduce((sum, entry) => sum + entry.amount, 0),
  }));
  const totalForCurrency = selectedSpend.reduce(
    (sum, entry) => sum + entry.amount,
    0,
  );

  // Spend by category
  const byCat: Record<string, number> = {};
  for (const e of selectedSpend) {
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
  for (const e of selectedSpend) {
    const key = format(new Date(e.date), "MMM yy");
    byMonth[key] = (byMonth[key] ?? 0) + e.amount;
  }
  const monthData = Object.entries(byMonth)
    .sort(
      (a, b) =>
        new Date(`01 ${a[0]}`).getTime() - new Date(`01 ${b[0]}`).getTime(),
    )
    .map(([month, total]) => ({ month, total: Number(total.toFixed(2)) }));

  const sorted = [...selectedSpend].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Appearance spend
          </h2>
          <p className="text-xs text-muted-foreground">
            Imported records; no currency conversion.
          </p>
        </div>
        {currencies.length > 1 && (
          <label
            className="text-sm text-muted-foreground"
            htmlFor="appearance-spend-currency"
          >
            Currency
            <select
              id="appearance-spend-currency"
              className="ml-2 bg-card border border-border text-sm text-foreground rounded px-2 py-1 cursor-pointer"
              value={activeCurrency}
              onChange={(event) => setSelectedCurrency(event.target.value)}
            >
              {currencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {totalsByCurrency.map(({ currency, total }) => (
          <div
            key={currency}
            className="bg-card border border-border rounded-lg p-3"
          >
            <p className="text-xs text-muted-foreground">
              {currency} total (all stored)
            </p>
            <p className="text-lg font-bold text-foreground mt-1">
              {currency} {total.toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <p className="text-xs text-muted-foreground">
          {activeCurrency} appearance spend (all stored records)
        </p>
        <p className="text-2xl font-bold text-foreground mt-1">
          {activeCurrency} {totalForCurrency.toFixed(2)}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {selectedSpend.length} {activeCurrency} transactions
        </p>
      </div>

      {/* Bar chart: by category */}
      <div className="bg-card border border-border rounded-lg p-4">
        <p className="text-sm font-semibold text-foreground mb-3">
          Spend by Category ({activeCurrency})
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
            Monthly Spend Trend ({activeCurrency})
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
          {activeCurrency} Transactions
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
