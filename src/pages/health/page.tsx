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
import MetricsCharts from "./_components/MetricsCharts.tsx";
import TrainingPlanList from "./_components/TrainingPlanList.tsx";
import SessionList from "./_components/SessionList.tsx";
import { cn } from "@/lib/utils.ts";
import LoadError from "@/components/LoadError.tsx";

type Tab = "overview" | "training" | "sessions";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "training", label: "Training" },
  { id: "sessions", label: "Sessions" },
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
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <HeartPulse className="h-6 w-6 text-primary shrink-0" />
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Health
        </h1>
      </div>

      {/* Tabs */}
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
    </div>
  );
}
