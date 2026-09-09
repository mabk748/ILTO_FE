import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  X,
  Check,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";
import {
  getTriggerRules,
  createTriggerRule,
  updateTriggerRule,
  deleteTriggerRule,
  DOMAIN_METRICS,
} from "@/lib/api/triggers.ts";
import type {
  TriggerRule,
  TriggerOperator,
  TriggerActionType,
} from "@/lib/api/triggers.ts";
import type { DomainName } from "@/lib/api/types.ts";
import { formatDistanceToNow } from "date-fns";

const DOMAINS: DomainName[] = [
  "projects",
  "infrastructure",
  "health",
  "finances",
  "learning",
  "work",
  "social",
  "logistics",
  "appearance",
];

const OPERATORS: { value: TriggerOperator; label: string }[] = [
  { value: ">", label: ">" },
  { value: ">=", label: "≥" },
  { value: "<", label: "<" },
  { value: "<=", label: "≤" },
  { value: "==", label: "=" },
  { value: "!=", label: "≠" },
];

const ACTION_TYPES: { value: TriggerActionType; label: string }[] = [
  { value: "notify", label: "Send notification" },
  { value: "flag", label: "Flag for review" },
  { value: "log", label: "Log to audit trail" },
  { value: "pause_spend", label: "Pause spend tracking" },
];

const ACTION_COLORS: Record<TriggerActionType, string> = {
  notify: "bg-primary/20 text-primary border-primary/30",
  flag: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  log: "bg-muted text-muted-foreground border-border",
  pause_spend: "bg-destructive/20 text-destructive border-destructive/30",
};

type FormState = {
  name: string;
  description: string;
  domain: DomainName;
  metric: string;
  operator: TriggerOperator;
  threshold: string;
  actionType: TriggerActionType;
  actionMessage: string;
};

const DEFAULT_FORM: FormState = {
  name: "",
  description: "",
  domain: "finances",
  metric: "budget_pct",
  operator: ">",
  threshold: "90",
  actionType: "notify",
  actionMessage: "",
};

