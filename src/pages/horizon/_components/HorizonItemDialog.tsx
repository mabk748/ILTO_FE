import { useState, type FormEvent } from "react";
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
import { useTimeZone } from "@/components/providers/settings-context.ts";
import {
  createHorizonItem,
  deleteHorizonItem,
  updateHorizonItem,
} from "@/lib/api/horizon.ts";
import type { HorizonEntry } from "@/lib/api/types.ts";
import {
  buildHorizonInput,
  changedHorizonFields,
  horizonDraft,
  horizonWriteError,
  type HorizonDraft,
} from "../horizon-editor.ts";

export type HorizonItemDialogMode = "create" | "edit" | "delete";

export default function HorizonItemDialog({
  mode,
  entry,
  onClose,
}: {
  mode: HorizonItemDialogMode;
  entry?: HorizonEntry;
  onClose: () => void;
}) {
  const timeZone = useTimeZone();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<HorizonDraft>(() =>
    horizonDraft(entry, timeZone),
  );
  const mutation = useMutation({
    retry: false,
    mutationFn: async () => {
      if (mode === "delete") {
        if (!entry) throw new Error("Select a saved calendar block first.");
        return deleteHorizonItem(entry.source_id);
      }
      const input = buildHorizonInput(values, timeZone);
      return entry
        ? updateHorizonItem(entry.source_id, changedHorizonFields(input, entry))
        : createHorizonItem(input);
    },
  });
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await mutation.mutateAsync();
      await queryClient.invalidateQueries({ queryKey: ["horizon"] });
      onClose();
    } catch {
      // Keep the form open with its values and confirmed error.
    }
  };
  const change = <K extends keyof HorizonDraft>(
    key: K,
    value: HorizonDraft[K],
  ) => setValues((previous) => ({ ...previous, [key]: value }));
  const switchAllDay = (allDay: boolean) => {
    setValues((previous) => ({
      ...previous,
      all_day: allDay,
      starts_at: allDay
        ? previous.starts_at.slice(0, 10)
        : previous.starts_at.includes("T")
          ? previous.starts_at.slice(0, 16)
          : `${previous.starts_at}T00:00`,
      ends_at: previous.ends_at
        ? allDay
          ? previous.ends_at.slice(0, 10)
          : previous.ends_at.includes("T")
            ? previous.ends_at.slice(0, 16)
            : `${previous.ends_at}T00:00`
        : "",
    }));
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto"
        showCloseButton={!mutation.isPending}
        onEscapeKeyDown={(event) =>
          mutation.isPending && event.preventDefault()
        }
        onInteractOutside={(event) =>
          mutation.isPending && event.preventDefault()
        }
      >
        <DialogHeader>
          <DialogTitle>
            {mode === "create"
              ? "Add calendar block"
              : mode === "edit"
                ? "Edit calendar block"
                : "Delete calendar block"}
          </DialogTitle>
          <DialogDescription>
            {mode === "delete"
              ? "Deletion happens only after the server confirms it."
              : `Times are interpreted in ${timeZone} and saved as UTC instants.`}
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={(event) => void submit(event)}
        >
          <fieldset disabled={mutation.isPending} className="space-y-4">
            {mode !== "delete" ? (
              <>
                <div className="space-y-1">
                  <Label htmlFor="horizon-title">Title</Label>
                  <Input
                    id="horizon-title"
                    required
                    maxLength={200}
                    value={values.title}
                    onChange={(event) => change("title", event.target.value)}
                  />
                </div>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={values.all_day}
                    onChange={(event) => switchAllDay(event.target.checked)}
                  />
                  All-day block
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="horizon-start">Start</Label>
                    <Input
                      id="horizon-start"
                      type={values.all_day ? "date" : "datetime-local"}
                      required
                      value={values.starts_at}
                      onChange={(event) =>
                        change("starts_at", event.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="horizon-end">End (optional)</Label>
                    <Input
                      id="horizon-end"
                      type={values.all_day ? "date" : "datetime-local"}
                      value={values.ends_at}
                      onChange={(event) =>
                        change("ends_at", event.target.value)
                      }
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="horizon-description">
                    Description (optional)
                  </Label>
                  <textarea
                    id="horizon-description"
                    rows={4}
                    maxLength={4000}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={values.description}
                    onChange={(event) =>
                      change("description", event.target.value)
                    }
                  />
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Delete “{entry?.title}”? Domain-backed entries cannot be deleted
                from Horizon.
              </p>
            )}
            {mutation.error && (
              <p role="alert" className="text-sm text-destructive">
                {horizonWriteError(mutation.error)}
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
    </Dialog>
  );
}
