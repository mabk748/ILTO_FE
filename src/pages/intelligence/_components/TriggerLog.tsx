import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import LoadError from "@/components/LoadError.tsx";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";
import { getTriggerLog, resolveTriggerLogEntry } from "@/lib/api/triggers.ts";
import type { TriggerLogEntry } from "@/lib/api/triggers.ts";
import type { DomainName } from "@/lib/api/types.ts";
import { formatDistanceToNow, format } from "date-fns";
import { triggerWriteError } from "../trigger-editor.ts";

const DOMAIN_COLORS: Record<DomainName, string> = {
  projects: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  infrastructure: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  health: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  finances: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  learning: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  work: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  social: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  appearance: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  logistics: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
};

function LogRow({
  entry,
  onResolve,
  pending,
}: {
  entry: TriggerLogEntry;
  onResolve: (id: string) => void;
  pending: boolean;
}) {
  return (
    <div
      className={cn(
        "flex gap-4 items-start px-4 py-3 border-b border-border last:border-0",
        entry.resolved && "opacity-50",
      )}
    >
      <div className="shrink-0 mt-0.5">
        {entry.resolved ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        ) : (
          <Circle className="h-4 w-4 text-primary" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span
            className={cn(
              "text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase",
              DOMAIN_COLORS[entry.domain],
            )}
          >
            {entry.domain}
          </span>
          <span className="text-xs font-semibold">{entry.rule_name}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          <span className="text-foreground font-mono">
            {entry.condition_summary}
          </span>
          {" → "}
          {entry.action_summary}
        </p>
        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span title={format(new Date(entry.triggered_at), "PPpp")}>
            {formatDistanceToNow(new Date(entry.triggered_at), {
              addSuffix: true,
            })}
          </span>
          {entry.resolved && (
            <span className="text-emerald-500 font-medium">· resolved</span>
          )}
        </div>
      </div>
      {!entry.resolved && (
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 text-xs h-7 px-2"
          disabled={pending}
          onClick={() => void onResolve(entry.id)}
        >
          Resolve
        </Button>
      )}
    </div>
  );
}

export default function TriggerLog() {
  const queryClient = useQueryClient();
  const {
    data: log = [],
    error,
    isPending: loading,
    refetch,
  } = useQuery({
    queryKey: ["triggers", "log"],
    queryFn: ({ signal }) => getTriggerLog({ signal }),
  });
  const [showResolved, setShowResolved] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const resolution = useMutation({
    mutationFn: (id: string) => resolveTriggerLogEntry(id),
    retry: false,
  });
  const handleResolve = async (id: string) => {
    setActionError(null);
    try {
      const resolved = await resolution.mutateAsync(id);
      queryClient.setQueryData<TriggerLogEntry[]>(
        ["triggers", "log"],
        (current) =>
          current?.map((entry) =>
            entry.id === resolved.id ? resolved : entry,
          ),
      );
      await queryClient.invalidateQueries({ queryKey: ["triggers"] });
    } catch (reason) {
      setActionError(triggerWriteError(reason));
    }
  };
  if (error) return <LoadError error={error} onRetry={() => void refetch()} />;

  const filtered = showResolved ? log : log.filter((e) => !e.resolved);
  const unresolvedCount = log.filter((e) => !e.resolved).length;

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setShowResolved(false)}
            className={cn(
              "text-xs px-3 py-1.5 rounded-md border font-medium cursor-pointer transition-colors",
              !showResolved
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            Active ({unresolvedCount})
          </button>
          <button
            onClick={() => setShowResolved(true)}
            className={cn(
              "text-xs px-3 py-1.5 rounded-md border font-medium cursor-pointer transition-colors",
              showResolved
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            All ({log.length})
          </button>
        </div>
      </div>

      {actionError && (
        <p role="alert" className="text-sm text-destructive">
          {actionError}
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="py-8 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No active trigger events
          </p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            {filtered.map((entry) => (
              <LogRow
                key={entry.id}
                entry={entry}
                onResolve={handleResolve}
                pending={resolution.isPending}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
