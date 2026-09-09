import type { InfraNode, SystemMetric, NodeStatus } from "@/lib/api/types.ts";
import { Card, CardContent, CardHeader } from "@/components/ui/card.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils.ts";
import { Cpu, MemoryStick, HardDrive } from "lucide-react";

const STATUS_DOT: Record<NodeStatus, string> = {
  online: "bg-green-500",
  degraded: "bg-yellow-500",
  offline: "bg-destructive",
};

const STATUS_TEXT: Record<NodeStatus, string> = {
  online: "Online",
  degraded: "Degraded",
  offline: "Offline",
};

const STATUS_TEXT_CLASS: Record<NodeStatus, string> = {
  online: "text-green-500",
  degraded: "text-yellow-500",
  offline: "text-destructive",
};

function metricColor(value: number): string {
  if (value >= 80) return "text-destructive";
  if (value >= 60) return "text-yellow-500";
  return "text-green-500";
}

function metricBarClass(value: number): string {
  if (value >= 80) return "[&>div]:bg-destructive";
  if (value >= 60) return "[&>div]:bg-yellow-500";
  return "[&>div]:bg-green-500";
}

interface Props {
  node: InfraNode;
  metric: SystemMetric | null;
}

export default function NodeCard({ node, metric }: Props) {
  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{node.name}</p>
            <p className="text-xs text-muted-foreground font-mono">
              {node.hostname}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={cn("w-2 h-2 rounded-full", STATUS_DOT[node.status])}
            />
            <span
              className={cn(
                "text-xs font-medium",
                STATUS_TEXT_CLASS[node.status],
              )}
            >
              {STATUS_TEXT[node.status]}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
          <span>{node.os}</span>
          <span className="font-mono">{node.ip_address}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {metric ? (
          <>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Cpu className="h-3 w-3" />
                  CPU
                </span>
                <span
                  className={cn(
                    "font-mono font-semibold",
                    metricColor(metric.cpu_percent),
                  )}
                >
                  {metric.cpu_percent.toFixed(1)}%
                </span>
              </div>
              <Progress
                value={metric.cpu_percent}
                className={cn("h-1.5", metricBarClass(metric.cpu_percent))}
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <MemoryStick className="h-3 w-3" />
                  RAM
                </span>
                <span
                  className={cn(
                    "font-mono font-semibold",
                    metricColor(metric.ram_percent),
                  )}
                >
                  {metric.ram_percent.toFixed(1)}%
                </span>
              </div>
              <Progress
                value={metric.ram_percent}
                className={cn("h-1.5", metricBarClass(metric.ram_percent))}
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <HardDrive className="h-3 w-3" />
                  Disk
                </span>
                <span
                  className={cn(
                    "font-mono font-semibold",
                    metricColor(metric.disk_percent),
                  )}
                >
                  {metric.disk_percent.toFixed(1)}%
                </span>
              </div>
              <Progress
                value={metric.disk_percent}
                className={cn("h-1.5", metricBarClass(metric.disk_percent))}
              />
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-2">
            No metrics available
          </p>
        )}

        <p className="text-xs text-muted-foreground border-t border-border pt-2">
          Last seen{" "}
          {formatDistanceToNow(new Date(node.last_seen), { addSuffix: true })}
        </p>
      </CardContent>
    </Card>
  );
}
