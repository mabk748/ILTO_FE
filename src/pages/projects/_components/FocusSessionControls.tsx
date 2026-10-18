import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useBeforeUnload, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRightLeft,
  CircleDot,
  FileClock,
  Pause,
  Play,
  Save,
  SquareCheckBig,
} from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
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
      className="space-y-5 border-t border-border/60 pt-5"
    >
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex size-3" aria-hidden="true">
            {session.status === "active" && (
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
            )}
            <span
              className={`relative inline-flex size-3 rounded-full ${session.status === "active" ? "bg-primary" : "bg-warning"}`}
            />
          </span>
          <Badge variant={session.status === "active" ? "default" : "warning"}>
            {session.status} Focus
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Focus status: {session.status}. Task status is managed separately.
        </p>
      </header>
      {foreignDraft && (
        <div
          className="space-y-3 rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm"
          role="status"
        >
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
        <div className="rounded-xl border border-info/20 bg-info/5 p-4">
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <FileClock className="size-4 text-info" aria-hidden="true" />
            Saved stopping context
          </h4>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
            {session.resume_note}
          </p>
        </div>
      )}
      <div className="space-y-3 rounded-xl border border-border/70 bg-canvas/35 p-4">
        <label className="block space-y-1 text-sm" htmlFor={noteId}>
          <span className="font-semibold">Resume note</span>
          <textarea
            id={noteId}
            className="min-h-28 w-full resize-y rounded-lg border bg-background/65 p-3 leading-6"
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
            <Save aria-hidden="true" />
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
            <span role="status" className="text-xs text-success">
              {noteMessage}
            </span>
          )}
        </div>
        {noteError && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm"
          >
            {noteError}
          </p>
        )}
      </div>
      {session.status === "paused" ? (
        <section
          aria-label="Execution controls"
          className="space-y-3 rounded-xl bg-warning/5 p-4"
        >
          <div>
            <h4 className="flex items-center gap-2 text-sm font-semibold">
              <CircleDot className="size-4 text-warning" aria-hidden="true" />
              Paused execution
            </h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Paused at{" "}
              {session.paused_at
                ? new Date(session.paused_at).toLocaleString()
                : "an unavailable time"}
              .{" "}
              {session.resume_note
                ? "Your saved context is above."
                : "No resume note saved."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              className="w-full sm:w-auto"
              disabled={disabled || dirty || !eligible(task)}
              onClick={() => onAction({ action: "resume", session })}
            >
              <Play aria-hidden="true" />
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
              <SquareCheckBig aria-hidden="true" />
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
        </section>
      ) : (
        <section
          aria-label="Execution controls"
          className="space-y-3 rounded-xl bg-primary/[0.055] p-4"
        >
          <div>
            <h4 className="flex items-center gap-2 text-sm font-semibold">
              <CircleDot className="size-4 text-primary" aria-hidden="true" />
              Active execution
            </h4>
            <p className="mt-1 text-xs text-muted-foreground">
              Lifecycle actions affect this FocusSession only. Task completion
              remains a separate manual step.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              className="w-full sm:w-auto"
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
              <Pause aria-hidden="true" />
              Pause
            </Button>
            <Button
              variant="outline"
              disabled={disabled || dirty}
              onClick={() => finish(false)}
            >
              <SquareCheckBig aria-hidden="true" />
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
                variant="ghost"
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
                <ArrowRightLeft aria-hidden="true" />
                Switch Task
              </Button>
            )}
          </div>
        </section>
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
