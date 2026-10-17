import { useContext, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { getTasks, updateTask } from "@/lib/api/projects.ts";
import { ApiError } from "@/lib/api/errors.ts";
import type { Task } from "@/lib/api/types.ts";
import { OwnerAuthContext } from "@/components/providers/owner-auth-context.ts";
import { getOwner } from "@/lib/api/auth.ts";
import {
  assertOnline,
  focusError,
  refreshFocus,
  uncertainFocusOutcome,
} from "../focus-data.ts";

/** Only mounted after a server-confirmed finish. Never re-finishes on PATCH retry. */
export default function VerifyTaskDialog({
  task: initialTask,
  onClose,
  onCompleted,
}: {
  task: Task;
  onClose: () => void;
  onCompleted: (message: string) => void;
}) {
  const [task, setTask] = useState(initialTask);
  const [acknowledged, setAcknowledged] = useState(false);
  const [status, setStatus] = useState<"review" | "done">("review");
  const client = useQueryClient();
  const auth = useContext(OwnerAuthContext);
  const mutation = useMutation({
    retry: false,
    networkMode: "always",
    mutationFn: async () => {
      assertOnline();
      if (!acknowledged)
        throw new Error(
          "Acknowledge the criteria before changing Task status.",
        );
      if (auth?.owner && (await getOwner()).username !== auth.owner.username) {
        await auth.checkSession();
        throw new Error("The account changed. No Task update was sent.");
      }
      const latest = (await getTasks({ projectId: task.project_id })).find(
        (item) => item.id === task.id,
      );
      if (!latest)
        throw new Error(
          "The Task is unavailable. The session finish remains confirmed, but no Task update was sent.",
        );
      if (
        latest.status !== task.status ||
        latest.updated_at !== task.updated_at ||
        latest.acceptance_criteria !== task.acceptance_criteria
      ) {
        setTask(latest);
        setAcknowledged(false);
        throw new Error(
          "The Task changed since you reviewed it. Review the latest status and criteria, then acknowledge again. No update was sent.",
        );
      }
      try {
        const saved = await updateTask(task.id, { status });
        if (
          saved.id !== task.id ||
          saved.project_id !== task.project_id ||
          saved.status !== status
        )
          throw new ApiError(
            "The Task update response did not confirm the requested status. Refresh before retrying.",
            "invalid_response",
          );
        return `Session finish confirmed. Task status confirmed as ${status}.`;
      } catch (error) {
        // A lost PATCH response is not proof of failure; only reads reconcile it.
        if (uncertainFocusOutcome(error)) {
          try {
            const observed = (
              await getTasks({ projectId: task.project_id })
            ).find((item) => item.id === task.id);
            if (observed?.status === status)
              return `Session finish confirmed. Refetch confirms Task status is ${status}; the original update response was lost.`;
            if (observed) setTask(observed);
          } catch {
            /* Leave the confirmed finish and unresolved Task update visible. */
          }
        }
        setAcknowledged(false);
        throw error;
      }
    },
    onSettled: () => refreshFocus(client),
    onSuccess: onCompleted,
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose();
      }}
    >
      <DialogContent
        className="max-h-[90vh] overflow-y-auto"
        showCloseButton={!mutation.isPending}
        onEscapeKeyDown={(event) => {
          if (mutation.isPending) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (mutation.isPending) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Confirm Task completion</DialogTitle>
          <DialogDescription>
            The FocusSession is already finished. This separate step changes
            only Task status.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <h3 className="font-semibold">{task.title}</h3>
          <p className="text-sm">
            Current Task status: {task.status.replaceAll("_", " ")}
          </p>
          <h4 className="text-sm font-medium">Acceptance criteria</h4>
          <p className="whitespace-pre-wrap break-words text-sm">
            {task.acceptance_criteria?.trim()
              ? task.acceptance_criteria
              : "No acceptance criteria provided. Review the task description yourself."}
          </p>
          <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
            {task.description}
          </p>
          <fieldset disabled={mutation.isPending} className="space-y-3">
            <label className="block space-y-1 text-sm">
              <span>Task outcome</span>
              <select
                className="w-full rounded border bg-background p-2"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as "review" | "done")
                }
              >
                <option value="review">Ready for review</option>
                <option value="done">Done</option>
              </select>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
              />
              I manually reviewed the task and its free-text criteria. This is
              my acknowledgement, not automated verification.
            </label>
            {mutation.error && (
              <p role="alert" className="text-sm">
                Session finished; Task update not confirmed.{" "}
                {focusError(mutation.error)}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Close without another update
              </Button>
              <Button
                disabled={!acknowledged}
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending ? "Confirming…" : "Confirm Task status"}
              </Button>
            </div>
          </fieldset>
        </div>
      </DialogContent>
    </Dialog>
  );
}