function RuleCard({
  rule,
  onToggle,
  onDelete,
}: {
  rule: TriggerRule;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card className={cn("transition-all", !rule.enabled && "opacity-50")}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-sm font-semibold">{rule.name}</span>
              <span
                className={cn(
                  "text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase",
                  ACTION_COLORS[rule.action.type],
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

            {/* IF/THEN */}
            <div className="flex flex-wrap gap-1 items-center text-xs text-muted-foreground mb-2">
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
              <span className="font-semibold text-accent uppercase tracking-wide text-[10px] ml-1">
                THEN
              </span>
              <span className="truncate max-w-[200px]">
                {rule.action.message}
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
              <span>Triggered {rule.trigger_count}×</span>
              {rule.last_triggered && (
                <span>
                  Last:{" "}
                  {formatDistanceToNow(new Date(rule.last_triggered), {
                    addSuffix: true,
                  })}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onToggle(rule.id, !rule.enabled)}
              className="p-1.5 rounded hover:bg-muted cursor-pointer transition-colors text-muted-foreground hover:text-foreground"
              aria-label={rule.enabled ? "Disable rule" : "Enable rule"}
            >
              {rule.enabled ? (
                <ToggleRight className="h-4 w-4 text-primary" />
              ) : (
                <ToggleLeft className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={() => onDelete(rule.id)}
              className="p-1.5 rounded hover:bg-destructive/10 cursor-pointer transition-colors text-muted-foreground hover:text-destructive"
              aria-label="Delete rule"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TriggerBuilder() {
  const [rules, setRules] = useState<TriggerRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void getTriggerRules()
      .then((rules) => {
        if (active) setRules(rules);
      })
      .catch(() => {
        if (active) toast.error("Could not load rule prototypes");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const availableMetrics = DOMAIN_METRICS[form.domain] ?? [];
  const selectedMetricDef = availableMetrics.find((m) => m.key === form.metric);

  const handleDomainChange = (domain: DomainName) => {
    const metrics = DOMAIN_METRICS[domain];
    setForm((f) => ({
      ...f,
      domain,
      metric: metrics[0]?.key ?? "",
      threshold: String(metrics[0]?.defaultThreshold ?? 0),
    }));
  };

  const handleMetricChange = (metric: string) => {
    const def = availableMetrics.find((m) => m.key === metric);
    setForm((f) => ({
      ...f,
      metric,
      threshold: String(def?.defaultThreshold ?? f.threshold),
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.actionMessage.trim()) {
      toast.error("Name and action message are required");
      return;
    }
    const threshold = Number(form.threshold);
    if (!Number.isFinite(threshold)) {
      toast.error("Threshold must be a valid number");
      return;
    }

    setSaving(true);
    const unit = selectedMetricDef?.unit ?? "";
    try {
      const rule = await createTriggerRule({
        name: form.name.trim(),
        description: form.description.trim(),
        enabled: true,
        condition: {
          domain: form.domain,
          metric: form.metric,
          operator: form.operator,
          threshold,
          unit,
        },
        action: {
          type: form.actionType,
          message: form.actionMessage.trim(),
        },
      });
      setRules((prev) => [...prev, rule]);
      setForm(DEFAULT_FORM);
      setShowForm(false);
      toast.success("Rule prototype created");
    } catch {
      toast.error("Could not create the rule prototype");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await updateTriggerRule(id, { enabled });
      setRules((prev) =>
        prev.map((r) => (r.id === id ? { ...r, enabled } : r)),
      );
    } catch {
      toast.error("Could not update the rule prototype");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this rule prototype?")) return;
    try {
      await deleteTriggerRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
      toast.success("Rule prototype deleted");
    } catch {
      toast.error("Could not delete the rule prototype");
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Rules list */}
      <div className="space-y-3">
        {rules.map((rule) => (
          <RuleCard
            key={rule.id}
            rule={rule}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        ))}
        {rules.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No trigger rules yet. Create one below.
          </p>
        )}
      </div>

      {/* Add rule form */}
      {showForm ? (
        <Card className="border-primary/40">
          <CardContent className="pt-4 pb-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                New rule prototype
              </p>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 hover:bg-muted rounded cursor-pointer text-muted-foreground"
                aria-label="Close rule form"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Rule name</Label>
                <Input
                  placeholder="e.g. Budget Overage Alert"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Description (optional)</Label>
                <Input
                  placeholder="What does this rule do?"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  className="text-sm"
                />
              </div>
            </div>

            {/* Condition */}
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">
                IF condition
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Domain</Label>
                  <Select
                    value={form.domain}
                    onValueChange={(v) => handleDomainChange(v as DomainName)}
                  >
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOMAINS.map((d) => (
                        <SelectItem key={d} value={d} className="text-xs">
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 col-span-1 md:col-span-1">
                  <Label className="text-xs">Metric</Label>
                  <Select
                    value={form.metric}
                    onValueChange={handleMetricChange}
                  >
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMetrics.map((m) => (
                        <SelectItem
                          key={m.key}
                          value={m.key}
                          className="text-xs"
                        >
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Operator</Label>
                  <Select
                    value={form.operator}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, operator: v as TriggerOperator }))
                    }
                  >
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATORS.map((op) => (
                        <SelectItem
                          key={op.value}
                          value={op.value}
                          className="text-xs font-mono"
                        >
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">
                    Threshold{" "}
                    {selectedMetricDef && `(${selectedMetricDef.unit})`}
                  </Label>
                  <Input
                    type="number"
                    value={form.threshold}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, threshold: e.target.value }))
                    }
                    className="text-xs h-8 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Action */}
            <div>
              <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-2">
                THEN action
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Action type</Label>
                  <Select
                    value={form.actionType}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        actionType: v as TriggerActionType,
                      }))
                    }
                  >
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTION_TYPES.map((a) => (
                        <SelectItem
                          key={a.value}
                          value={a.value}
                          className="text-xs"
                        >
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 col-span-1 md:col-span-2">
                  <Label className="text-xs">Action message</Label>
                  <Input
                    placeholder="e.g. Budget overage detected — review spend"
                    value={form.actionMessage}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, actionMessage: e.target.value }))
                    }
                    className="text-xs h-8"
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            {form.name && form.metric && (
              <div className="rounded-md bg-muted/30 border border-border px-3 py-2 text-xs text-muted-foreground">
                <span className="font-semibold text-primary">IF</span>{" "}
                <span className="font-mono text-foreground">
                  {form.domain}/{form.metric}
                </span>{" "}
                <span className="font-bold text-foreground">
                  {form.operator}
                </span>{" "}
                <span className="font-mono text-foreground">
                  {form.threshold}
                  {selectedMetricDef?.unit ?? ""}
                </span>{" "}
                <span className="font-semibold text-accent">THEN</span>{" "}
                {form.actionMessage || (
                  <span className="italic">set message…</span>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowForm(false);
                  setForm(DEFAULT_FORM);
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Check className="h-4 w-4 mr-1.5" />
                {saving ? "Saving…" : "Create prototype"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          New rule prototype
        </Button>
      )}
    </div>
  );
}
