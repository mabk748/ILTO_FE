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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Server, GitBranch, RefreshCw } from "lucide-react";
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

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Server className="h-6 w-6 text-primary shrink-0" />
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Infrastructure
            </h1>
            <p className="text-xs text-muted-foreground">
              Stored readouts and registered node metadata
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NodeControls />
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
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
        </div>
      </div>

      {error ? (
        <LoadError
          error={error}
          onRetry={() => void refetch()}
          title="Could not load infrastructure data"
        />
      ) : (
        <>
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Nodes
            </h2>
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
              <p className="text-sm text-muted-foreground">
                No nodes registered yet. Create a node to track stored readouts.
              </p>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              24h Usage
            </h2>
            {loading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
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

          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Git Activity
            </h2>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-primary" />
                  Repository Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
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
    </div>
  );
}
