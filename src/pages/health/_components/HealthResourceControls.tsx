import { useEffect, useId, useRef, useState, type FormEvent } from "react";
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
import type { TrainingPlan } from "@/lib/api/types.ts";
import {
  healthWriteError,
  initialDraft,
  planStatuses,
  removeHealthResource,
  saveHealthResource,
  workoutTypes,
  type HealthDraft,
  type HealthTarget,
} from "../health-editor.ts";

function targetLabel(target: HealthTarget): string {
  if (!target.record) return target.kind;
  if (target.kind === "metric")
    return new Date(target.record.date).toLocaleString();
  return target.record.name;
}

export default function HealthResourceControls({
  target,
  plans = [],
  autoOpen = false,
}: {
  target: HealthTarget;
  plans?: TrainingPlan[];
  autoOpen?: boolean;
}) {
  const [mode, setMode] = useState<"edit" | "delete" | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const openedAutomatically = useRef(false);
  const label = targetLabel(target);
  useEffect(() => {
    if (autoOpen && !openedAutomatically.current) {
      openedAutomatically.current = true;
      setMode("edit");
    }
  }, [autoOpen]);
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={target.record ? "outline" : "default"}
          aria-label={
            target.record
              ? `Edit ${target.kind}: ${label}`
              : `Create ${target.kind}`
          }
          onClick={(event) => {
            trigger.current = event.currentTarget;
            setMode("edit");
          }}
        >
          {target.record ? "Edit" : `Create ${target.kind}`}
        </Button>
        {target.record && (
          <Button
            size="sm"
            variant="outline"
            aria-label={`Delete ${target.kind}: ${label}`}
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
            plans={plans}
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
  plans,
  mode,
  onClose,
  restoreFocus,
}: {
  target: HealthTarget;
  plans: TrainingPlan[];
  mode: "edit" | "delete";
  onClose: () => void;
  restoreFocus: () => void;
}) {
  const id = useId();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<HealthDraft>(() => initialDraft(target));
  const mutation = useMutation({
    mutationFn: async () =>
      mode === "delete"
        ? removeHealthResource(target)
        : saveHealthResource(
            target,
            values,
            plans.map((plan) => plan.id),
          ),
    retry: false,
  });

  const change = (key: string, value: string) =>
    setValues((previous) => ({ ...previous, [key]: value }));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await mutation.mutateAsync();
      await Promise.all(
        ["health", "dashboard", "intelligence"].map((domain) =>
          queryClient.invalidateQueries({ queryKey: [domain] }),
        ),
      );
      onClose();
    } catch {
      // Keep the form open so the user can fix local validation or retry a failed write.
    }
  };

  const field = (
    key: string,
    label: string,
    type = "text",
    required = false,
    extra?: { min?: number; max?: number; step?: string; maxLength?: number },
  ) => (
    <div className="space-y-1" key={key}>
      <Label htmlFor={`${id}-${key}`}>{label}</Label>
      <Input
        id={`${id}-${key}`}
        type={type}
        required={required}
        min={extra?.min}
        max={extra?.max}
        step={extra?.step}
        maxLength={extra?.maxLength}
        value={values[key] ?? ""}
        onChange={(event) => change(key, event.target.value)}
      />
    </div>
  );
  const select = (key: string, label: string, options: readonly string[]) => (
    <div className="space-y-1" key={key}>
      <Label htmlFor={`${id}-${key}`}>{label}</Label>
      <select
        id={`${id}-${key}`}
        className="bg-background h-9 w-full rounded-md border px-3 text-sm"
        value={values[key] ?? ""}
        required
        onChange={(event) => change(key, event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replaceAll("_", " ")}
          </option>
        ))}
      </select>
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
          {target.kind}
        </DialogTitle>
        <DialogDescription>
          {mode === "delete"
            ? "The backend confirms deletion. Deleting a plan preserves its workouts by clearing their plan link."
            : "Health values are saved only after the backend confirms them. Date and time are converted to UTC."}
        </DialogDescription>
      </DialogHeader>
      <form
        noValidate
        onSubmit={(event) => void submit(event)}
        className="space-y-4"
      >
        <fieldset disabled={mutation.isPending} className="space-y-4">
          {mode === "edit" && target.kind === "plan" && (
            <>
              {field("name", "Name", "text", true, { maxLength: 200 })}
              {field("goal", "Goal", "text", true, { maxLength: 4000 })}
              {field("weeks_total", "Total weeks", "number", true, {
                min: 1,
                max: 520,
                step: "1",
              })}
              {field("week_current", "Current week", "number", true, {
                min: 1,
                max: 520,
                step: "1",
              })}
              {select("status", "Status", planStatuses)}
              <p className="text-xs text-muted-foreground">
                Progress is calculated from current week / total weeks and
                capped at 100%.
              </p>
            </>
          )}
          {mode === "edit" && target.kind === "workout" && (
            <>
              <div className="space-y-1">
                <Label htmlFor={`${id}-plan_id`}>Training plan</Label>
                <select
                  id={`${id}-plan_id`}
                  className="bg-background h-9 w-full rounded-md border px-3 text-sm"
                  value={values.plan_id ?? ""}
                  onChange={(event) => change("plan_id", event.target.value)}
                >
                  <option value="">Unassigned</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </select>
              </div>
              {select("type", "Type", workoutTypes)}
              {field("name", "Name", "text", true, { maxLength: 200 })}
              {field("duration_minutes", "Duration (minutes)", "number", true, {
                min: 0,
                max: 1440,
                step: "1",
              })}
              {field("rpe", "RPE (1–10)", "number", true, {
                min: 1,
                max: 10,
                step: "1",
              })}
              {field(
                "completed_at",
                "Completed date and time",
                "datetime-local",
                true,
              )}
              {field("notes", "Notes", "text", false, { maxLength: 4000 })}
            </>
          )}
          {mode === "edit" && target.kind === "metric" && (
            <>
              {field("date", "Metric date and time", "datetime-local", true)}
              {field("weight_kg", "Weight (kg)", "number", false, {
                min: 0.01,
                max: 1000,
                step: "0.01",
              })}
              {field("sleep_hours", "Sleep (hours)", "number", false, {
                min: 0,
                max: 24,
                step: "0.01",
              })}
              {field("resting_hr", "Resting heart rate", "number", false, {
                min: 1,
                max: 300,
                step: "1",
              })}
              {field("hrv", "HRV (ms)", "number", false, {
                min: 0,
                max: 10000,
                step: "0.01",
              })}
              {field("steps", "Steps", "number", false, {
                min: 0,
                max: 1_000_000,
                step: "1",
              })}
              {field(
                "calories_consumed",
                "Calories consumed",
                "number",
                false,
                { min: 0, max: 100_000, step: "1" },
              )}
              <p className="text-xs text-muted-foreground">
                At least one measurement is required. Leave a field blank to
                clear it when editing.
              </p>
            </>
          )}
          {mode === "delete" && (
            <p className="text-sm text-muted-foreground">
              This action waits for a confirmed 204 response and does not change
              the list optimistically.
            </p>
          )}
          {mutation.error && (
            <p role="alert" className="text-sm text-destructive">
              {healthWriteError(mutation.error)}
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
