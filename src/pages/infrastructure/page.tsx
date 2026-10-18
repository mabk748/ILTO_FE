import { useQuery } from "@tanstack/react-query";
import type { SystemMetric } from "@/lib/api/types.ts";
import {
  getGitActivity,
  getLatestMetric,
  getNodeMetrics,
  getNodes,
} from "@/lib/api/infrastructure.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import {
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateMedia,
  EmptyStateTitle,
} from "@/components/ui/empty-state.tsx";
import { Server, RefreshCw } from "lucide-react";
import {
  ModuleHeader,
  ModulePage,
  ModuleSectionHeader,
} from "@/components/layout/ModulePage.tsx";
import NodeCard from "./_components/NodeCard.tsx";
import MetricsChart from "./_components/MetricsChart.tsx";
import GitActivityTable from "./_components/GitActivityTable.tsx";
import { formatDistanceToNow } from "date-fns";
import LoadError from "@/components/LoadError.tsx";
import NodeControls from "./_components/NodeControls.tsx";

async function loadInfrastructureData({ signal }: { signal: AbortSignal }) {
  const nodes = await getNodes({ signal });
  signal.throwIfAborted();
  const [latestResults, historicalResults, gitActivity] = await Promise.all([
    Promise.all(nodes.map((node) => getLatestMetric(node.id, { signal }))),
    Promise.all(nodes.map((node) => getNodeMetrics(node.id, 24, { signal }))),
    getGitActivity({ signal }),
  ]);

  const latestMetrics: Record<string, SystemMetric | null> = {};
  const historicalMetrics: Record<string, SystemMetric[]> = {};
  nodes.forEach((node, index) => {
    latestMetrics[node.id] = latestResults[index];
    historicalMetrics[node.id] = historicalResults[index];
  });

  return { nodes, latestMetrics, historicalMetrics, gitActivity };
}

export default function InfrastructurePage() {
  const {
    data,
    dataUpdatedAt,
    error,
    isPending: loading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["infrastructure"],
    queryFn: loadInfrastructureData,
    refetchInterval: 30_000,
  });
  const nodes = data?.nodes ?? [];
  const historicalObservationCount = Object.values(
    data?.historicalMetrics ?? {},
  ).reduce((total, observations) => total + observations.length, 0);

  return (
    <ModulePage>
      <ModuleHeader
        title="Infrastructure"
        description="Inspect registered nodes, stored system readouts and repository activity."
        icon={Server}
        eyebrow="Infrastructure operating domain"
        actions={
          <>
            <NodeControls />
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              <RefreshCw
                className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`}
              />
              <span>
                Refreshed{" "}
                {dataUpdatedAt
                  ? formatDistanceToNow(new Date(dataUpdatedAt), {
                      addSuffix: true,
                    })
                  : "never"}
              </span>
            </Button>
          </>
        }
      />

      {error ? (
        <LoadError
          error={error}
          onRetry={() => void refetch()}
          title="Could not load infrastructure data"
        />
      ) : (
        <>
          <section className="space-y-4">
            <ModuleSectionHeader
              title="Nodes"
              description="Registered machines and their latest confirmed metric snapshot."
            />
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-48 w-full" />
                ))}
              </div>
            ) : nodes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {nodes.map((node) => (
                  <NodeCard
                    key={node.id}
                    node={node}
                    metric={data?.latestMetrics[node.id] ?? null}
                  />
                ))}
              </div>
            ) : (
              <EmptyState className="py-6 md:py-6">
                <EmptyStateMedia>
                  <Server aria-hidden="true" />
                </EmptyStateMedia>
                <EmptyStateTitle>No nodes registered</EmptyStateTitle>
                <EmptyStateDescription>
                  Register a node before ILTO can display infrastructure
                  readouts and usage history.
                </EmptyStateDescription>
                <EmptyStateActions>
                  <NodeControls />
                </EmptyStateActions>
              </EmptyState>
            )}
          </section>

          <section className="space-y-4">
            <ModuleSectionHeader
              title="24h usage"
              description="Historical CPU and RAM samples returned for the current node set."
            />
            {loading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : historicalObservationCount === 0 ? (
              <EmptyState className="py-6 md:py-6">
                <EmptyStateTitle>
                  No usage observations in this window
                </EmptyStateTitle>
                <EmptyStateDescription>
                  CPU and RAM charts appear after a registered node reports
                  stored metrics.
                </EmptyStateDescription>
              </EmptyState>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <MetricsChart
                      nodes={nodes}
                      metricsMap={data?.historicalMetrics ?? {}}
                      metric="cpu_percent"
                      title="CPU Usage %"
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <MetricsChart
                      nodes={nodes}
                      metricsMap={data?.historicalMetrics ?? {}}
                      metric="ram_percent"
                      title="RAM Usage %"
                    />
                  </CardContent>
                </Card>
              </div>
            )}
          </section>

          <section className="space-y-4">
            <ModuleSectionHeader
              title="Git activity"
              description="Repository activity supplied by the infrastructure backend."
            />
            <Card>
              <CardContent className="pt-4">
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Skeleton key={index} className="h-10 w-full" />
                    ))}
                  </div>
                ) : (
                  <GitActivityTable activities={data?.gitActivity ?? []} />
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </ModulePage>
  );
}
