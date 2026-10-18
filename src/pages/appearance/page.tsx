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
import {
  ModuleHeader,
  ModulePage,
  ModuleTabs,
} from "@/components/layout/ModulePage.tsx";
import WardrobeGrid from "./_components/WardrobeGrid.tsx";
import GroomingRoutineList from "./_components/GroomingRoutineList.tsx";
import AppearanceSpendView from "./_components/AppearanceSpendView.tsx";
import LoadError from "@/components/LoadError.tsx";

type Tab = "wardrobe" | "grooming" | "spending";

const TABS: { id: Tab; label: string; detail: string }[] = [
  { id: "wardrobe", label: "Wardrobe", detail: "Available items" },
  { id: "grooming", label: "Grooming", detail: "Routines and outfits" },
  { id: "spending", label: "Spending", detail: "Stored records" },
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
    <ModulePage>
      <ModuleHeader
        title="Appearance"
        description="Organize the wardrobe, review routines and understand stored appearance spending."
        icon={Shirt}
        eyebrow="Appearance operating domain"
      />

      <ModuleTabs
        label="Appearance views"
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
    </ModulePage>
  );
}
