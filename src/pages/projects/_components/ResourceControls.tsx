import { useId, useRef, useState, type FormEvent } from "react";
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
import { useProjectsData } from "../projects-data.ts";
import {
  initialDraft,
  priorities,
  projectWriteError,
  removeResource,
  saveResource,
  statuses,
  type EditorTarget,
} from "../project-editor.ts";
import { useProjectsMutation } from "../use-projects-mutation.ts";

export default function ResourceControls({ target }: { target: EditorTarget }) {
  const [mode, setMode] = useState<"edit" | "delete" | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const { data, isError, isPending } = useProjectsData();
  const disabled =
    isError ||
    isPending ||
    (!target.record && target.kind !== "project" && !data?.projects.length);
  const label = target.record
    ? "name" in target.record
      ? target.record.name
      : target.record.title
    : target.kind;
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={target.record ? "outline" : "default"}
          disabled={disabled}
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
        onOpenChange={(open) => {
          if (!open) setMode(null);
        }}
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
  target: initialTarget,
  mode,
  onClose,
  restoreFocus,
}: {
  target: EditorTarget;
  mode: "edit" | "delete";
  onClose: () => void;
  restoreFocus: () => void;
}) {
  // Compare PATCH fields against the record when this form opened, not a later
  // background refresh (which could otherwise turn untouched fields into edits).
  const [target] = useState(initialTarget);
  const id = useId();
  const { data, isError, isPending } = useProjectsData();
  const [values, setValues] = useState(() => initialDraft(target));
  const mutation = useProjectsMutation(async () => {
    if (mode === "delete") return removeResource(target);
    if (!data || isError)
      throw new Error("Refresh Projects data before saving.");
    if (
      target.kind !== "project" &&
      !data.projects.some((p) => p.id === values.project_id)
    )
      throw new Error("Choose an existing project.");
    return saveResource(target, values, data.sprints);
  });
  const change = (key: string, value: string) =>
    setValues((previous) => ({
      ...previous,
      [key]: value,
      ...(key === "project_id" && target.kind === "task"
        ? { sprint_id: "" }
        : {}),
    }));
  const field = (
    key: string,
    label: string,
    type = "text",
    required = false,
  ) => (
    <div className="space-y-1" key={key}>
      <Label htmlFor={`${id}-${key}`}>{label}</Label>
      <Input
        id={`${id}-${key}`}
        type={type}
        required={required}
        value={values[key]}
        onChange={(e) => change(key, e.target.value)}
        maxLength={type === "text" ? 200 : undefined}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "any" : undefined}
      />
    </div>
  );
  const select = (
    key: string,
    label: string,
    options: { value: string; label: string }[],
    required = true,
  ) => (
    <div className="space-y-1" key={key}>
      <Label htmlFor={`${id}-${key}`}>{label}</Label>
      <select
        id={`${id}-${key}`}
        className="w-full rounded-md border bg-background p-2 text-sm"
        required={required}
        value={values[key]}
        onChange={(e) => change(key, e.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (mutation.isPending) return;
    mutation.mutate(undefined, { onSuccess: onClose });
  };
  const recordName =
    target.record &&
    ("name" in target.record ? target.record.name : target.record.title);
  return (
    <DialogContent
      showCloseButton={!mutation.isPending}
      className="max-h-[90vh] overflow-y-auto"
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        restoreFocus();
      }}
      onEscapeKeyDown={(e) => {
        if (mutation.isPending) e.preventDefault();
      }}
      onInteractOutside={(e) => {
        if (mutation.isPending) e.preventDefault();
      }}
    >
      <DialogHeader>
        <DialogTitle>
          {mode === "delete" ? "Delete" : target.record ? "Edit" : "Create"}{" "}
          {target.kind}
        </DialogTitle>
        <DialogDescription>
          {mode === "delete"
            ? `Delete “${recordName}”? This cannot be undone. Dependents are never deleted automatically.`
            : "Changes are saved only after confirmation from the backend."}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <fieldset disabled={mutation.isPending} className="space-y-4">
          {mode === "edit" && (
            <>
              {target.kind !== "project" &&
                select("project_id", "Project", [
                  { value: "", label: "Choose a project" },
                  ...(data?.projects ?? []).map((p) => ({
                    value: p.id,
                    label: p.name,
                  })),
                ])}
              {field(
                target.kind === "project" || target.kind === "sprint"
                  ? "name"
                  : "title",
                target.kind === "project" || target.kind === "sprint"
                  ? "Name"
                  : "Title",
                "text",
                true,
              )}
              <div className="space-y-1">
                <Label htmlFor={`${id}-description`}>
                  {target.kind === "sprint" ? "Goal" : "Description"}
                </Label>
                <textarea
                  id={`${id}-description`}
                  className="w-full rounded-md border bg-background p-2 text-sm"
                  value={
                    values[target.kind === "sprint" ? "goal" : "description"]
                  }
                  onChange={(e) =>
                    change(
                      target.kind === "sprint" ? "goal" : "description",
                      e.target.value,
                    )
                  }
                />
              </div>
              {target.kind !== "milestone" &&
                select(
                  "status",
                  "Status",
                  statuses[target.kind].map((value) => ({
                    value,
                    label: value.replaceAll("_", " "),
                  })),
                )}
              {(target.kind === "project" || target.kind === "task") &&
                select(
                  "priority",
                  "Priority",
                  priorities.map((value) => ({ value, label: value })),
                )}
              {(target.kind === "project" || target.kind === "sprint") && (
                <>
                  {field("start_date", "Start date", "date", true)}
                  {field(
                    "end_date",
                    target.kind === "project"
                      ? "End date (optional)"
                      : "End date",
                    "date",
                    target.kind === "sprint",
                  )}
                </>
              )}
              {target.kind === "task" && (
                <>
                  {select(
                    "sprint_id",
                    "Sprint (optional)",
                    [
                      { value: "", label: "No sprint" },
                      ...(data?.sprints ?? [])
                        .filter((s) => s.project_id === values.project_id)
                        .map((s) => ({ value: s.id, label: s.name })),
                    ],
                    false,
                  )}
                  {field("assignee", "Assignee (optional)")}
                  {field("story_points", "Story points", "number", true)}
                </>
              )}
              {target.kind === "milestone" && (
                <>
                  {field("due_date", "Due date", "date", true)}
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={values.completed === "true"}
                      onChange={(e) =>
                        change("completed", String(e.target.checked))
                      }
                    />
                    Completed
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Marking complete records the current time. Unchecking clears
                    completion.
                  </p>
                </>
              )}
              {target.kind === "sprint" && (
                <p className="text-xs text-muted-foreground">
                  Velocity is calculated by the backend from currently completed
                  task points.
                </p>
              )}
            </>
          )}
          {mutation.error && (
            <p role="alert" className="text-sm text-destructive">
              {projectWriteError(mutation.error)}
            </p>
          )}
          {isError && mode === "edit" && (
            <p role="alert">
              Projects data is unavailable. Close this form and refresh before
              saving.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={mode === "delete" ? "destructive" : "default"}
              disabled={mode === "edit" && (isError || isPending)}
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
