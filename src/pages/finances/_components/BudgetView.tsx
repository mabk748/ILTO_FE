import type { BudgetCategory, FinanceCurrency } from "@/lib/api/types.ts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import FinanceResourceControls from "./FinanceResourceControls.tsx";
import { useFinancePreferences } from "@/components/providers/finance-preferences-context.ts";
import { financeCurrency, formatMoney } from "@/lib/finance.ts";

function CurrencyBudget({
  currency,
  categories,
  masked,
}: {
  currency: FinanceCurrency;
  categories: BudgetCategory[];
  masked: boolean;
}) {
  const totalSpent = categories.reduce(
    (total, category) => total + category.spent_this_month,
    0,
  );
  const totalLimit = categories.reduce(
    (total, category) => total + category.monthly_limit,
    0,
  );
  const percentage =
    totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;
  const pieData = categories
    .filter((category) => category.spent_this_month > 0)
    .map((category) => ({
      name: category.name,
      value: category.spent_this_month,
      color: category.color,
    }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardContent className="space-y-2 pb-3 pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Total spent this month ({currency})
            </span>
            <span className="font-semibold">
              {formatMoney(totalSpent, currency, masked, 0)} /{" "}
              {formatMoney(totalLimit, currency, masked, 0)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${percentage > 90 ? "bg-red-500" : percentage > 70 ? "bg-yellow-500" : "bg-primary"}`}
              style={{
                width: masked ? "0%" : `${Math.min(percentage, 100)}%`,
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {masked
              ? "Financial totals hidden"
              : totalLimit > 0
                ? `${percentage}% of monthly budget`
                : "No monthly limits set"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Spending Breakdown ({currency})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {masked ? (
            <p className="py-20 text-center text-sm text-muted-foreground">
              Financial chart hidden.
            </p>
          ) : pieData.length === 0 ? (
            <p className="py-20 text-center text-sm text-muted-foreground">
              No spending to chart for {currency}.
            </p>
          ) : (
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
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  formatter={(value: unknown) => [
                    typeof value === "number"
                      ? formatMoney(value, currency)
                      : String(value ?? ""),
                    "",
                  ]}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function BudgetView({
  categories,
}: {
  categories: BudgetCategory[];
}) {
  const { selectedCurrencies, masked } = useFinancePreferences();
  const visibleCategories = categories.filter((category) =>
    selectedCurrencies.includes(financeCurrency(category.currency)),
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm">Categories</CardTitle>
            <FinanceResourceControls
              target={{ kind: "category" }}
              categories={categories}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {selectedCurrencies.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Select at least one finance currency to display categories.
            </p>
          ) : visibleCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No budget categories match the selected currencies.
            </p>
          ) : (
            visibleCategories.map((category) => {
              const percentage =
                category.monthly_limit > 0
                  ? Math.round(
                      (category.spent_this_month / category.monthly_limit) *
                        100,
                    )
                  : 0;
              const currency = financeCurrency(category.currency);
              return (
                <div key={category.id} className="space-y-1">
                  <div className="flex justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: category.color }}
                      />
                      <span>{category.name}</span>
                      <span className="text-muted-foreground">{currency}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>
                        {formatMoney(
                          category.spent_this_month,
                          currency,
                          masked,
                        )}{" "}
                        /{" "}
                        {formatMoney(category.monthly_limit, currency, masked)}
                      </span>
                      <FinanceResourceControls
                        target={{ kind: "category", record: category }}
                        categories={categories}
                      />
                    </div>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${percentage > 90 ? "bg-red-500" : percentage > 70 ? "bg-yellow-500" : "bg-primary"}`}
                      style={{
                        width: masked ? "0%" : `${Math.min(percentage, 100)}%`,
                        background:
                          percentage <= 70 ? category.color : undefined,
                      }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {selectedCurrencies.map((currency) => (
        <CurrencyBudget
          key={currency}
          currency={currency}
          categories={visibleCategories.filter(
            (category) => financeCurrency(category.currency) === currency,
          )}
          masked={masked}
        />
      ))}
    </div>
  );
}
