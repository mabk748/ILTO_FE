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
import {
  certificationStatuses,
  deadlinePriorities,
  deadlineStatuses,
  initialDraft,
  removeWorkResource,
  saveWorkResource,
  workWriteError,
  type WorkDraft,
  type WorkTarget,
} from "../work-editor.ts";

function targetLabel(target: WorkTarget): string {
  if (!target.record) return target.kind;
  return target.kind === "deadline" ? target.record.title : target.record.name;
}

export default function WorkResourceControls({
  target,
}: {
  target: WorkTarget;
}) {
  const [mode, setMode] = useState<"edit" | "delete" | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const label = targetLabel(target);
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
  target: WorkTarget;
  mode: "edit" | "delete";
  onClose: () => void;
  restoreFocus: () => void;
}) {
  const id = useId();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<WorkDraft>(() => initialDraft(target));
  const mutation = useMutation({
    mutationFn: async () =>
      mode === "delete"
        ? removeWorkResource(target)
        : saveWorkResource(target, values),
    retry: false,
  });
  const change = (key: string, value: string) =>
    setValues((previous) => ({ ...previous, [key]: value }));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await mutation.mutateAsync();
      await Promise.all(
        ["work", "dashboard"].map((domain) =>
          queryClient.invalidateQueries({ queryKey: [domain] }),
        ),
      );
      onClose();
    } catch {
      // Keep the form open and display the confirmed client/server failure.
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
            ? "This record is removed only after the backend confirms the delete request."
            : target.kind === "deadline"
              ? "Dates are converted to UTC. Overdue is derived by the backend; use pending to keep a deadline open."
              : "Dates are optional and are converted to UTC when present. Study hours are stored as numbers."}
        </DialogDescription>
      </DialogHeader>
      <form
        noValidate
        onSubmit={(event) => void submit(event)}
        className="space-y-4"
      >
        <fieldset disabled={mutation.isPending} className="space-y-4">
          {mode === "edit" && target.kind === "deadline" && (
            <>
              {field("title", "Title", "text", true, { maxLength: 200 })}
              {field("project_or_context", "Project or context", "text", true, {
                maxLength: 300,
              })}
              {field("due_date", "Due date and time", "datetime-local", true)}
              {select("priority", "Priority", deadlinePriorities)}
              {select("status", "Status", deadlineStatuses)}
              {field("notes", "Notes", "text", false, { maxLength: 4000 })}
            </>
          )}
          {mode === "edit" && target.kind === "certification" && (
            <>
              {field("name", "Name", "text", true, { maxLength: 200 })}
              {field("provider", "Provider", "text", true, { maxLength: 200 })}
              {select("status", "Status", certificationStatuses)}
              {field("exam_date", "Exam date and time", "datetime-local")}
              {field("expiry_date", "Expiry date and time", "datetime-local")}
              {field(
                "study_hours_logged",
                "Logged study hours",
                "number",
                true,
                {
                  min: 0,
                  max: 100_000,
                  step: "0.01",
                },
              )}
              {field(
                "study_hours_target",
                "Target study hours",
                "number",
                true,
                {
                  min: 0,
                  max: 100_000,
                  step: "0.01",
                },
              )}
            </>
          )}
          {mode === "delete" && (
            <p className="text-sm text-muted-foreground">
              No local state changes until the backend returns a successful 204
              response.
            </p>
          )}
          {mutation.error && (
            <p role="alert" className="text-sm text-destructive">
              {workWriteError(mutation.error)}
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
