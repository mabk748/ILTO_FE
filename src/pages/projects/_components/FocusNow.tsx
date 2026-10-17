import { useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import SessionControls, {
  type FocusNoteDraft,
} from "./FocusSessionControls.tsx";
import LoadError from "@/components/LoadError.tsx";
import type { Project, Sprint, Task } from "@/lib/api/types.ts";
import { ApiError } from "@/lib/api/errors.ts";
import {
  focusError,
  refreshFocus,
  uncertainFocusOutcome,
  useFocusData,
} from "../focus-data.ts";
import { useFocusAction, type FocusIntent } from "../focus-actions.ts";
import { FocusRepositories, FocusTaskDetails } from "./FocusTaskDetails.tsx";
import VerifyTaskDialog from "./VerifyTaskDialog.tsx";

const eligible = (task: Task) =>
  ["backlog", "todo", "in_progress"].includes(task.status);

export default function FocusNow({
  project,
  sprints,
}: {
  project: Project;
  sprints: Sprint[];
}) {
  const queries = useFocusData(project.id);
  const client = useQueryClient();
  const [params, setParams] = useSearchParams();
  const picker = useRef<HTMLSelectElement>(null);
  const mutation = useFocusAction();
  const inFlight = useRef(false);
  const [recovery, setRecovery] = useState<FocusIntent | null>(null);
  const [focusDraft, setFocusDraft] = useState<FocusNoteDraft | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [finishedTask, setFinishedTask] = useState<Task | null>(null);
  const [verify, setVerify] = useState(false);
  const [pendingChoice, setPendingChoice] = useState<{
    id: string;
    sessionId?: string;
  } | null>(null);
  const noteDirty = Boolean(
    focusDraft && focusDraft.value !== focusDraft.baseNote,
  );

  const run = async (intent: FocusIntent, replay = false) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setFailure(null);
    setNotice(null);
    try {
      const result = await mutation.mutateAsync({ intent, replay });
      if (result.project_id !== project.id)
        throw new ApiError(
          "Unexpected Project in Focus response.",
          "invalid_response",
        );
      const submittedNote =
        intent.action === "pause" || intent.action === "switch"
          ? intent.noteUpdate
          : undefined;
      if (submittedNote) {
        setFocusDraft((previous) =>
          previous?.sessionId === submittedNote.sessionId &&
          previous.expectedUpdatedAt === submittedNote.expectedUpdatedAt &&
          previous.value === (submittedNote.note ?? "")
            ? null
            : previous,
        );
      }
      if (result.status !== "paused" && params.get("session") === result.id) {
        const next = new URLSearchParams(params);
        next.delete("session");
        setParams(next, { replace: true });
      }
      setRecovery(null);
      if (intent.action === "finish") {
        const task = queries.tasks.data?.find(
          (item) =>
            item.id === result.task_id && item.project_id === project.id,
        );
        setFinishedTask(task ?? null);
        setVerify(Boolean(intent.verify && task));
        setNotice(
          "Session finished. Task status has not been changed by this action.",
        );
      } else if (intent.action === "pause") {
        setNotice(
          intent.noteUpdate
            ? result.resume_note === intent.noteUpdate.note
              ? "Session paused. Resume note update confirmed by the server."
              : "Session is paused, but the server returned a different note. Refresh and review the session before continuing."
            : "Session paused. The existing resume note was preserved.",
        );
      } else {
        setNotice(`Server confirms the session is ${result.status}.`);
      }
    } catch (error) {
      const lifecycleConflict =
        (intent.action === "switch" || intent.action === "pause") &&
        ((error instanceof ApiError && error.status === 409) ||
          (error instanceof Error &&
            /(?:active|focus) session changed|session is no longer active/i.test(
              error.message,
            )));
      const conflictingNoteUpdate =
        intent.action === "switch" || intent.action === "pause"
          ? intent.noteUpdate
          : undefined;
      if (lifecycleConflict && conflictingNoteUpdate) {
        setFocusDraft((previous) =>
          previous?.sessionId === conflictingNoteUpdate.sessionId
            ? { ...previous, conflicted: true }
            : previous,
        );
      }
      if (lifecycleConflict && intent.action === "switch") {
        setFailure(
          "The active session or its note changed in another tab. Review the current Focus state before switching.",
        );
      } else setFailure(focusError(error));
      setRecovery(replay || uncertainFocusOutcome(error) ? intent : null);
    } finally {
      inFlight.current = false;
    }
  };

  const error =
    queries.project.error ?? queries.current.error ?? queries.tasks.error;
  const loading =
    queries.project.isPending ||
    queries.current.isPending ||
    queries.tasks.isPending;
  const refreshing =
    queries.project.isFetching ||
    queries.current.isFetching ||
    queries.tasks.isFetching;
  const focus = queries.project.data;
  const tasks = (queries.tasks.data ?? []).filter(
    (task) => task.project_id === project.id,
  );
  const taskId = params.get("task");
  const explicitTask = tasks.find((task) => task.id === taskId);
  const active = focus?.active_session;
  const elsewhere = focus?.active_session_elsewhere;
  const paused =
    focus?.paused_sessions.find(
      (item) =>
        item.task.id === taskId &&
        (!params.has("session") || item.session.id === params.get("session")),
    ) ?? (taskId === null ? focus?.paused_sessions[0] : undefined);
  const session = active?.session ?? paused?.session;
  const displayedId =
    active?.task.id ??
    (taskId !== null
      ? taskId
      : (paused?.task.id ?? focus?.recommended_task?.id));
  const task = tasks.find((item) => item.id === displayedId);
  const consistent =
    (queries.current.data?.id ?? null) ===
    (active?.session.id ?? elsewhere?.session.id ?? null);
  const staleSessionSelection = params.has("session") && !active && !paused;
  const blocked =
    mutation.isPending ||
    refreshing ||
    Boolean(error) ||
    Boolean(recovery) ||
    staleSessionSelection ||
    !consistent;
  const invalidSelection = taskId !== null && !explicitTask;
  const applyChoose = (id: string, sessionId?: string) => {
    const next = new URLSearchParams(params);
    next.delete("session");
    if (sessionId) next.set("session", sessionId);
    if (id) next.set("task", id);
    else next.delete("task");
    setParams(next);
  };
  const choose = (id: string, sessionId?: string) => {
    if (noteDirty && sessionId !== focusDraft?.sessionId) {
      setPendingChoice({ id, sessionId });
      return;
    }
    applyChoose(id, sessionId);
  };

  return (
    <section aria-labelledby="now-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="now-heading" className="text-xl font-semibold">
          NOW
        </h2>
        <Button
          size="sm"
          variant="outline"
          disabled={mutation.isPending || refreshing}
          onClick={() => void refreshFocus(client)}
        >
          Refresh Focus
        </Button>
      </div>
      {notice && (
        <p role="status" className="rounded border p-3 text-sm">
          {notice}
        </p>
      )}
      {failure && (
        <p role="alert" className="rounded border p-3 text-sm">
          {failure}
        </p>
      )}
      {recovery && (
        <div className="space-y-2 rounded border p-3 text-sm">
          <p>
            The original operation is unresolved. Retry uses the same session or
            idempotency key; no operation is queued offline. A missing current
            session alone does not prove it finished.
          </p>
          <Button
            size="sm"
            variant="outline"
            disabled={mutation.isPending || refreshing || Boolean(error)}
            onClick={() => void run(recovery, true)}
          >
            Retry same operation
          </Button>
        </div>
      )}
      {error && (
        <LoadError
          error={error}
          title="Focus data unavailable"
          onRetry={() => void refreshFocus(client)}
        />
      )}
      {loading || !focus ? (
        !error && <p role="status">Loading Focus context…</p>
      ) : (
        <>
          {!consistent && (
            <p role="alert">
              Focus state changed while loading. Refresh Focus before acting.
            </p>
          )}
          <label className="block max-w-xl space-y-1 text-sm">
            <span>Selected task</span>
            <select
              ref={picker}
              className="w-full min-w-0 rounded border bg-background p-2"
              value={explicitTask?.id ?? ""}
              disabled={mutation.isPending || Boolean(recovery)}
              onChange={(event) => choose(event.target.value)}
            >
              <option value="">Use current work or recommendation</option>
              {tasks.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          {invalidSelection && (
            <p role="alert">
              Selected task unavailable. It may have been deleted or may belong
              to another Project. Choose a task from this Project.
            </p>
          )}
          {staleSessionSelection && (
            <div className="space-y-2 rounded border p-3 text-sm">
              <p role="alert">
                The selected paused session is no longer available. Its absence
                does not confirm it finished.
              </p>
              <Button
                variant="outline"
                disabled={mutation.isPending || Boolean(recovery)}
                onClick={() => choose(taskId ?? "")}
              >
                Clear stale session selection
              </Button>
            </div>
          )}
          {elsewhere && (
            <div className="space-y-2 rounded border p-4">
              <h3 className="font-semibold">Another Project has active work</h3>
              <p className="text-sm">
                {elsewhere.task.title} — {elsewhere.project.name}. No session
                here will start automatically.
              </p>
              <Link
                className="text-sm underline"
                to={`/projects/${encodeURIComponent(elsewhere.project.id)}/now?${new URLSearchParams({ task: elsewhere.task.id })}`}
              >
                Go to active Project: {elsewhere.project.name}
              </Link>
            </div>
          )}
          {active && explicitTask && explicitTask.id !== active.task.id && (
            <p className="text-sm">
              Your URL selects {explicitTask.title}. The active session still
              belongs to {active.task.title}; use Switch Task to change
              execution.
            </p>
          )}
          {session && !task && (
            <p role="alert">
              The session's Task is unavailable. Refresh Focus before
              continuing.
            </p>
          )}
          {task && (active || !invalidSelection) && (
            <div className="max-w-3xl space-y-4 rounded-lg border bg-card p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-wider">
                {session
                  ? `${session.status} Focus session`
                  : taskId !== null
                    ? "Selected task"
                    : "Recommended task"}
              </p>
              {!session && taskId === null && focus.recommendation_reason && (
                <p className="text-sm text-muted-foreground">
                  {focus.recommendation_reason}
                </p>
              )}
              <FocusTaskDetails
                task={task}
                project={project}
                sprints={sprints}
              />
              {session ? (
                <SessionControls
                  key={session.id}
                  session={session}
                  task={task}
                  tasks={tasks.filter(
                    (item) =>
                      eligible(item) &&
                      item.id !== task.id &&
                      !focus.paused_sessions.some(
                        (paused) => paused.task.id === item.id,
                      ),
                  )}
                  preferredTaskId={explicitTask?.id}
                  draft={focusDraft}
                  setDraft={setFocusDraft}
                  disabled={blocked || Boolean(elsewhere)}
                  onAction={(intent) => void run(intent)}
                  onChoose={() => picker.current?.focus()}
                />
              ) : (
                <div className="flex flex-wrap gap-2 border-t pt-4">
                  {!elsewhere && eligible(task) && (
                    <Button
                      disabled={blocked}
                      onClick={() =>
                        void run({
                          action: "start",
                          taskId: task.id,
                          key: crypto.randomUUID(),
                          expectedActiveId: null,
                        })
                      }
                    >
                      Start Task
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => picker.current?.focus()}
                  >
                    Choose Another
                  </Button>
                  <Button asChild variant="outline">
                    <Link
                      to={`/projects/${encodeURIComponent(project.id)}/explore?${new URLSearchParams({ view: "board", task: task.id })}`}
                    >
                      View Details
                    </Link>
                  </Button>
                  {!eligible(task) && (
                    <p className="w-full text-sm text-muted-foreground">
                      Tasks in review or done cannot start a FocusSession.
                      Manage their status in EXPLORE.
                    </p>
                  )}
                </div>
              )}
              {session && <FocusRepositories projectId={project.id} />}
            </div>
          )}
          {!task &&
            !invalidSelection &&
            focus.recommended_task &&
            !session &&
            !elsewhere && (
              <p role="alert">
                The recommended Task is unavailable in the current Task data.
                Refresh Focus before continuing.
              </p>
            )}
          {!task &&
            !invalidSelection &&
            !focus.recommended_task &&
            !session &&
            !elsewhere && (
              <p className="rounded border border-dashed p-5 text-sm">
                {focus.empty_state === "empty_project"
                  ? "No tasks yet. Create a task in EXPLORE to get started."
                  : tasks.length > 0 &&
                      tasks.every((item) => item.status === "done")
                    ? "All Tasks are done. There is no next recommendation."
                    : tasks.length > 0 &&
                        tasks.every((item) => item.status === "review")
                      ? "All Tasks are awaiting review. Review them in EXPLORE; no Task is eligible to start."
                      : "No eligible Task recommendation. Choose existing work or review Tasks in EXPLORE."}
              </p>
            )}
          {focus.paused_sessions.length > 0 && (
            <section aria-label="Paused work" className="space-y-2">
              <h3 className="font-medium">Paused work</h3>
              <ul className="space-y-2">
                {focus.paused_sessions.map((item) => (
                  <li
                    key={item.session.id}
                    className="rounded border p-3 text-sm"
                  >
                    <button
                      className="text-left underline"
                      onClick={() => choose(item.task.id, item.session.id)}
                    >
                      {item.task.title}
                    </button>
                    <p className="whitespace-pre-wrap break-words text-muted-foreground">
                      {item.session.resume_note || "No resume note saved."}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {finishedTask && (
            <section
              aria-label="Finished session follow-up"
              className="space-y-2 rounded border p-4"
            >
              <p className="text-sm">
                Session finish confirmed for {finishedTask.title}. Task
                completion is a separate manual acknowledgement.
              </p>
              <Button
                variant="outline"
                disabled={mutation.isPending}
                onClick={() => setVerify(true)}
              >
                Verify Task completion
              </Button>
            </section>
          )}
        </>
      )}
      {verify && finishedTask && (
        <VerifyTaskDialog
          task={finishedTask}
          onClose={() => setVerify(false)}
          onCompleted={(message) => {
            setVerify(false);
            setFinishedTask(null);
            setNotice(message);
            choose("");
          }}
        />
      )}
      <Dialog
        open={pendingChoice !== null}
        onOpenChange={(open) => {
          if (!open) setPendingChoice(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Focus note</DialogTitle>
            <DialogDescription>
              This Task selection would leave the current Focus note draft
              behind. Stay and continue editing, or discard the draft before
              choosing another Task.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setPendingChoice(null)}>
              Stay and continue editing
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const choice = pendingChoice;
                setPendingChoice(null);
                setFocusDraft(null);
                if (choice) applyChoose(choice.id, choice.sessionId);
              }}
            >
              Discard changes and choose
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
