import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getTrips,
  getChecklists,
  getDocuments,
  getLogisticsEvents,
} from "@/lib/api/logistics.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { MapPin } from "lucide-react";
import EventCalendar from "./_components/EventCalendar.tsx";
import ChecklistsView from "./_components/ChecklistsView.tsx";
import DocumentsView from "./_components/DocumentsView.tsx";
import { cn } from "@/lib/utils.ts";
import LoadError from "@/components/LoadError.tsx";

type Tab = "calendar" | "checklists" | "documents";

const TABS: { id: Tab; label: string }[] = [
  { id: "calendar", label: "Calendar" },
  { id: "checklists", label: "Checklists" },
  { id: "documents", label: "Documents" },
];

export default function LogisticsPage() {
  const [tab, setTab] = useState<Tab>("calendar");
  const {
    data,
    error,
    isPending: loading,
    refetch,
  } = useQuery({
    queryKey: ["logistics"],
    queryFn: async ({ signal }) => {
      const [trips, checklists, documents, events] = await Promise.all([
        getTrips({ signal }),
        getChecklists({ signal }),
        getDocuments({ signal }),
        getLogisticsEvents({ signal }),
      ]);
      return { trips, checklists, documents, events };
    },
  });

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <MapPin className="h-6 w-6 text-primary shrink-0" />
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Logistics
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
          {tab === "calendar" && (
            <EventCalendar
              events={data?.events ?? []}
              trips={data?.trips ?? []}
            />
          )}
          {tab === "checklists" && (
            <ChecklistsView checklists={data?.checklists ?? []} />
          )}
          {tab === "documents" && (
            <DocumentsView documents={data?.documents ?? []} />
          )}
        </>
      )}
    </div>
  );
}
