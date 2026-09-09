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
import BudgetView from "./_components/BudgetView.tsx";
import PortfolioView from "./_components/PortfolioView.tsx";
import BillsView from "./_components/BillsView.tsx";
import { cn } from "@/lib/utils.ts";
import LoadError from "@/components/LoadError.tsx";

type Tab = "budget" | "portfolio" | "bills";

const TABS: { id: Tab; label: string }[] = [
  { id: "budget", label: "Budget" },
  { id: "portfolio", label: "Portfolio" },
  { id: "bills", label: "Bills" },
];

export default function FinancesPage() {
  const [tab, setTab] = useState<Tab>("budget");
  const {
    data,
    error,
    isPending: loading,
    refetch,
  } = useQuery({
    queryKey: ["finances"],
    queryFn: async () => {
      const [categories, transactions, trades, netWorth, bills] =
        await Promise.all([
          getBudgetCategories(),
          getTransactions(),
          getTrades(),
          getNetWorthHistory(12),
          getBills(),
        ]);
      return { categories, transactions, trades, netWorth, bills };
    },
  });

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <TrendingUp className="h-6 w-6 text-primary shrink-0" />
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Finances
        </h1>
      </div>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer",
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

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
          {tab === "budget" && (
            <BudgetView
              categories={data?.categories ?? []}
              transactions={data?.transactions ?? []}
            />
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
    </div>
  );
}
