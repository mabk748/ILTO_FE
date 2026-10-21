import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type FormEvent,
} from "react";
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
import { useProjectsViewData } from "../projects-data.ts";
import { useProjectScope } from "../project-scope.ts";
import {
  initialDraft,
  priorities,
  projectWriteError,
  removeResource,
  saveResource,
  setWorkstreamArchived,
  statuses,
  type EditorTarget,
} from "../project-editor.ts";
import { useProjectsMutation } from "../use-projects-mutation.ts";
import { TASK_CATEGORIES, TASK_CATEGORY_LABELS } from "../task-model.ts";

export default function ResourceControls({
  target,
  autoOpen = false,
  triggerVariant,
}: {
  target: EditorTarget;
  autoOpen?: boolean;
  triggerVariant?: ComponentProps<typeof Button>["variant"];
}) {
  const [mode, setMode] = useState<"edit" | "delete" | "archive" | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const openedAutomatically = useRef(false);
  const { data, isError, isPending } = useProjectsViewData();
  const disabled =
    isError ||
    isPending ||
    (!target.record && target.kind !== "project" && !data?.projects.length);
  const label = target.record
    ? "name" in target.record
      ? target.record.name
      : target.record.title
    : target.kind;
  useEffect(() => {
    if (autoOpen && !disabled && !openedAutomatically.current) {
      openedAutomatically.current = true;
      setMode("edit");
    }
  }, [autoOpen, disabled]);
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={target.record ? "outline" : (triggerVariant ?? "default")}
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
        {target.record && target.kind !== "workstream" && (
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
        {target.kind === "workstream" && target.record && (
          <Button
            size="sm"
            variant="outline"
            aria-label={`${target.record.status === "active" ? "Archive" : "Reactivate"} workstream: ${label}`}
            onClick={(event) => {
              trigger.current = event.currentTarget;
              setMode("archive");
            }}
          >
            {target.record.status === "active" ? "Archive" : "Reactivate"}
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
  mode: "edit" | "delete" | "archive";
  onClose: () => void;
  restoreFocus: () => void;
}) {
  // Compare PATCH fields against the record when this form opened, not a later
  // background refresh (which could otherwise turn untouched fields into edits).
  const [target] = useState(initialTarget);
  const id = useId();
  const { data, isError, isPending } = useProjectsViewData();
  const projectId = useProjectScope();
  const [values, setValues] = useState<Record<string, string>>(() => ({
    ...initialDraft(target),
    ...(!target.record && target.kind !== "project" && projectId !== undefined
      ? { project_id: projectId }
      : {}),
  }));
  const mutation = useProjectsMutation(
    async () => {
      if (mode === "delete") return removeResource(target);
      if (mode === "archive") {
        if (target.kind !== "workstream")
          throw new Error("Only Workstreams can be archived here.");
        return setWorkstreamArchived(target);
      }
      if (!data || isError)
        throw new Error("Refresh Projects data before saving.");
      if (
        target.kind !== "project" &&
        !data.projects.some((p) => p.id === values.project_id)
      )
        throw new Error("Choose an existing project.");
      return saveResource(target, values, data.sprints, data.workstreams);
    },
    { invalidateHorizon: target.kind === "milestone" },
  );
  const change = (key: string, value: string) =>
    setValues((previous) => ({
      ...previous,
      [key]: value,
      ...(key === "project_id" &&
      (target.kind === "task" || target.kind === "sprint")
        ? { sprint_id: "", workstream_id: "" }
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
  const changingWorkstreamStatus =
    mode === "archive" && target.kind === "workstream" && target.record;
  const actionLabel = changingWorkstreamStatus
    ? changingWorkstreamStatus.status === "active"
      ? "Archive"
      : "Reactivate"
    : null;
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
          {actionLabel ??
            (mode === "delete"
              ? "Delete"
              : target.record
                ? "Edit"
                : "Create")}{" "}
          {target.kind}
        </DialogTitle>
        <DialogDescription>
          {mode === "delete"
            ? `Delete “${recordName}”? This cannot be undone. Dependents are never deleted automatically.`
            : changingWorkstreamStatus
              ? changingWorkstreamStatus.status === "active"
                ? `Archive “${recordName}”? Existing Task and Sprint assignments stay in place, but no new records can be assigned until it is reactivated.`
                : `Reactivate “${recordName}”? It will become available for new Task and Sprint assignments.`
              : "Changes are saved only after confirmation from the backend."}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <fieldset disabled={mutation.isPending} className="space-y-4">
          {mode === "edit" && (
            <>
              {target.kind !== "project" &&
                !(target.kind === "workstream" && target.record) &&
                select("project_id", "Project", [
                  { value: "", label: "Choose a project" },
                  ...(data?.projects ?? []).map((p) => ({
                    value: p.id,
                    label: p.name,
                  })),
                ])}
              {field(
                target.kind === "project" ||
                  target.kind === "sprint" ||
                  target.kind === "workstream"
                  ? "name"
                  : "title",
                target.kind === "project" ||
                  target.kind === "sprint" ||
                  target.kind === "workstream"
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
                target.kind !== "workstream" &&
                select(
                  "status",
                  "Status",
                  statuses[target.kind].map((value) => ({
                    value,
                    label: value.replaceAll("_", " "),
                  })),
                )}
              {(target.kind === "sprint" || target.kind === "task") &&
                select(
                  "workstream_id",
                  "Workstream (optional)",
                  [
                    { value: "", label: "No workstream" },
                    ...(data?.workstreams ?? [])
                      .filter(
                        (workstream) =>
                          workstream.project_id === values.project_id &&
                          (workstream.status === "active" ||
                            workstream.id === target.record?.workstream_id),
                      )
                      .map((workstream) => ({
                        value: workstream.id,
                        label: `${workstream.name}${workstream.status === "archived" ? " (archived — current)" : ""}`,
                      })),
                  ],
                  false,
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
                    "category",
                    "Category",
                    TASK_CATEGORIES.map((value) => ({
                      value,
                      label: TASK_CATEGORY_LABELS[value],
                    })),
                  )}
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
                  <div className="space-y-1">
                    <Label htmlFor={`${id}-acceptance-criteria`}>
                      Acceptance criteria (optional)
                    </Label>
                    <textarea
                      id={`${id}-acceptance-criteria`}
                      rows={5}
                      maxLength={10_000}
                      className="w-full rounded-md border bg-background p-2 text-sm"
                      value={values.acceptance_criteria}
                      onChange={(event) =>
                        change("acceptance_criteria", event.target.value)
                      }
                      placeholder="Describe the measurable conditions for completing this task."
                    />
                  </div>
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
              {target.kind === "workstream" && (
                <p className="text-xs text-muted-foreground">
                  Workstreams are persistent areas of responsibility. Sprints
                  remain separate, time-bounded delivery cycles.
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
              variant={
                mode === "delete" ||
                (changingWorkstreamStatus &&
                  changingWorkstreamStatus.status === "active")
                  ? "destructive"
                  : "default"
              }
              disabled={mode === "edit" && (isError || isPending)}
            >
              {mutation.isPending
                ? "Saving…"
                : mode === "delete"
                  ? "Confirm delete"
                  : actionLabel
                    ? `Confirm ${actionLabel.toLowerCase()}`
                    : "Save"}
            </Button>
          </div>
        </fieldset>
      </form>
    </DialogContent>
  );
}
