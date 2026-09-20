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
  initialDraft,
  learningWriteError,
  removeLearningResource,
  roadmapStatuses,
  saveLearningResource,
  skillLevels,
  type LearningDraft,
  type LearningTarget,
} from "../learning-editor.ts";
import type { LearningRoadmap } from "@/lib/api/types.ts";
import { learningQueryKeys } from "../learning-query-keys.ts";

function targetLabel(
  target: LearningTarget,
  roadmaps: readonly LearningRoadmap[],
): string {
  if (!target.record) {
    if (target.kind === "skill") {
      const roadmap = roadmaps.find((item) => item.id === target.roadmapId);
      return roadmap ? `skill for ${roadmap.name}` : "skill";
    }
    return target.kind;
  }
  if (target.kind === "skill") return target.record.name;
  return target.kind === "roadmap" ? target.record.name : target.record.title;
}

export default function LearningResourceControls({
  target,
  roadmaps = [],
}: {
  target: LearningTarget;
  roadmaps?: readonly LearningRoadmap[];
}) {
  const [mode, setMode] = useState<"edit" | "delete" | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const label = targetLabel(target, roadmaps);
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={target.record ? "outline" : "default"}
          aria-label={
            target.record ? `Edit ${target.kind}: ${label}` : `Create ${label}`
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
            roadmaps={roadmaps}
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
  roadmaps,
  mode,
  onClose,
  restoreFocus,
}: {
  target: LearningTarget;
  roadmaps: readonly LearningRoadmap[];
  mode: "edit" | "delete";
  onClose: () => void;
  restoreFocus: () => void;
}) {
  const id = useId();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<LearningDraft>(() =>
    initialDraft(target),
  );
  const mutation = useMutation({
    mutationFn: async () =>
      mode === "delete"
        ? removeLearningResource(target)
        : saveLearningResource(target, values, roadmaps),
    retry: false,
  });
  const change = (key: string, value: string) =>
    setValues((previous) => ({ ...previous, [key]: value }));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await mutation.mutateAsync();
      if (target.kind === "skill") {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: learningQueryKeys.skills,
            exact: true,
          }),
          queryClient.invalidateQueries({
            queryKey: learningQueryKeys.roadmaps,
            exact: true,
          }),
          queryClient.invalidateQueries({
            queryKey: ["dashboard"],
            exact: true,
          }),
        ]);
      } else {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: learningQueryKeys.all,
          }),
          queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        ]);
      }
      onClose();
    } catch {
      // Keep the form open to show a confirmed validation or server failure.
    }
  };
  const field = (
    key: string,
    label: string,
    type = "text",
    required = false,
    extra?: { maxLength?: number; min?: string; max?: string },
  ) => (
    <div className="space-y-1" key={key}>
      <Label htmlFor={`${id}-${key}`}>{label}</Label>
      <Input
        id={`${id}-${key}`}
        type={type}
        required={required}
        min={extra?.min}
        max={extra?.max}
        step={type === "number" ? "1" : undefined}
        maxLength={extra?.maxLength}
        value={values[key] ?? ""}
        onChange={(event) => change(key, event.target.value)}
      />
    </div>
  );
  const roadmapSelect = (
    <div className="space-y-1">
      <Label htmlFor={`${id}-roadmap_id`}>Roadmap</Label>
      <select
        id={`${id}-roadmap_id`}
        className="bg-background h-9 w-full rounded-md border px-3 text-sm"
        value={values.roadmap_id ?? ""}
        required
        onChange={(event) => change("roadmap_id", event.target.value)}
      >
        <option value="" disabled>
          Choose a roadmap
        </option>
        {roadmaps.map((roadmap) => (
          <option key={roadmap.id} value={roadmap.id}>
            {roadmap.name}
          </option>
        ))}
      </select>
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
  const kind =
    target.kind === "roadmap"
      ? "roadmap"
      : target.kind === "skill"
        ? "skill"
        : "reading entry";

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
          {kind}
        </DialogTitle>
        <DialogDescription>
          {mode === "delete"
            ? "The view refreshes only after the backend confirms this deletion."
            : target.kind === "reading"
              ? "Date and time values are converted to UTC. Leave Completed at blank to save null."
              : target.kind === "skill"
                ? "Choose one of your loaded roadmaps. Skill levels and gap score are saved exactly as entered; roadmap totals remain server-owned."
                : "Only roadmap name, goal, and status are editable; learning progress remains server-owned."}
        </DialogDescription>
      </DialogHeader>
      <form
        noValidate
        onSubmit={(event) => void submit(event)}
        className="space-y-4"
      >
        <fieldset disabled={mutation.isPending} className="space-y-4">
          {mode === "edit" && target.kind === "roadmap" && (
            <>
              {field("name", "Name", "text", true, { maxLength: 200 })}
              {field("goal", "Goal", "text", true, { maxLength: 4000 })}
              {select("status", "Status", roadmapStatuses)}
            </>
          )}
          {mode === "edit" && target.kind === "skill" && (
            <>
              {roadmapSelect}
              {field("name", "Name", "text", true)}
              {field("category", "Category", "text", true)}
              {select("current_level", "Current level", skillLevels)}
              {select("target_level", "Target level", skillLevels)}
              {field("gap_score", "Gap score", "number", true, {
                min: "0",
                max: "100",
              })}
              <div className="space-y-1">
                <Label htmlFor={`${id}-resources`}>
                  Resources (one per line)
                </Label>
                <textarea
                  id={`${id}-resources`}
                  rows={5}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={values.resources ?? ""}
                  onChange={(event) => change("resources", event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Up to 50 nonblank resources; each may contain at most 2,000
                  characters.
                </p>
              </div>
            </>
          )}
          {mode === "edit" && target.kind === "reading" && (
            <>
              {field("title", "Title", "text", true, { maxLength: 500 })}
              {field("author", "Author", "text", true, { maxLength: 200 })}
              {field("pages_total", "Total pages", "number", true, {
                min: "0",
              })}
              {field("pages_read", "Pages read", "number", true, {
                min: "0",
              })}
              {field("words_per_minute", "Words per minute", "number", true, {
                min: "0",
              })}
              {field("started_at", "Started at", "datetime-local", true)}
              {field("completed_at", "Completed at", "datetime-local")}
              {field("tags", "Tags (comma-separated)", "text", false, {
                maxLength: 1019,
              })}
              <p className="text-xs text-muted-foreground">
                Tags are saved as an array of up to 20 short strings, not as one
                comma-separated value.
              </p>
            </>
          )}
          {mode === "delete" && (
            <p className="text-sm text-muted-foreground">
              The backend may reject this delete when related data conflicts.
            </p>
          )}
          {mutation.error && (
            <p role="alert" className="text-sm text-destructive">
              {learningWriteError(mutation.error)}
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
