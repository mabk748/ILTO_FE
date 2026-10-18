import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  getHealthMetrics,
  getTrainingPlans,
  getWorkoutSessions,
} from "@/lib/api/health.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { HeartPulse } from "lucide-react";
import {
  ModuleHeader,
  ModulePage,
  ModuleTabs,
} from "@/components/layout/ModulePage.tsx";
import MetricsCharts from "./_components/MetricsCharts.tsx";
import TrainingPlanList from "./_components/TrainingPlanList.tsx";
import SessionList from "./_components/SessionList.tsx";
import LoadError from "@/components/LoadError.tsx";

type Tab = "overview" | "training" | "sessions";

const TABS: { id: Tab; label: string; detail: string }[] = [
  { id: "overview", label: "Overview", detail: "Stored measurements" },
  { id: "training", label: "Training", detail: "Current plans" },
  { id: "sessions", label: "Sessions", detail: "Recent activity" },
];

export default function HealthPage() {
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const logWorkout = searchParams.get("action") === "log-workout";
  const [tab, setTab] = useState<Tab>(
    requestedTab === "sessions" || requestedTab === "training"
      ? requestedTab
      : "overview",
  );
  const {
    data,
    error,
    isPending: loading,
    refetch,
  } = useQuery({
    queryKey: ["health"],
    queryFn: async ({ signal }) => {
      const [metrics, plans, sessions] = await Promise.all([
        getHealthMetrics(30, { signal }),
        getTrainingPlans({ signal }),
        getWorkoutSessions(14, { signal }),
      ]);
      return { metrics, plans, sessions };
    },
  });

  return (
    <ModulePage>
      <ModuleHeader
        title="Health"
        description="Review stored measurements, manage training plans and log recent workout sessions."
        icon={HeartPulse}
        eyebrow="Health operating domain"
      />

      <ModuleTabs
        label="Health views"
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
          {tab === "overview" && (
            <MetricsCharts metrics={data?.metrics ?? []} />
          )}
          {tab === "training" && <TrainingPlanList plans={data?.plans ?? []} />}
          {tab === "sessions" && (
            <SessionList
              sessions={data?.sessions ?? []}
              plans={data?.plans ?? []}
              autoCreate={logWorkout}
            />
          )}
        </>
      )}
    </ModulePage>
  );
}
