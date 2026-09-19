import { useId, useRef, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { DOMAIN_METRICS } from "@/lib/api/triggers.ts";
import type { DomainName } from "@/lib/api/types.ts";
import {
  deleteTriggerRule,
  initialTriggerDraft,
  saveTriggerRule,
  triggerActionTypes,
  triggerDomains,
  triggerOperators,
  triggerWriteError,
  type TriggerDraft,
  type TriggerTarget,
} from "../trigger-editor.ts";

const actionLabels: Record<(typeof triggerActionTypes)[number], string> = {
  notify: "Record notification action",
  log: "Record audit-log action",
  pause_spend: "Record pause-spend action",
  flag: "Flag for review",
};

function targetLabel(target: TriggerTarget): string {
  return target.record?.name ?? "rule";
}

export default function TriggerRuleControls({
  target,
}: {
  target: TriggerTarget;
}) {
  const [mode, setMode] = useState<"edit" | "delete" | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const label = targetLabel(target);
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={target.record ? "outline" : "secondary"}
          aria-label={target.record ? `Edit rule: ${label}` : "Create rule"}
          onClick={(event) => {
            trigger.current = event.currentTarget;
            setMode("edit");
          }}
        >
          {target.record ? "Edit" : "New trigger rule"}
        </Button>
        {target.record && (
          <Button
            size="sm"
            variant="outline"
            aria-label={`Delete rule: ${label}`}
            onClick={(event) => {
              trigger.current = event.currentTarget;
              setMode("delete");
            }}
          >
            Delete
          </Button>
        )}
      </div>
      <Dialog
        open={mode !== null}
        onOpenChange={(open) => !open && setMode(null)}
      >
        {mode && (
          <Editor
            key={mode}
            target={target}
            mode={mode}
            onClose={() => setMode(null)}
            restoreFocus={() => trigger.current?.focus()}
          />
        )}
      </Dialog>
    </>
  );
}

