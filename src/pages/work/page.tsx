import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getCareerMilestones,
  getCertifications,
  getDeadlines,
  getComplianceItems,
} from "@/lib/api/work.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Briefcase } from "lucide-react";
import CareerRoadmap from "./_components/CareerRoadmap.tsx";
import DeadlineQueue from "./_components/DeadlineQueue.tsx";
import ComplianceChecklist from "./_components/ComplianceChecklist.tsx";
import { cn } from "@/lib/utils.ts";
import LoadError from "@/components/LoadError.tsx";

type Tab = "roadmap" | "deadlines" | "compliance";

const TABS: { id: Tab; label: string }[] = [
  { id: "roadmap", label: "Roadmap" },
  { id: "deadlines", label: "Deadlines" },
  { id: "compliance", label: "Compliance" },
];

export default function WorkPage() {
  const [tab, setTab] = useState<Tab>("roadmap");
  const {
    data,
    error,
    isPending: loading,
    refetch,
  } = useQuery({
    queryKey: ["work"],
    queryFn: async ({ signal }) => {
      const [milestones, certs, deadlines, compliance] = await Promise.all([
        getCareerMilestones({ signal }),
        getCertifications({ signal }),
        getDeadlines({ signal }),
        getComplianceItems({ signal }),
      ]);
      return { milestones, certs, deadlines, compliance };
    },
  });

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Briefcase className="h-6 w-6 text-primary shrink-0" />
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Work
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
          {tab === "roadmap" && (
            <CareerRoadmap
              milestones={data?.milestones ?? []}
              certs={data?.certs ?? []}
            />
          )}
          {tab === "deadlines" && (
            <DeadlineQueue deadlines={data?.deadlines ?? []} />
          )}
          {tab === "compliance" && (
            <ComplianceChecklist items={data?.compliance ?? []} />
          )}
        </>
      )}
    </div>
  );
}
