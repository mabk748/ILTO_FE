import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useBeforeUnload, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { ApiError } from "@/lib/api/errors.ts";
import type { FocusSession } from "@/lib/api/project-focus.ts";
import type { Task } from "@/lib/api/types.ts";
import { focusError, uncertainFocusOutcome } from "../focus-data.ts";
import { useFocusNoteAction, type FocusIntent } from "../focus-actions.ts";

const NOTE_LIMIT = 1000;
const eligible = (task: Task) =>
  ["backlog", "todo", "in_progress"].includes(task.status);

export type FocusNoteDraft = {
  sessionId: string;
  value: string;
  baseNote: string;
  expectedUpdatedAt: string;
  conflicted: boolean;
};

type PendingNavigation =
  | { kind: "link"; href: string }
  | { kind: "history"; href: string; delta: number };

function currentHref() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

/**
 * BrowserRouter is intentionally retained by the app. React Router's
 * useBlocker requires a data router, so this scoped guard intercepts internal
 * links and restores browser history while the note editor is dirty.
 */
function useFocusNavigationGuard(dirty: boolean) {
  const navigate = useNavigate();
  const location = useLocation();
  const [pending, setPending] = useState<PendingNavigation | null>(null);
  const dirtyRef = useRef(dirty);
  const locationRef = useRef(currentHref());
  const historyIndexRef = useRef<number | null>(
    typeof window.history.state?.idx === "number"
      ? window.history.state.idx
      : null,
  );
  const restoringRef = useRef(false);
  const allowRef = useRef(false);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    locationRef.current = `${location.pathname}${location.search}${location.hash}`;
    if (typeof window.history.state?.idx === "number") {
      historyIndexRef.current = window.history.state.idx;
    }
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    if (!dirty) return;
    const onClick = (event: MouseEvent) => {
      if (
        allowRef.current ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const target = event.target as Element | null;
      const anchor = target?.closest("a[href]");
      if (!anchor || anchor.getAttribute("target") === "_blank") return;
      const href = new URL(
        anchor.getAttribute("href") ?? "",
        window.location.href,
      );
      if (href.origin !== window.location.origin) return;
      const next = `${href.pathname}${href.search}${href.hash}`;
      if (next === locationRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      setPending({ kind: "link", href: next });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [dirty]);

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const nextHref = currentHref();
      if (restoringRef.current) {
        restoringRef.current = false;
        if (typeof event.state?.idx === "number")
          historyIndexRef.current = event.state.idx;
        return;
      }
      if (allowRef.current) {
        allowRef.current = false;
        if (typeof event.state?.idx === "number")
          historyIndexRef.current = event.state.idx;
        return;
      }
      if (!dirtyRef.current) {
        if (typeof event.state?.idx === "number")
          historyIndexRef.current = event.state.idx;
        return;
      }
      const currentIndex = historyIndexRef.current;
      const nextIndex = event.state?.idx;
      if (typeof currentIndex !== "number" || typeof nextIndex !== "number") {
        setPending({ kind: "history", href: nextHref, delta: 0 });
        return;
      }
      const delta = nextIndex - currentIndex;
      if (delta === 0) return;
      restoringRef.current = true;
      // Restore synchronously before the route can unmount this editor. The
      // synthetic popstate lets BrowserRouter reconcile back to the current
      // location without a second asynchronous history traversal.
      const restoredState = {
        ...(window.history.state ?? {}),
        idx: currentIndex,
      };
      window.history.pushState(restoredState, "", locationRef.current);
      window.dispatchEvent(
        new PopStateEvent("popstate", { state: restoredState }),
      );
      setPending({ kind: "history", href: nextHref, delta });
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const discard = () => {
    if (!pending) return;
    const next = pending;
    setPending(null);
    if (next.kind === "link") {
      allowRef.current = true;
      navigate(next.href);
      allowRef.current = false;
    } else if (next.delta !== 0) {
      allowRef.current = true;
      window.history.go(next.delta);
    }
  };

  return { pending, discard, stay: () => setPending(null) };
}

export default function FocusSessionControls({
  session,
  task,
  tasks,
  preferredTaskId,
  draft,
  setDraft,
  disabled,
  onAction,
  onChoose,
}: {
  session: FocusSession;
  task: Task;
  tasks: Task[];
  preferredTaskId?: string;
  draft: FocusNoteDraft | null;
  setDraft: Dispatch<SetStateAction<FocusNoteDraft | null>>;
  disabled: boolean;
  onAction: (intent: FocusIntent) => void;
  onChoose: () => void;
}) {
  const serverNote = session.resume_note ?? "";
  const [switching, setSwitching] = useState(false);
  const [target, setTarget] = useState("");
  const [noteMessage, setNoteMessage] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const noteMutation = useFocusNoteAction();
  const activeDraft = draft?.sessionId === session.id ? draft : null;
  const dirty = Boolean(
    activeDraft && activeDraft.value !== activeDraft.baseNote,
  );
  const hasDirtyDraft = Boolean(draft && draft.value !== draft.baseNote);
  const foreignDraft = hasDirtyDraft && !activeDraft;
  const noteConflict = Boolean(activeDraft?.conflicted);
  const note = activeDraft?.value ?? serverNote;
  const noteId = `focus-resume-note-${session.id}`;
  const navigation = useFocusNavigationGuard(hasDirtyDraft);

  const beforeUnload = useCallback(
    (event: BeforeUnloadEvent) => {
      if (!hasDirtyDraft) return;
      event.preventDefault();
      event.returnValue = "";
    },
    [hasDirtyDraft],
  );
  useBeforeUnload(beforeUnload, { capture: true });

  const updateNote = (value: string) => {
    if (foreignDraft) return;
    setNoteMessage(null);
    setNoteError(null);
    setDraft((previous) => {
      const previousDraft =
        previous?.sessionId === session.id ? previous : null;
      const baseNote = previousDraft?.baseNote ?? serverNote;
      if (value === baseNote) return null;
      return {
        sessionId: session.id,
        value,
        baseNote,
        expectedUpdatedAt:
          previousDraft?.expectedUpdatedAt ?? session.updated_at,
        conflicted: previousDraft?.conflicted ?? false,
      };
    });
  };

  const saveNote = async () => {
    if (!activeDraft || !dirty || noteMutation.isPending || disabled) return;
    const submittedSessionId = session.id;
    const submittedVersion = noteConflict
      ? session.updated_at
      : activeDraft.expectedUpdatedAt;
    const submittedValue = activeDraft.value;
    if (noteConflict) {
      setDraft((previous) =>
        previous?.sessionId === submittedSessionId
          ? {
              ...previous,
              expectedUpdatedAt: submittedVersion,
              conflicted: false,
            }
          : previous,
      );
    }
    setNoteMessage(null);
    setNoteError(null);
    try {
      const result = await noteMutation.mutateAsync({
        sessionId: submittedSessionId,
        note: submittedValue === "" ? null : submittedValue,
        expectedUpdatedAt: submittedVersion,
      });
      if (result.id !== submittedSessionId) return;
      setDraft((previous) =>
        previous?.sessionId === submittedSessionId &&
        previous.expectedUpdatedAt === submittedVersion &&
        previous.value === submittedValue
          ? null
          : previous,
      );
      setNoteMessage("Resume note saved by the server.");
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setDraft((previous) =>
          previous?.sessionId === submittedSessionId
            ? { ...previous, conflicted: true }
            : previous,
        );
        setNoteError(
          "The FocusSession changed elsewhere. Review the current session, then explicitly retry saving this note.",
        );
      } else if (uncertainFocusOutcome(error)) {
        setDraft((previous) =>
          previous?.sessionId === submittedSessionId
            ? { ...previous, conflicted: true }
            : previous,
        );
        setNoteError(
          "The save outcome is unknown. Review the refreshed session before explicitly retrying.",
        );
      } else {
        setNoteError(focusError(error));
      }
    }
  };

  const finish = (verify: boolean) =>
    onAction({ action: "finish", session, verify });

  const lifecycleNoteUpdate =
    activeDraft && dirty
      ? {
          sessionId: activeDraft.sessionId,
          note: activeDraft.value === "" ? null : activeDraft.value,
          expectedUpdatedAt: activeDraft.expectedUpdatedAt,
        }
      : undefined;

  return (
    <section
      aria-label="Focus session controls"
      className="space-y-3 border-t pt-4"
    >
      <p className="text-sm font-semibold">
        Focus status: {session.status}. Task status is managed separately.
      </p>
      {foreignDraft && (
        <div className="space-y-2 rounded border p-3 text-sm" role="status">
          <p>
            An unsaved note draft is retained for a previous Focus session. It
            is not attached to this session and will not be sent with its
            actions.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setDraft((previous) =>
                previous?.sessionId === session.id ? previous : null,
              )
            }
          >
            Discard retained draft
          </Button>
        </div>
      )}
      {session.resume_note && (
        <div>
          <h4 className="text-sm font-medium">Saved stopping context</h4>
          <p className="whitespace-pre-wrap break-words text-sm">
            {session.resume_note}
          </p>
        </div>
      )}
      <div className="space-y-2">
        <label className="block space-y-1 text-sm" htmlFor={noteId}>
          <span>Resume note</span>
          <textarea
            id={noteId}
            className="w-full rounded border bg-background p-2"
            rows={3}
            maxLength={NOTE_LIMIT}
            value={note}
            disabled={disabled || noteMutation.isPending || foreignDraft}
            onChange={(event) => updateNote(event.target.value)}
            aria-describedby={`${noteId}-help`}
          />
        </label>
        <div
          id={`${noteId}-help`}
          className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"
        >
          <span>
            {foreignDraft
              ? "The retained draft belongs to another session. Resolve or discard it before editing this note."
              : dirty
                ? noteConflict
                  ? "Review the latest session before retrying this draft."
                  : "Unsaved changes. Save explicitly or discard before leaving."
                : "Saved context for returning to this FocusSession."}
          </span>
          <span aria-live="polite">
            {note.length}/{NOTE_LIMIT}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            disabled={disabled || !dirty || noteMutation.isPending}
            onClick={() => void saveNote()}
          >
            {noteMutation.isPending
              ? "Saving note…"
              : noteConflict
                ? "Retry Save Note"
                : "Save Note"}
          </Button>
          {dirty && (
            <Button
              size="sm"
              variant="ghost"
              disabled={disabled || noteMutation.isPending}
              onClick={() => {
                setDraft(null);
                setNoteError(null);
                setNoteMessage(null);
              }}
            >
              Discard unsaved note
            </Button>
          )}
          {noteMessage && (
            <span role="status" className="text-xs">
              {noteMessage}
            </span>
          )}
        </div>
        {noteError && (
          <p role="alert" className="text-sm">
            {noteError}
          </p>
        )}
      </div>
      {session.status === "paused" ? (
        <>
          <p className="text-sm">
            Paused at{" "}
            {session.paused_at
              ? new Date(session.paused_at).toLocaleString()
              : "an unavailable time"}
            .{" "}
            {session.resume_note
              ? "Your saved context is above."
              : "No resume note saved."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={disabled || dirty || !eligible(task)}
              onClick={() => onAction({ action: "resume", session })}
            >
              Resume
            </Button>
            <Button variant="outline" disabled={dirty} onClick={onChoose}>
              Choose Another
            </Button>
            <Button
              variant="outline"
              disabled={disabled || dirty}
              onClick={() => finish(false)}
            >
              Finish Session
            </Button>
            <Button
              variant="outline"
              disabled={disabled || dirty}
              onClick={() => finish(true)}
            >
              Finish &amp; Verify
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={disabled || noteConflict}
            onClick={() =>
              onAction({
                action: "pause",
                session,
                ...(lifecycleNoteUpdate
                  ? { noteUpdate: lifecycleNoteUpdate }
                  : {}),
              })
            }
          >
            Pause
          </Button>
          <Button
            variant="outline"
            disabled={disabled || dirty}
            onClick={() => finish(false)}
          >
            Finish Session
          </Button>
          <Button
            variant="outline"
            disabled={disabled || dirty}
            onClick={() => finish(true)}
          >
            Finish &amp; Verify
          </Button>
          {tasks.length > 0 && (
            <Button
              variant="outline"
              disabled={disabled || noteConflict}
              onClick={() => {
                setTarget(
                  tasks.some((item) => item.id === preferredTaskId)
                    ? preferredTaskId!
                    : "",
                );
                setSwitching(true);
              }}
            >
              Switch Task
            </Button>
          )}
        </div>
      )}
      <Dialog
        open={switching}
        onOpenChange={(open) => {
          if (!disabled) setSwitching(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch Task</DialogTitle>
            <DialogDescription>
              This explicitly pauses the currently active session and starts the
              chosen Task. An edited note is saved with its original session
              version; otherwise the saved note is preserved. Other tabs can
              change the active work, so state is checked again before sending.
            </DialogDescription>
          </DialogHeader>
          <label className="space-y-1 text-sm">
            <span>Task to start</span>
            <select
              className="w-full rounded border bg-background p-2"
              value={target}
              disabled={disabled}
              onChange={(event) => setTarget(event.target.value)}
            >
              <option value="">Choose a task</option>
              {tasks.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          <p className="whitespace-pre-wrap break-words text-sm">
            {lifecycleNoteUpdate
              ? lifecycleNoteUpdate.note === null
                ? "Note update: clear the saved note"
                : `Note update: ${lifecycleNoteUpdate.note}`
              : "Saved note: preserve without modification"}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              disabled={disabled}
              onClick={() => setSwitching(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={disabled || !tasks.some((item) => item.id === target)}
              onClick={() => {
                setSwitching(false);
                onAction({
                  action: "switch",
                  taskId: target,
                  key: crypto.randomUUID(),
                  expectedActiveId: session.id,
                  ...(lifecycleNoteUpdate
                    ? { noteUpdate: lifecycleNoteUpdate }
                    : {}),
                });
              }}
            >
              Confirm switch
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={navigation.pending !== null}
        onOpenChange={(open) => {
          if (!open) navigation.stay();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Focus note</DialogTitle>
            <DialogDescription>
              This note has not been saved. Stay and continue editing, or
              discard the changes before leaving this Focus workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={navigation.stay}>
              Stay and continue editing
            </Button>
            <Button variant="destructive" onClick={navigation.discard}>
              Discard changes and leave
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
