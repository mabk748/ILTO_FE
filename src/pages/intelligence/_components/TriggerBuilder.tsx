import { useQuery } from "@tanstack/react-query";
import LoadError from "@/components/LoadError.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { cn } from "@/lib/utils.ts";
import { getTriggerRules } from "@/lib/api/triggers.ts";
import type { TriggerActionType, TriggerRule } from "@/lib/api/triggers.ts";
import { formatDistanceToNow } from "date-fns";
import TriggerRuleControls from "./TriggerRuleControls.tsx";

const actionColors: Record<TriggerActionType, string> = {
  notify: "bg-primary/20 text-primary border-primary/30",
  flag: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  log: "bg-muted text-muted-foreground border-border",
  pause_spend: "bg-destructive/20 text-destructive border-destructive/30",
};

function RuleCard({ rule }: { rule: TriggerRule }) {
  return (
    <Card className={cn("transition-all", !rule.enabled && "opacity-50")}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{rule.name}</span>
              <span
                className={cn(
                  "text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase",
                  actionColors[rule.action.type],
                )}
              >
                {rule.action.type.replace("_", " ")}
              </span>
              {!rule.enabled && (
                <span className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">
                  disabled
                </span>
              )}
            </div>
            {rule.description && (
              <p className="mb-2 text-xs text-muted-foreground">
                {rule.description}
              </p>
            )}
            <div className="mb-2 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              <span className="font-semibold text-primary uppercase tracking-wide text-[10px]">
                IF
              </span>
              <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">
                {rule.condition.domain} / {rule.condition.metric}
              </span>
              <span className="font-mono font-bold text-foreground">
                {rule.condition.operator}
              </span>
              <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">
                {rule.condition.threshold}
                {rule.condition.unit}
              </span>
              <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-accent">
                THEN
              </span>
              <span className="truncate max-w-[240px]">
                {rule.action.message}
              </span>
              {rule.action.target_domain && (
                <span className="text-[10px]">
                  → {rule.action.target_domain}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              <span>Triggered {rule.trigger_count}×</span>
              {rule.last_triggered && (
                <span>
                  Last{" "}
                  {formatDistanceToNow(new Date(rule.last_triggered), {
                    addSuffix: true,
                  })}
                </span>
              )}
            </div>
          </div>
          <TriggerRuleControls target={{ record: rule }} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function TriggerBuilder() {
  const {
    data: rules = [],
    error,
    isPending: loading,
    refetch,
  } = useQuery({
    queryKey: ["triggers", "rules"],
    queryFn: ({ signal }) => getTriggerRules({ signal }),
  });

  if (error) return <LoadError error={error} onRetry={() => void refetch()} />;

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Stored rule configuration only; no evaluator or automatic action runs
          here.
        </p>
        <TriggerRuleControls target={{}} />
      </div>
      {rules.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No trigger rules yet.
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <RuleCard key={rule.id} rule={rule} />
          ))}
        </div>
      )}
    </div>
  );
}
