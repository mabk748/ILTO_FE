import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getBudgetCategories,
  getTransactions,
  getTrades,
  getNetWorthHistory,
  getBills,
} from "@/lib/api/finances.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { TrendingUp } from "lucide-react";
import {
  ModuleHeader,
  ModulePage,
  ModuleTabs,
} from "@/components/layout/ModulePage.tsx";
import BudgetView from "./_components/BudgetView.tsx";
import PortfolioView from "./_components/PortfolioView.tsx";
import BillsView from "./_components/BillsView.tsx";
import TransactionsView from "./_components/TransactionsView.tsx";
import LoadError from "@/components/LoadError.tsx";
import { useFinancePreferences } from "@/components/providers/finance-preferences-context.ts";

type Tab = "transactions" | "budget" | "portfolio" | "bills";

const TABS: { id: Tab; label: string; detail: string }[] = [
  { id: "transactions", label: "Transactions", detail: "Record activity" },
  { id: "budget", label: "Budget", detail: "Monthly allocation" },
  { id: "portfolio", label: "Portfolio", detail: "Stored positions" },
  { id: "bills", label: "Bills", detail: "Upcoming obligations" },
];

export default function FinancesPage() {
  const [tab, setTab] = useState<Tab>("transactions");
  const { selectedCurrencies } = useFinancePreferences();
  const {
    data,
    error,
    isPending: loading,
    refetch,
  } = useQuery({
    queryKey: ["finances"],
    queryFn: async ({ signal }) => {
      const [categories, transactions, trades, netWorth, bills] =
        await Promise.all([
          getBudgetCategories({ signal }),
          getTransactions({ signal }),
          getTrades({ signal }),
          getNetWorthHistory(12, { signal }),
          getBills({ signal }),
        ]);
      return { categories, transactions, trades, netWorth, bills };
    },
  });

  return (
    <ModulePage>
      <ModuleHeader
        title="Finances"
        icon={TrendingUp}
        eyebrow="Financial operating domain"
        description={
          <>
            {selectedCurrencies.length === 0
              ? "No currencies selected."
              : `Showing ${selectedCurrencies.join(", ")}.`}{" "}
            Stored currencies are never converted or added together.
          </>
        }
      />

      <ModuleTabs
        label="Finance views"
        items={TABS}
        value={tab}
        onValueChange={setTab}
      />

      {error ? (
        <LoadError error={error} onRetry={() => void refetch()} />
      ) : loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : (
        <>
          {tab === "transactions" && (
            <TransactionsView
              categories={data?.categories ?? []}
              transactions={data?.transactions ?? []}
            />
          )}
          {tab === "budget" && (
            <BudgetView categories={data?.categories ?? []} />
          )}
          {tab === "portfolio" && (
            <PortfolioView
              netWorth={data?.netWorth ?? []}
              trades={data?.trades ?? []}
            />
          )}
          {tab === "bills" && <BillsView bills={data?.bills ?? []} />}
        </>
      )}
    </ModulePage>
  );
}
