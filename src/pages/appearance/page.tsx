import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getWardrobeItems,
  getOutfitLogs,
  getGroomingRoutines,
  getAppearanceSpend,
} from "@/lib/api/appearance.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Shirt } from "lucide-react";
import WardrobeGrid from "./_components/WardrobeGrid.tsx";
import GroomingRoutineList from "./_components/GroomingRoutineList.tsx";
import AppearanceSpendView from "./_components/AppearanceSpendView.tsx";
import { cn } from "@/lib/utils.ts";
import LoadError from "@/components/LoadError.tsx";

type Tab = "wardrobe" | "grooming" | "spending";

const TABS: { id: Tab; label: string }[] = [
  { id: "wardrobe", label: "Wardrobe" },
  { id: "grooming", label: "Grooming" },
  { id: "spending", label: "Spending" },
];

export default function AppearancePage() {
  const [tab, setTab] = useState<Tab>("wardrobe");
  const {
    data,
    error,
    isPending: loading,
    refetch,
  } = useQuery({
    queryKey: ["appearance"],
    queryFn: async ({ signal }) => {
      const [items, outfits, routines, spend] = await Promise.all([
        getWardrobeItems({ signal }),
        getOutfitLogs(undefined, { signal }),
        getGroomingRoutines({ signal }),
        getAppearanceSpend({ signal }),
      ]);
      return { items, outfits, routines, spend };
    },
  });

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Shirt className="h-6 w-6 text-primary shrink-0" />
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Appearance
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
          {tab === "wardrobe" && <WardrobeGrid items={data?.items ?? []} />}
          {tab === "grooming" && (
            <GroomingRoutineList
              routines={data?.routines ?? []}
              outfitLogs={data?.outfits ?? []}
              wardrobeItems={data?.items ?? []}
            />
          )}
          {tab === "spending" && (
            <AppearanceSpendView spend={data?.spend ?? []} />
          )}
        </>
      )}
    </div>
  );
}