function Editor({
  target,
  mode,
  onClose,
  restoreFocus,
}: {
  target: TriggerTarget;
  mode: "edit" | "delete";
  onClose: () => void;
  restoreFocus: () => void;
}) {
  const id = useId();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<TriggerDraft>(() =>
    initialTriggerDraft(target),
  );
  const mutation = useMutation({
    mutationFn: async () =>
      mode === "delete"
        ? deleteTriggerRule(target)
        : saveTriggerRule(target, values),
    retry: false,
  });
  const change = (key: string, value: string | boolean) =>
    setValues((previous) => ({ ...previous, [key]: value }));
  const domain = String(values.domain) as DomainName;
  const metrics = DOMAIN_METRICS[domain] ?? [];
  const changeDomain = (nextDomain: DomainName) => {
    const metric = DOMAIN_METRICS[nextDomain]?.[0];
    setValues((previous) => ({
      ...previous,
      domain: nextDomain,
      metric: metric?.key ?? "",
      threshold: String(metric?.defaultThreshold ?? 0),
      unit: metric?.unit ?? "",
    }));
  };
  const changeMetric = (nextMetric: string) => {
    const metric = metrics.find((item) => item.key === nextMetric);
    setValues((previous) => ({
      ...previous,
      metric: nextMetric,
      threshold: String(metric?.defaultThreshold ?? previous.threshold),
      unit: metric?.unit ?? previous.unit,
    }));
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await mutation.mutateAsync();
      await queryClient.invalidateQueries({ queryKey: ["triggers"] });
      onClose();
    } catch {
      // Keep the editor open so server and validation failures remain visible.
    }
  };
  const field = (
    key: string,
    label: string,
    type = "text",
    required = false,
    extra?: { step?: string },
  ) => (
    <div className="space-y-1" key={key}>
      <Label htmlFor={`${id}-${key}`}>{label}</Label>
      <Input
        id={`${id}-${key}`}
        type={type}
        required={required}
        step={extra?.step}
        value={typeof values[key] === "string" ? values[key] : ""}
        onChange={(event) => change(key, event.target.value)}
      />
    </div>
  );

  return (
    <DialogContent
      className="max-h-[90vh] overflow-y-auto"
      showCloseButton={!mutation.isPending}
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        restoreFocus();
      }}
      onEscapeKeyDown={(event) => mutation.isPending && event.preventDefault()}
      onInteractOutside={(event) =>
        mutation.isPending && event.preventDefault()
      }
    >
      <DialogHeader>
        <DialogTitle>
          {mode === "delete" ? "Delete" : target.record ? "Edit" : "Create"}{" "}
          trigger rule
        </DialogTitle>
        <DialogDescription>
          {mode === "delete"
            ? "Deleting this rule also deletes its backend audit logs after confirmation."
            : "Rules are stored configuration only. They do not evaluate, fire, notify, or enforce actions in this iteration."}
        </DialogDescription>
      </DialogHeader>
      <form
        noValidate
        onSubmit={(event) => void submit(event)}
        className="space-y-4"
      >
        <fieldset disabled={mutation.isPending} className="space-y-4">
          {mode === "edit" && (
            <>
              {field("name", "Rule name", "text", true)}
              {field("description", "Description")}
              <label
                className="flex items-center gap-2 text-sm"
                htmlFor={`${id}-enabled`}
              >
                <input
                  id={`${id}-enabled`}
                  type="checkbox"
                  checked={values.enabled === true}
                  onChange={(event) => change("enabled", event.target.checked)}
                />
                Enabled
              </label>
              <div className="space-y-3 rounded-md border border-border p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Condition
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor={`${id}-domain`}>Domain</Label>
                    <select
                      id={`${id}-domain`}
                      className="bg-background h-9 w-full rounded-md border px-3 text-sm"
                      value={String(values.domain)}
                      onChange={(event) =>
                        changeDomain(event.target.value as DomainName)
                      }
                    >
                      {triggerDomains.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`${id}-metric`}>Metric</Label>
                    <select
                      id={`${id}-metric`}
                      className="bg-background h-9 w-full rounded-md border px-3 text-sm"
                      value={String(values.metric)}
                      onChange={(event) => changeMetric(event.target.value)}
                    >
                      {metrics.map((metric) => (
                        <option key={metric.key} value={metric.key}>
                          {metric.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`${id}-operator`}>Operator</Label>
                    <select
                      id={`${id}-operator`}
                      className="bg-background h-9 w-full rounded-md border px-3 text-sm"
                      value={String(values.operator)}
                      onChange={(event) =>
                        change("operator", event.target.value)
                      }
                    >
                      {triggerOperators.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  {field("threshold", "Threshold", "number", true, {
                    step: "any",
                  })}
                  {field("unit", "Unit", "text", true)}
                </div>
              </div>
              <div className="space-y-3 rounded-md border border-border p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                  Action
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor={`${id}-action_type`}>Action type</Label>
                    <select
                      id={`${id}-action_type`}
                      className="bg-background h-9 w-full rounded-md border px-3 text-sm"
                      value={String(values.action_type)}
                      onChange={(event) =>
                        change("action_type", event.target.value)
                      }
                    >
                      {triggerActionTypes.map((option) => (
                        <option key={option} value={option}>
                          {actionLabels[option]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`${id}-target_domain`}>Target domain</Label>
                    <select
                      id={`${id}-target_domain`}
                      className="bg-background h-9 w-full rounded-md border px-3 text-sm"
                      value={String(values.target_domain)}
                      onChange={(event) =>
                        change("target_domain", event.target.value)
                      }
                    >
                      <option value="">No target domain</option>
                      {triggerDomains.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {field("action_message", "Action message", "text", true)}
              </div>
            </>
          )}
          {mode === "delete" && (
            <p className="text-sm text-muted-foreground">
              The view refreshes only after the backend confirms this deletion
              and its audit-log cascade.
            </p>
          )}
          {mutation.error && (
            <p role="alert" className="text-sm text-destructive">
              {triggerWriteError(mutation.error)}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={mode === "delete" ? "destructive" : "default"}
            >
              {mutation.isPending
                ? "Saving…"
                : mode === "delete"
                  ? "Confirm delete"
                  : "Save"}
            </Button>
          </div>
        </fieldset>
      </form>
    </DialogContent>
  );
}
