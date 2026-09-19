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
import type { Trip } from "@/lib/api/types.ts";
import {
  documentTypes,
  eventTypes,
  initialDraft,
  logisticsWriteError,
  removeLogisticsResource,
  saveLogisticsResource,
  tripStatuses,
  type LogisticsDraft,
  type LogisticsTarget,
} from "../logistics-editor.ts";

function targetLabel(target: LogisticsTarget): string {
  if (!target.record) return target.kind;
  return target.kind === "event" ? target.record.title : target.record.name;
}

export default function LogisticsResourceControls({
  target,
  trips = [],
}: {
  target: LogisticsTarget;
  trips?: Trip[];
}) {
  const [mode, setMode] = useState<"edit" | "delete" | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const label = targetLabel(target);
  const kind = target.kind;
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={target.record ? "outline" : "default"}
          aria-label={
            target.record ? `Edit ${kind}: ${label}` : `Create ${kind}`
          }
          onClick={(event) => {
            trigger.current = event.currentTarget;
            setMode("edit");
          }}
        >
          {target.record ? "Edit" : `Create ${kind}`}
        </Button>
        {target.record && (
          <Button
            size="sm"
            variant="outline"
            aria-label={`Delete ${kind}: ${label}`}
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
            trips={trips}
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
  trips,
  mode,
  onClose,
  restoreFocus,
}: {
  target: LogisticsTarget;
  trips: Trip[];
  mode: "edit" | "delete";
  onClose: () => void;
  restoreFocus: () => void;
}) {
  const id = useId();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<LogisticsDraft>(() =>
    initialDraft(target),
  );
  const mutation = useMutation({
    mutationFn: async () =>
      mode === "delete"
        ? removeLogisticsResource(target)
        : saveLogisticsResource(target, values),
    retry: false,
  });
  const change = (key: string, value: string | boolean) =>
    setValues((previous) => ({ ...previous, [key]: value }));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await mutation.mutateAsync();
      await queryClient.invalidateQueries({ queryKey: ["logistics"] });
      onClose();
    } catch {
      // Keep this form open so the owner can correct or retry the confirmed failure.
    }
  };
  const field = (
    key: string,
    label: string,
    type = "text",
    required = false,
    extra?: { min?: string; step?: string },
  ) => (
    <div className="space-y-1" key={key}>
      <Label htmlFor={`${id}-${key}`}>{label}</Label>
      <Input
        id={`${id}-${key}`}
        type={type}
        required={required}
        min={extra?.min}
        step={extra?.step}
        value={typeof values[key] === "string" ? values[key] : ""}
        onChange={(event) => change(key, event.target.value)}
      />
    </div>
  );
  const select = (
    key: string,
    label: string,
    options: readonly string[],
    allowBlank = false,
  ) => (
    <div className="space-y-1" key={key}>
      <Label htmlFor={`${id}-${key}`}>{label}</Label>
      <select
        id={`${id}-${key}`}
        className="bg-background h-9 w-full rounded-md border px-3 text-sm"
        value={typeof values[key] === "string" ? values[key] : ""}
        required={!allowBlank}
        onChange={(event) => change(key, event.target.value)}
      >
        {allowBlank && <option value="">No linked trip</option>}
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replaceAll("_", " ")}
          </option>
        ))}
      </select>
    </div>
  );
  const kind = target.kind;

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
            ? "The record is removed only after the backend confirms this deletion."
            : "Date and time values are converted to UTC when saved. Derived document status is supplied by the backend."}
        </DialogDescription>
      </DialogHeader>
      <form
        noValidate
        onSubmit={(event) => void submit(event)}
        className="space-y-4"
      >
        <fieldset disabled={mutation.isPending} className="space-y-4">
          {mode === "edit" && kind === "trip" && (
            <>
              {field("name", "Name", "text", true)}
              {field("destination", "Destination", "text", true)}
              {select("status", "Status", tripStatuses)}
              {field(
                "departure_date",
                "Departure date and time",
                "datetime-local",
                true,
              )}
              {field(
                "return_date",
                "Return date and time",
                "datetime-local",
                true,
              )}
              {field("tags", "Tags (comma-separated)")}
              {field("notes", "Notes")}
            </>
          )}
          {mode === "edit" && kind === "document" && (
            <>
              {field("name", "Name", "text", true)}
              {select("type", "Type", documentTypes)}
              {field("issuer", "Issuer")}
              {field("issue_date", "Issue date and time", "datetime-local")}
              {field("expiry_date", "Expiry date and time", "datetime-local")}
              {field("renewal_lead_days", "Renewal lead days", "number", true, {
                min: "0",
                step: "1",
              })}
              {field("notes", "Notes")}
            </>
          )}
          {mode === "edit" && kind === "event" && (
            <>
              {field("title", "Title", "text", true)}
              {select("type", "Type", eventTypes)}
              {field("date", "Event date and time", "datetime-local", true)}
              {field("end_date", "End date and time", "datetime-local")}
              <div className="space-y-1">
                <Label htmlFor={`${id}-linked_trip_id`}>Linked trip</Label>
                <select
                  id={`${id}-linked_trip_id`}
                  className="bg-background h-9 w-full rounded-md border px-3 text-sm"
                  value={String(values.linked_trip_id ?? "")}
                  onChange={(event) =>
                    change("linked_trip_id", event.target.value)
                  }
                >
                  <option value="">No linked trip</option>
                  {trips.map((trip) => (
                    <option key={trip.id} value={trip.id}>
                      {trip.name} — {trip.destination}
                    </option>
                  ))}
                </select>
              </div>
              <label
                className="flex items-center gap-2 text-sm"
                htmlFor={`${id}-completed`}
              >
                <input
                  id={`${id}-completed`}
                  type="checkbox"
                  checked={values.completed === true}
                  onChange={(event) =>
                    change("completed", event.target.checked)
                  }
                />
                Completed
              </label>
              {field("notes", "Notes")}
            </>
          )}
          {mode === "delete" && (
            <p className="text-sm text-muted-foreground">
              Related records can cause the backend to reject this deletion.
            </p>
          )}
          {mutation.error && (
            <p role="alert" className="text-sm text-destructive">
              {logisticsWriteError(mutation.error)}
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
