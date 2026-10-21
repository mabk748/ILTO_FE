import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { ApiError } from "@/lib/api/errors.ts";
import {
  deleteProjectWithContents,
  getProjectDeleteImpact,
  type ProjectDeletedCounts,
  type ProjectDeleteFocusSessionImpact,
  type ProjectUnlinkedCounts,
  type ProjectDeleteResult,
} from "@/lib/api/projects.ts";
import {
  projectDeleteImpactKey,
  projectDeletionError,
  projectDeletionConflict,
  refreshAfterProjectDeletion,
} from "../project-deletion.ts";

const DELETED_LABELS: Record<keyof ProjectDeletedCounts, string> = {
  tasks: "Tasks",
  sprints: "Sprints",
  workstreams: "Workstreams",
  milestones: "Milestones",
  repositories: "Repositories",
  focus_sessions: "FocusSessions",
};
const UNLINKED_LABELS: Record<keyof ProjectUnlinkedCounts, string> = {
  learning_goals: "Learning goals",
  study_schedules: "Study schedules",
  study_sessions: "Study sessions",
};

function Counts({
  title,
  counts,
  labels,
}: {
  title: string;
  counts: ProjectDeletedCounts | ProjectUnlinkedCounts;
  labels: Record<string, string>;
}) {
  const id = useId();
  const rows = Object.entries(counts).filter(
    ([key, value]) => key in labels && value > 0,
  );
  return (
    <section aria-labelledby={id} className="space-y-2">
      <h3 id={id} className="font-semibold">
        {title}
      </h3>
      {rows.length ? (
        <ul className="list-disc pl-5 space-y-1">
          {rows.map(([key, value]) => (
            <li key={key}>
              {labels[key]}: {value}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">No related records.</p>
      )}
    </section>
  );
}

function FocusSessionCounts({
  counts,
}: {
  counts: ProjectDeleteFocusSessionImpact;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="space-y-2">
      <h3 id={id} className="font-semibold">
        FocusSession history
      </h3>
      {counts.total > 0 ? (
        <>
          <ul className="list-disc pl-5 space-y-1">
            <li>Total: {counts.total}</li>
            <li>Active: {counts.active}</li>
            <li>Paused: {counts.paused}</li>
            <li>Finished: {counts.finished}</li>
          </ul>
          {counts.finished > 0 && (
            <p className="text-muted-foreground">
              Finished FocusSession history will be permanently deleted with
              this Project.
            </p>
          )}
        </>
      ) : (
        <p className="text-muted-foreground">No FocusSession history.</p>
      )}
    </section>
  );
}

/** The parent must outlive the project row so refetch cannot remove the result. */
export default function ProjectDeleteDialog({
  project,
  onClose,
  restoreFocus,
}: {
  project: { id: string; name: string };
  onClose: () => void;
  restoreFocus: () => void;
}) {
  const id = useId();
  const client = useQueryClient();
  const [typedName, setTypedName] = useState("");
  // Each dialog instance must start from a network preview, never a prior token.
  const [previewInstance] = useState(
    () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
  );
  const [previewRevision, setPreviewRevision] = useState(0);
  const [requiresReconfirmation, setRequiresReconfirmation] = useState(false);
  const [conflict, setConflict] =
    useState<ReturnType<typeof projectDeletionConflict>>(null);
  const [result, setResult] = useState<ProjectDeleteResult | null>(null);
  const [missing, setMissing] = useState(false);
  const submitting = useRef(false);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const previewSelector = useMemo(() => {
    let reviewed: Awaited<ReturnType<typeof getProjectDeleteImpact>> | null =
      null;
    const selector = (
      data: Awaited<ReturnType<typeof getProjectDeleteImpact>>,
    ) => {
      reviewed ??= data;
      return reviewed;
    };
    return Object.assign(selector, { revision: previewRevision });
  }, [previewRevision]);
  const preview = useQuery({
    queryKey: [
      ...projectDeleteImpactKey(project.id),
      previewInstance,
      previewRevision,
    ],
    queryFn: ({ signal }) => getProjectDeleteImpact(project.id, { signal }),
    enabled: !result && !missing,
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    select: previewSelector,
  });
  const refreshPreview = (reconfirm = false) => {
    if (reconfirm) {
      setTypedName("");
      setRequiresReconfirmation(true);
    }
    setPreviewRevision((revision) => revision + 1);
  };
  const mutation = useMutation({
    mutationFn: ({ name, token }: { name: string; token: string }) =>
      deleteProjectWithContents(project.id, name, token),
    retry: false,
    onSuccess: async (response) => {
      setResult(response);
      await refreshAfterProjectDeletion(client);
    },
    onError: async (error) => {
      if (error instanceof ApiError && error.status === 404) {
        setMissing(true);
        await client.invalidateQueries({ queryKey: ["projects"] });
      } else if (error instanceof ApiError && error.status === 409) {
        setConflict(projectDeletionConflict(error));
        refreshPreview(true);
      } else {
        setConflict(null);
      }
    },
    onSettled: () => {
      submitting.current = false;
    },
  });
  useEffect(() => {
    if (preview.error instanceof ApiError && preview.error.status === 404) {
      void client.invalidateQueries({ queryKey: ["projects"] });
    }
  }, [client, preview.error]);
  useEffect(() => {
    if (result) resultHeading.current?.focus();
  }, [result]);

  const impact = preview.data ?? null;
  const unavailable =
    missing ||
    (preview.error instanceof ApiError && preview.error.status === 404);
  const blocked = Boolean(
    impact?.blocking_dependencies.length ||
    impact?.focus_sessions.has_unfinished_sessions,
  );
  const canDelete = Boolean(
    impact &&
    !preview.isFetching &&
    !preview.isError &&
    !unavailable &&
    !blocked &&
    !result &&
    !mutation.isPending &&
    !requiresReconfirmation &&
    typedName === impact.project.name,
  );
  const close = () => {
    if (!submitting.current && !mutation.isPending) onClose();
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canDelete || !impact || submitting.current) return;
    submitting.current = true;
    mutation.mutate({
      name: typedName,
      token: impact.confirmation_token,
    });
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto"
        showCloseButton={!mutation.isPending}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          cancelButton.current?.focus();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          restoreFocus();
        }}
        onEscapeKeyDown={(event) => {
          if (submitting.current || mutation.isPending) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (submitting.current || mutation.isPending || result)
            event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle ref={resultHeading} tabIndex={-1}>
            {result ? "Project deleted" : "Delete project and contents"}
          </DialogTitle>
          <DialogDescription className="break-words">
            {result ? (
              `“${result.project.name}” was deleted. These are the backend's final counts.`
            ) : (
              <>
                Delete “{impact?.project.name ?? project.name}”? The Project
                itself and the contents listed below will be permanently
                deleted. This action cannot be undone.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        {result ? (
          <div className="space-y-5 text-sm">
            <Counts
              title="Deleted"
              counts={result.deleted}
              labels={DELETED_LABELS}
            />
            <Counts
              title="Preserved and unlinked"
              counts={result.unlinked}
              labels={UNLINKED_LABELS}
            />
            {mutation.isPending && (
              <p role="status">Refreshing affected views…</p>
            )}
            <Button
              className="w-full sm:w-auto"
              disabled={mutation.isPending}
              onClick={close}
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5 text-sm">
            {preview.isFetching && (
              <p role="status">Loading deletion impact…</p>
            )}
            {preview.error && (
              <p role="alert">{projectDeletionError(preview.error)}</p>
            )}
            {mutation.error && (
              <p role="alert">{projectDeletionError(mutation.error)}</p>
            )}
            {conflict === "stale_preview" && (
              <p role="status">
                The preview was refreshed. Review the current impact and confirm
                the Project name again.
              </p>
            )}
            {conflict === "unfinished_focus_sessions" && (
              <p role="status">
                The preview was refreshed because unfinished FocusSessions were
                found. Review the blocker before continuing.
              </p>
            )}
            {impact &&
              !preview.isFetching &&
              !preview.isError &&
              !unavailable && (
                <>
                  <Counts
                    title="Will be permanently deleted"
                    counts={impact.will_delete}
                    labels={DELETED_LABELS}
                  />
                  <FocusSessionCounts counts={impact.focus_sessions} />
                  <section className="space-y-2">
                    <Counts
                      title="Will be preserved but unlinked"
                      counts={impact.will_unlink}
                      labels={UNLINKED_LABELS}
                    />
                    <p>
                      These Learning records will remain, but their Project link
                      will be removed.
                    </p>
                  </section>
                  <p className="text-muted-foreground">
                    The backend checks dependencies again when deleting. Final
                    counts may differ from this preview.
                  </p>
                  {blocked && (
                    <div role="alert" className="space-y-2">
                      <p className="font-semibold">
                        This Project cannot currently be deleted safely.
                      </p>
                      {impact.blocking_dependencies.map((dependency, index) => (
                        <p key={index}>{dependency.reason}</p>
                      ))}
                      {impact.focus_sessions.has_unfinished_sessions &&
                        !impact.blocking_dependencies.some(
                          (dependency) =>
                            dependency.resource === "unfinished_focus_sessions",
                        ) && (
                          <p>
                            Finish all active or paused FocusSessions before
                            deleting this Project.
                          </p>
                        )}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label
                      htmlFor={id}
                      className="whitespace-pre-wrap break-words"
                    >
                      Type {impact.project.name} to confirm
                    </Label>
                    <Input
                      id={id}
                      value={typedName}
                      onChange={(event) => {
                        setTypedName(event.target.value);
                        setRequiresReconfirmation(false);
                        setConflict(null);
                      }}
                      disabled={mutation.isPending || blocked}
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      aria-describedby={`${id}-help`}
                    />
                    <p id={`${id}-help`} className="text-muted-foreground">
                      {blocked
                        ? "Deletion is disabled while the backend reports a blocking dependency."
                        : requiresReconfirmation
                          ? "Review the refreshed impact, then type the exact Project name again."
                          : "The name must match exactly, including case and spaces."}
                    </p>
                  </div>
                </>
              )}
            {mutation.isPending && (
              <p role="status">
                {preview.isFetching
                  ? "Checking updated dependencies…"
                  : "Deleting project and contents…"}
              </p>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <Button
                ref={cancelButton}
                type="button"
                variant="outline"
                disabled={mutation.isPending}
                onClick={close}
              >
                Cancel
              </Button>
              {!unavailable && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={preview.isFetching || mutation.isPending}
                  onClick={() => void refreshPreview()}
                >
                  Refresh preview
                </Button>
              )}
              <Button type="submit" variant="destructive" disabled={!canDelete}>
                Delete project and contents
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
