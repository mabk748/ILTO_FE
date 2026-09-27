import type {
  BudgetCategory,
  PaymentType,
  Transaction,
} from "@/lib/api/types.ts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { useFinancePreferences } from "@/components/providers/finance-preferences-context.ts";
import { useTimeZone } from "@/components/providers/settings-context.ts";
import { financeCurrency, formatMoney } from "@/lib/finance.ts";
import { formatInstant } from "@/lib/time-zone.ts";
import FinanceResourceControls from "./FinanceResourceControls.tsx";

const PAYMENT_LABELS: Record<PaymentType, string> = {
  cash: "Cash",
  bank_transfer: "Bank transfer",
  card: "Card",
  mobile_payment: "Mobile payment",
  direct_debit: "Direct debit",
  other: "Other",
};

export default function TransactionsView({
  categories,
  transactions,
}: {
  categories: BudgetCategory[];
  transactions: Transaction[];
}) {
  const { selectedCurrencies, masked } = useFinancePreferences();
  const timeZone = useTimeZone();
  const categoryNames = new Map(
    categories.map((category) => [category.id, category.name]),
  );
  const visibleTransactions = transactions.filter((transaction) =>
    selectedCurrencies.includes(financeCurrency(transaction.currency)),
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm">
              Transactions (newest first)
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              All matching transactions are shown; no hidden ten-row limit.
            </p>
          </div>
          <FinanceResourceControls
            target={{ kind: "transaction" }}
            categories={categories}
          />
        </div>
      </CardHeader>
      <CardContent>
        {selectedCurrencies.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Select at least one finance currency to display transactions.
          </p>
        ) : visibleTransactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No transactions match the selected currencies.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="pb-2 text-left font-medium">Date</th>
                  <th className="pb-2 text-left font-medium">Description</th>
                  <th className="pb-2 text-left font-medium">Category</th>
                  <th className="pb-2 text-left font-medium">Payment</th>
                  <th className="pb-2 text-left font-medium">Type</th>
                  <th className="pb-2 text-right font-medium">Amount</th>
                  <th className="pb-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleTransactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="whitespace-nowrap py-2 text-xs text-muted-foreground">
                      {formatInstant(transaction.date, timeZone, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="max-w-64 py-2">
                      <p className="truncate">
                        {transaction.description || "No description"}
                      </p>
                      {transaction.tags.length > 0 && (
                        <p className="truncate text-[10px] text-muted-foreground">
                          {transaction.tags.join(", ")}
                        </p>
                      )}
                    </td>
                    <td className="py-2">
                      {categoryNames.get(transaction.category_id) ?? (
                        <span className="text-muted-foreground">
                          Missing category
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-xs">
                      {PAYMENT_LABELS[transaction.payment_type] ?? "Other"}
                    </td>
                    <td className="py-2 text-xs capitalize">
                      {transaction.type}
                    </td>
                    <td
                      className={`whitespace-nowrap py-2 text-right font-medium ${transaction.type === "income" ? "text-green-400" : transaction.type === "expense" ? "text-red-400" : ""}`}
                    >
                      {transaction.type === "income"
                        ? "+"
                        : transaction.type === "expense"
                          ? "−"
                          : ""}
                      {formatMoney(
                        transaction.amount,
                        financeCurrency(transaction.currency),
                        masked,
                      )}
                    </td>
                    <td className="py-2 pl-2">
                      <div className="flex justify-end">
                        <FinanceResourceControls
                          target={{ kind: "transaction", record: transaction }}
                          categories={categories}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
