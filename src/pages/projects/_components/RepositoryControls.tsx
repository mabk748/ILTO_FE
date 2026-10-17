import { useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import type { ProjectRepository } from "@/lib/api/types.ts";
import {
  initialRepositoryDraft,
  removeProjectRepository,
  repositoryWriteError,
  saveProjectRepository,
  useProjectRepositoryMutation,
} from "../project-repositories.ts";

export default function RepositoryControls({
  projectId,
  repository,
}: {
  projectId: string;
  repository?: ProjectRepository;
}) {
  const [mode, setMode] = useState<"edit" | "delete" | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={repository ? "outline" : "default"}
          aria-label={
            repository
              ? `Edit repository: ${repository.label}`
              : "Add repository"
          }
          onClick={(event) => {
            trigger.current = event.currentTarget;
            setMode("edit");
          }}
        >
          {repository ? "Edit" : "Add repository"}
        </Button>
        {repository && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label={`Delete repository: ${repository.label}`}
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
          <RepositoryEditor
            key={mode}
            projectId={projectId}
            repository={repository}
            mode={mode}
            onClose={() => setMode(null)}
            restoreFocus={() => trigger.current?.focus()}
          />
        )}
      </Dialog>
    </>
  );
}

function RepositoryEditor({
  projectId,
  repository,
  mode,
  onClose,
  restoreFocus,
}: {
  projectId: string;
  repository?: ProjectRepository;
  mode: "edit" | "delete";
  onClose: () => void;
  restoreFocus: () => void;
}) {
  const id = useId();
  const [savedRepository] = useState(repository);
  const [draft, setDraft] = useState(() =>
    initialRepositoryDraft(savedRepository),
  );
  const mutation = useProjectRepositoryMutation<void>(projectId, async () => {
    if (mode === "delete") {
      if (!savedRepository)
        throw new Error("Select a saved repository before deleting it.");
      return removeProjectRepository(savedRepository);
    }
    return saveProjectRepository(projectId, draft, savedRepository);
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mutation.isPending) return;
    mutation.mutate(undefined, { onSuccess: onClose });
  };

  return (
    <DialogContent
      showCloseButton={!mutation.isPending}
      className="max-h-[90vh] overflow-y-auto"
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        restoreFocus();
      }}
      onEscapeKeyDown={(event) => {
        if (mutation.isPending) event.preventDefault();
      }}
      onInteractOutside={(event) => {
        if (mutation.isPending) event.preventDefault();
      }}
    >
      <DialogHeader>
        <DialogTitle>
          {mode === "delete"
            ? "Delete repository"
            : savedRepository
              ? "Edit repository"
              : "Add repository"}
        </DialogTitle>
        <DialogDescription>
          {mode === "delete"
            ? `Delete “${savedRepository?.label}” from this project? This cannot be undone.`
            : "The repository link is saved only after confirmation from the backend."}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={submit} className="space-y-4">
        <fieldset disabled={mutation.isPending} className="space-y-4">
          {mode === "edit" && (
            <>
              <div className="space-y-1">
                <Label htmlFor={`${id}-label`}>Label</Label>
                <Input
                  id={`${id}-label`}
                  required
                  maxLength={200}
                  value={draft.label}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      label: event.target.value,
                    }))
                  }
                  placeholder="Frontend"
                />
              </div>

              <div className="space-y-1">
                <Label>Provider</Label>
                <p className="rounded-md border bg-muted px-3 py-2 text-sm">
                  GitHub
                </p>
                <p className="text-xs text-muted-foreground">
                  GitHub is the only provider supported in this release.
                </p>
              </div>

              <div className="space-y-1">
                <Label htmlFor={`${id}-repository-url`}>
                  GitHub repository URL
                </Label>
                <Input
                  id={`${id}-repository-url`}
                  type="url"
                  required
                  maxLength={500}
                  autoComplete="off"
                  spellCheck={false}
                  value={draft.repository_url}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      repository_url: event.target.value,
                    }))
                  }
                  placeholder="https://github.com/owner/repository"
                />
                <p className="text-xs text-muted-foreground">
                  Use the HTTPS github.com owner/repository URL. The backend
                  canonicalizes accepted links.
                </p>
              </div>
            </>
          )}

          {mutation.error && (
            <p role="alert" className="text-sm text-destructive">
              {repositoryWriteError(mutation.error)}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
