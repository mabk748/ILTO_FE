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
import {
  ModuleHeader,
  ModulePage,
  ModuleTabs,
} from "@/components/layout/ModulePage.tsx";
import EventCalendar from "./_components/EventCalendar.tsx";
import ChecklistsView from "./_components/ChecklistsView.tsx";
import DocumentsView from "./_components/DocumentsView.tsx";
import LoadError from "@/components/LoadError.tsx";
import { useSearchParams } from "react-router-dom";

type Tab = "calendar" | "checklists" | "documents";

const TABS: { id: Tab; label: string; detail: string }[] = [
  { id: "calendar", label: "Calendar", detail: "Trips and events" },
  { id: "checklists", label: "Checklists", detail: "Reusable preparation" },
  { id: "documents", label: "Documents", detail: "Important records" },
];

export default function LogisticsPage() {
  const [searchParams] = useSearchParams();
  const createEvent = searchParams.get("create") === "event";
  const requestedTab = searchParams.get("tab");
  const [tab, setTab] = useState<Tab>(
    requestedTab === "checklists" || requestedTab === "documents"
      ? requestedTab
      : "calendar",
  );
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
    <ModulePage>
      <ModuleHeader
        title="Logistics"
        description="Coordinate trips, dated events, preparation checklists and important documents."
        icon={MapPin}
        eyebrow="Logistics operating domain"
      />

      <ModuleTabs
        label="Logistics views"
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
          {tab === "calendar" && (
            <EventCalendar
              events={data?.events ?? []}
              trips={data?.trips ?? []}
              autoCreate={createEvent}
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
    </ModulePage>
  );
}
