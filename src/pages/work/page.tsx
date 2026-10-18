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
import {
  ModuleHeader,
  ModulePage,
  ModuleTabs,
} from "@/components/layout/ModulePage.tsx";
import CareerRoadmap from "./_components/CareerRoadmap.tsx";
import DeadlineQueue from "./_components/DeadlineQueue.tsx";
import ComplianceChecklist from "./_components/ComplianceChecklist.tsx";
import LoadError from "@/components/LoadError.tsx";
import { useSearchParams } from "react-router-dom";

type Tab = "roadmap" | "deadlines" | "compliance";

const TABS: { id: Tab; label: string; detail: string }[] = [
  { id: "roadmap", label: "Roadmap", detail: "Career direction" },
  { id: "deadlines", label: "Deadlines", detail: "Immediate commitments" },
  { id: "compliance", label: "Compliance", detail: "Required checks" },
];

export default function WorkPage() {
  const [searchParams] = useSearchParams();
  const createDeadline = searchParams.get("create") === "deadline";
  const requestedTab = searchParams.get("tab");
  const [tab, setTab] = useState<Tab>(
    createDeadline || requestedTab === "deadlines"
      ? "deadlines"
      : requestedTab === "compliance"
        ? "compliance"
        : "roadmap",
  );
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
    <ModulePage>
      <ModuleHeader
        title="Work"
        description="Keep career direction, immediate deadlines and compliance obligations in one deliberate view."
        icon={Briefcase}
        eyebrow="Professional operating domain"
      />

      <ModuleTabs
        label="Work views"
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
          {tab === "roadmap" && (
            <CareerRoadmap
              milestones={data?.milestones ?? []}
              certs={data?.certs ?? []}
            />
          )}
          {tab === "deadlines" && (
            <DeadlineQueue
              deadlines={data?.deadlines ?? []}
              autoCreate={createDeadline}
            />
          )}
          {tab === "compliance" && (
            <ComplianceChecklist items={data?.compliance ?? []} />
          )}
        </>
      )}
    </ModulePage>
  );
}
